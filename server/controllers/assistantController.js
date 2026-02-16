
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
        { role: "system", content: "You are an expert concise summarizer. Output a summary of this call in 20 words or less. Do not include filler words like 'The caller called to'. Just state the outcome." },
        { role: "user", content: "Transcript: {{transcript}}" }
    ],
    timeoutSeconds: 10,
    enabled: true
};

export const provision = async (req, res) => {
    try {
        const { userId, companyName, industry, userPhone } = req.body;
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
                    user_phone_number: userPhone || null
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

        // CHUNK 1 — Create Vapi assistant FIRST
        let assistantId = profile.vapi_assistant_id;

        if (!assistantId) {
            const systemPrompt = generateSystemPrompt({ profile, greeting, instructions, knowledge });
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
        let purchased = null;
        if (profile.vapi_phone_number && profile.twilio_phone_sid) {
            purchased = { phoneNumber: profile.vapi_phone_number, sid: profile.twilio_phone_sid };
        } else {
            console.log("📞 Searching for SMS-capable numbers on Twilio...");
            const available = await twilioClient.availablePhoneNumbers('US').local.list({ limit: 1, smsEnabled: true, voiceEnabled: true });

            if (!available.length) throw new Error("No SMS-capable numbers available");

            purchased = await twilioClient.incomingPhoneNumbers.create({
                phoneNumber: available[0].phoneNumber,
                friendlyName: `${profile.company_name} - JunoDesk`
            });
            console.log(`✅ Purchased number: ${purchased.phoneNumber} (SID: ${purchased.sid})`);
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
        const { userId, languages, voiceId: reqVoiceId, voice_id: reqVoiceIdUnderscore } = req.body;
        const explicitVoiceId = reqVoiceId || reqVoiceIdUnderscore;

        if (!userId) return res.status(400).json({ error: "Missing userId" });

        const { profile, greeting, endingMessage, instructions, commonWords, knowledge, websiteContent, voiceId, calendarContext, timezone } = await getContextForUser(userId);

        if (!profile.vapi_assistant_id) return res.status(400).json({ error: "No assistant found. Provision first." });

        let systemPrompt = generateSystemPrompt({ profile, greeting, endingMessage, instructions, commonWords, knowledge, websiteContent, calendarContext, timezone });

        if (languages && Array.isArray(languages) && languages.length > 0) {
            systemPrompt += `\n\nIMPORTANT LANGUAGE INSTRUCTION: You are fluent in: ${languages.join(", ")}. Switch language if user speaks it.`;
        }

        const activeVoiceId = explicitVoiceId || voiceId || "OYTbf65OHHFELVut7v2H";
        if (explicitVoiceId) {
            await supabase.from('business_profiles').update({ voice_id: activeVoiceId }).eq('owner_user_id', userId);
        }

        const updatedPayload = {
            name: profile.assistant_name || `${profile.company_name} Receptionist`,
            serverUrl: `${process.env.SERVER_URL || 'http://localhost:3000'}/api/webhook/vapi`,
            analysisPlan: { summaryPlan: SUMMARY_PLAN },
            hooks: SILENCE_HOOKS,
            voice: {
                provider: "11labs",
                voiceId: activeVoiceId,
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

        const response = await fetch(`${VAPI_BASE_URL}/assistant/${profile.vapi_assistant_id}`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${VAPI_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedPayload)
        });

        if (!response.ok) throw new Error(await response.text());

        res.json({ success: true, vapiResponse: await response.json() });

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