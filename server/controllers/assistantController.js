
import { supabase } from '../config/supabase.js';
import { twilioClient } from '../config/twilio.js';
import { generateSystemPrompt } from '../services/promptService.js';
import { getContextForUser } from '../services/contextService.js';

const VAPI_BASE_URL = 'https://api.vapi.ai';
const VAPI_TOKEN = process.env.VAPI_PRIVATE_KEY;

const SILENCE_HOOKS = [
    {
        on: 'customer.speech.timeout',
        options: { timeoutSeconds: 10, triggerMaxCount: 1, triggerResetMode: 'onUserSpeech' },
        do: [
            { type: 'say', exact: "Looks like I’m not hearing anything—feel free to call back anytime." },
            { type: 'tool', tool: { type: 'endCall' } }
        ],
        name: 'end_on_10s_silence'
    }
];

const SUMMARY_PLAN = {
    messages: [
        { role: "system", content: "You are an expert concise summarizer. Output a summary of this call in 20 words or less. Do not include filler words like 'The caller called to'. Just state the outcome. DO NOT Write timezone just date and time." },
        { role: "user", content: "Transcript: {{transcript}}" }
    ],
    timeoutSeconds: 10,
    enabled: true
};

export const provision = async (req, res) => {
    try {
        const { userId, companyName, industry, userPhone, timezone } = req.body;
        if (!userId) return res.status(400).json({ error: "Missing userId" });

        console.log(`🚀 Starting Provisioning for User: ${userId}`);

        let { data: profile } = await supabase
            .from('business_profiles')
            .select('*')
            .eq('owner_user_id', userId)
            .maybeSingle();

        if (!profile) {
            console.log("⚠️ Profile not found, creating minimal profile...");
            const { data: newProfile, error: createErr } = await supabase
                .from('business_profiles')
                .insert({
                    owner_user_id: userId,
                    company_name: companyName || 'Demo Company',
                    industry: industry || 'Other',
                    user_phone_number: userPhone || null,
                    timezone: timezone || 'America/New_York'
                })
                .select()
                .single();

            if (createErr) throw new Error(`Cannot create profile: ${createErr.message}`);
            profile = newProfile;
            console.log("✅ Created minimal profile for:", userId);
        }

        // Load business context
        const { data: info } = await supabase
            .from('business_info')
            .select('*')
            .eq('owner_user_id', userId);

        const greeting = info?.find(i => i.type === 'greeting')?.content?.text || "Hello, how can I help you?";
        const instructions = info?.filter(i => i.type === 'instruction').map(i => i.content.text) || [];
        const knowledge = info?.filter(i => ['qa', 'fact'].includes(i.type)).map(i => i.content) || [];
        const services = info?.filter(i => i.type === 'services').map(i => i.content) || [];

        // CHUNK 0 — Idempotency guard
        if (profile.vapi_assistant_id && profile.vapi_phone_number && profile.vapi_phone_id) {
            console.log("✅ User fully provisioned. Returning existing data.");
            return res.json({
                success: true,
                assistantId: profile.vapi_assistant_id,
                phoneNumber: profile.vapi_phone_number,
                vapiPhoneId: profile.vapi_phone_id,
                profileId: profile.id
            });
        }

        // --- MOCK MODE: Bypass Twilio & Vapi for Demo/Testing Onboarding
        const MOCK_PROVISIONING = false;
        if (MOCK_PROVISIONING) {
            console.log("⚠️ MOCK PROVISIONING ENABLED: Skipping Twilio and Vapi...");

            const mockAssistantId = "mock_vapi_ast_" + Date.now();
            const mockVapiPhoneId = "mock_vapi_phone_" + Date.now();
            const mockTwilioSid = "mock_twilio_sid_" + Date.now();
            const mockPhoneNumber = "+1555" + Math.floor(1000000 + Math.random() * 9000000); // Fake Number

            await supabase.from('business_profiles').update({
                vapi_assistant_id: mockAssistantId,
                vapi_phone_number: mockPhoneNumber,
                twilio_phone_sid: mockTwilioSid,
                vapi_phone_id: mockVapiPhoneId
            }).eq('owner_user_id', userId);

            return res.json({
                success: true,
                assistantId: mockAssistantId,
                phoneNumber: mockPhoneNumber,
                vapiPhoneId: mockVapiPhoneId,
                profileId: profile.id
            });
        }
        // --- END MOCK MODE ---

        // CHUNK 1 — Create Vapi assistant FIRST
        let assistantId = profile.vapi_assistant_id;

        if (!assistantId) {
            const systemPrompt = generateSystemPrompt({ profile, greeting, instructions, knowledge, services });
            const assistantPayload = {
                name: `${profile.company_name} Receptionist`,
                serverUrl: `${process.env.SERVER_URL || 'http://localhost:3000'}/api/webhook/vapi`,
                analysisPlan: { summaryPlan: SUMMARY_PLAN },
                hooks: SILENCE_HOOKS,
                model: {
                    provider: "openai",
                    model: "gpt-4o",
                    messages: [{ role: "system", content: systemPrompt }],
                    tools: [
                        {
                            type: "function",
                            function: {
                                name: "getCurrentTime",
                                description: "Get the current date and time.",
                                parameters: { type: "object", properties: {} }
                            },
                            server: { url: `${process.env.SERVER_URL || 'http://localhost:3000'}/api/tools/get-current-time` }
                        }
                    ]
                },
                voice: {
                    provider: "11labs",
                    voiceId: profile.voice_id || "OYTbf65OHHFELVut7v2H"
                },
                firstMessage: greeting
            };

            console.log("🤖 Creating Assistant...", assistantPayload.name);
            const assistantRes = await fetch(`${VAPI_BASE_URL}/assistant`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${VAPI_TOKEN}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(assistantPayload)
            });

            if (!assistantRes.ok) {
                const errText = await assistantRes.text();
                throw new Error(`Assistant creation failed: ${errText}`);
            }

            const assistant = await assistantRes.json();
            assistantId = assistant.id;
            console.log("✅ Assistant Created:", assistantId);

            await supabase.from('business_profiles').update({ vapi_assistant_id: assistantId }).eq('owner_user_id', userId);
        }

        // CHUNK 2 — Buy Twilio number
        // CHUNK 2 — Buy Twilio number (with fallback)
        let purchased = null;

        if (profile.vapi_phone_number && profile.twilio_phone_sid) {
            purchased = { phoneNumber: profile.vapi_phone_number, sid: profile.twilio_phone_sid };
        } else {
            try {
                console.log("📞 Searching for SMS-capable numbers on Twilio...");
                // 1. Try to buy a fresh number first (Primary Strategy)
                const available = await twilioClient.availablePhoneNumbers('US').local.list({
                    limit: 1,
                    smsEnabled: true,
                    voiceEnabled: true
                });

                if (!available.length) throw new Error("No numbers found via Twilio API");

                purchased = await twilioClient.incomingPhoneNumbers.create({
                    phoneNumber: available[0].phoneNumber,
                    friendlyName: `${profile.company_name} - JunoDesk`,
                    voiceUrl: 'https://api.vapi.ai/twilio/inbound_call' // Ensure webhook is set immediately
                });
                console.log(`✅ Purchased NEW number: ${purchased.phoneNumber} (SID: ${purchased.sid})`);

            } catch (err) {
                console.warn(`⚠️ Failed to buy NEW number (${err.message}). Attempting to use BACKUP POOL...`);

                // 2. Fallback to Backup Pool (Secondary Strategy)
                const { data: backupNumber, error: backupError } = await supabase
                    .from('backup_numbers')
                    .select('*')
                    .eq('status', 'available')
                    .limit(1)
                    .maybeSingle();

                if (backupError || !backupNumber) {
                    console.error("❌ CRITICAL: Backup pool is empty or unreachable!", backupError);
                    throw new Error("Phone system is currently busy. Please try again in 5 minutes or contact support.");
                }

                // 3. Claim the backup number atomically
                const { error: claimError } = await supabase
                    .from('backup_numbers')
                    .update({
                        status: 'assigned',
                        assigned_user_id: userId
                    })
                    .eq('id', backupNumber.id);

                if (claimError) throw new Error("Failed to claim backup number.");

                // 4. Use the backup number
                purchased = {
                    phoneNumber: backupNumber.phone_number,
                    sid: backupNumber.twilio_sid
                };

                // Optional: Update Twilio Friendly Name asynchronously (fire and forget)
                twilioClient.incomingPhoneNumbers(purchased.sid)
                    .update({ friendlyName: `${profile.company_name} - JunoDesk (Backup)` })
                    .catch(e => console.warn("Failed to rename backup number:", e.message));

                console.log(`✅ Assigned BACKUP number: ${purchased.phoneNumber}`);
            }
        }

        // CHUNK 3 — Import into Vapi
        let vapiPhoneId = profile.vapi_phone_id;
        if (!vapiPhoneId) {
            console.log("📥 Importing number to Vapi...");
            const phoneRes = await fetch(`${VAPI_BASE_URL}/phone-number`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${VAPI_TOKEN}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: "twilio",
                    number: purchased.phoneNumber,
                    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
                    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
                    assistantId: assistantId,
                    name: `${profile.company_name} Line`,
                    smsEnabled: false
                })
            });

            if (!phoneRes.ok) {
                const errText = await phoneRes.text();
                throw new Error(`Vapi phone import failed: ${errText}`);
            }

            const vapiPhone = await phoneRes.json();
            vapiPhoneId = vapiPhone.id;
        }

        // CHUNK 4 — Final DB commit
        await supabase.from('business_profiles').update({
            vapi_phone_number: purchased.phoneNumber,
            twilio_phone_sid: purchased.sid,
            vapi_phone_id: vapiPhoneId
        }).eq('owner_user_id', userId);

        res.json({ success: true, assistantId, phoneNumber: purchased.phoneNumber, vapiPhoneId, profileId: profile.id });

    } catch (err) {
        console.error("❌ Provisioning Failed:", err.message);
        res.status(500).json({ error: err.message });
    }
};

export const syncAssistant = async (req, res) => {
    try {
        const { userId, languages, timezone, voiceId: reqVoiceId, voice_id: reqVoiceIdUnderscore } = req.body;
        const explicitVoiceId = reqVoiceId || reqVoiceIdUnderscore;

        if (!userId) return res.status(400).json({ error: "Missing userId" });

        // Update profile settings if provided
        const updates = {};
        if (explicitVoiceId) updates.voice_id = explicitVoiceId;
        if (timezone) updates.timezone = timezone;

        if (Object.keys(updates).length > 0) {
            await supabase.from('business_profiles').update(updates).eq('owner_user_id', userId);
        }

        // Perform Core Sync
        const vapiResponse = await syncAssistantCore(userId, { languages });

        res.json({ success: true, vapiResponse });

    } catch (err) {
        console.error("❌ Sync Assistant Failed:", err);
        res.status(500).json({ error: `Sync failed: ${err.message}` });
    }
};

export const fixAssistantLink = async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).send("Missing userId");

        const { data: profile } = await supabase.from('business_profiles').select('*').eq('owner_user_id', userId).single();
        if (!profile) return res.status(404).send("Profile not found");

        const assistants = await (await fetch(`${VAPI_BASE_URL}/assistant`, { headers: { 'Authorization': `Bearer ${VAPI_TOKEN}` } })).json();
        const match = assistants.find(a => a.name === `${profile.company_name} Receptionist`) || assistants.find(a => a.name.includes(profile.company_name));

        if (match) {
            await supabase.from('business_profiles').update({ vapi_assistant_id: match.id }).eq('owner_user_id', userId);
            res.json({ success: true, fixed: true, assistantId: match.id });
        } else {
            res.json({ success: false, error: "No matching assistant found" });
        }

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// --- Core Sync Logic (Reusable) ---
export const syncAssistantCore = async (userId, options = {}) => {
    const { languages } = options;

    // 1. Fetch Context
    const { profile, greeting, endingMessage, instructions, commonWords, knowledge, websiteContent, voiceId: ctxVoiceId, calendarContext, timezone, services } = await getContextForUser(userId);
    if (!profile.vapi_assistant_id) throw new Error("No assistant found");

    // 2. Generate Prompt
    let systemPrompt = generateSystemPrompt({ profile, greeting, endingMessage, instructions, commonWords, knowledge, websiteContent, calendarContext, timezone, services });

    if (languages && Array.isArray(languages) && languages.length > 0) {
        systemPrompt += `\n\nIMPORTANT LANGUAGE INSTRUCTION: You are fluent in: ${languages.join(", ")}. Switch language if user speaks it.`;
    }

    if (!profile.google_access_token) {
        systemPrompt += `\n- Calendar is NOT connected. Do NOT offer to book appointments. Take a message instead.`;
    } else {
        systemPrompt += `\n- If caller asks what times are available: collect day + duration, then check 3 standard slots and offer up to 3 available options.`;
    }

    // 3. Construct Payload
    const updatedPayload = {
        name: profile.assistant_name || `${profile.company_name} Receptionist`,
        serverUrl: `${process.env.SERVER_URL || 'http://localhost:3000'}/api/webhook/vapi`,
        analysisPlan: { summaryPlan: SUMMARY_PLAN },
        hooks: SILENCE_HOOKS,
        voice: {
            provider: "11labs",
            voiceId: ctxVoiceId || "OYTbf65OHHFELVut7v2H",
            model: "eleven_turbo_v2"
        },
        model: {
            provider: "openai",
            model: "gpt-4o",
            messages: [{ role: "system", content: systemPrompt }],
            tools: [
                ...(profile.google_access_token ? [
                    {
                        type: 'function',
                        function: {
                            name: 'checkAvailability',
                            description: 'Check availability within a time range. Returns free slots or confirms a specific time.',
                            parameters: {
                                type: 'object',
                                properties: {
                                    queryStartDate: { type: 'string', description: 'Start of the search window (ISO 8601)' },
                                    queryEndDate: { type: 'string', description: 'End of the search window (ISO 8601)' },
                                    durationMinutes: { type: 'number', description: 'Duration of the meeting in minutes (default 30)' }
                                },
                                required: ['queryStartDate', 'queryEndDate']
                            }
                        },
                        server: { url: `${process.env.SERVER_URL || 'http://localhost:3000'}/api/tools/check-availability` }
                    },
                    {
                        type: "function",
                        function: {
                            name: "bookAppointment",
                            description: "Book an appointment.",
                            parameters: {
                                type: "object",
                                properties: {
                                    summary: { type: "string" },
                                    startTime: { type: "string" },
                                    durationMinutes: { type: "number" }
                                },
                                required: ["summary", "startTime"]
                            }
                        },
                        server: { url: `${process.env.SERVER_URL || 'http://localhost:3000'}/api/tools/book-appointment` }
                    }
                ] : []),
                {
                    type: "function",
                    function: {
                        name: "getCurrentTime",
                        description: "Get current date/time.",
                        parameters: { type: "object", properties: {} }
                    },
                    server: { url: `${process.env.SERVER_URL || 'http://localhost:3000'}/api/tools/get-current-time` }
                }
            ]
        },
        firstMessage: greeting
    };

    // 4. Send to Vapi
    const sendUpdate = async (vid) => {
        const payload = { ...updatedPayload, voice: { ...updatedPayload.voice, voiceId: vid } };
        const res = await fetch(`${VAPI_BASE_URL}/assistant/${profile.vapi_assistant_id}`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${VAPI_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const txt = await res.text();
            throw new Error(txt);
        }
        return await res.json();
    };

    try {
        return await sendUpdate(ctxVoiceId || "OYTbf65OHHFELVut7v2H");
    } catch (err) {
        // Self-healing: If voice is bad, retry with default Andrew voice
        if (err.message.includes("Couldn't Find 11labs Voice") || err.message.includes("Bad Request")) {
            console.warn(`⚠️ User ${userId} has invalid voice ${ctxVoiceId}. Retrying with default...`);
            // Update DB to reflect fallback (optional but cleaner)
            await supabase.from('business_profiles').update({ voice_id: "OYTbf65OHHFELVut7v2H" }).eq('owner_user_id', userId);
            return await sendUpdate("OYTbf65OHHFELVut7v2H");
        }
        throw err;
    }
};

export const refreshAllAssistants = async (req, res) => {
    console.log("🔄 Cron: Refreshing all assistants...");
    try {
        const { data: profiles, error } = await supabase
            .from('business_profiles')
            .select('owner_user_id, vapi_assistant_id')
            .not('vapi_assistant_id', 'is', null);

        if (error) throw error;

        let successCount = 0;
        let failCount = 0;
        const errors = [];

        for (const p of profiles) {
            try {
                await syncAssistantCore(p.owner_user_id);
                successCount++;
            } catch (err) {
                console.error(`❌ Failed to refresh user ${p.owner_user_id}:`, err.message);
                failCount++;
                errors.push({ userId: p.owner_user_id, error: err.message });
            }
        }

        console.log(`✅ Cron Finished. Success: ${successCount}, Fail: ${failCount}`);
        res.json({ success: true, successCount, failCount, errors });

    } catch (e) {
        console.error("❌ Cron Failed:", e);
        res.status(500).json({ error: e.message });
    }
};