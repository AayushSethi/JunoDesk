import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';

// Initialize Environment Variables
dotenv.config();

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// --- Supabase Setup ---
// Try to get keys from standard env or VITE_ prefixed ones
// IMPORTANT: For the backend to work with RLS enabled tables, we MUST use the Service Role Key
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

let supabase = null;
if (supabaseUrl && supabaseUrl.startsWith('http')) {
    supabase = createClient(supabaseUrl, supabaseKey);
} else {
    console.log("⚠️  Supabase URL missing or invalid. Server running in offline mode.");
}

// --- Routes ---

// Health Check
app.get('/', (req, res) => {
    res.send('AI Receptionist Brain is Active 🧠');
});

// --- VAPI INTEGRATION ---
const VAPI_BASE_URL = 'https://api.vapi.ai';
const VAPI_TOKEN = process.env.VAPI_PRIVATE_KEY;

export const VOICES = [
    { id: 'JAATlCsz6GCH2vUjFcLg', name: 'Woman 1' },
    { id: 'OYTbf65OHHFELVut7v2H', name: 'Woman 2' },
    { id: 'EST9Ui6982FZPSi7gCHi', name: 'Woman 3' },
    { id: 'fVVjLtJgnQI61CoImgHU', name: 'Man 1' },
    { id: 'EOVAuWqgSZN2Oel78Psj', name: 'Man 2' },
    { id: 'wevlkhfRsG0ND2D2pQHq', name: 'Man 3' }
];

// Helper: Get Authenticated Google Client (Handles Refresh)
async function getAuthenticatedClient(userId, profile) {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `http://localhost:3000/auth/google/callback`
    );

    oauth2Client.setCredentials({
        access_token: profile.google_access_token,
        refresh_token: profile.google_refresh_token,
        expiry_date: new Date(profile.google_token_expires_at).getTime()
    });

    // Listen for refresh and persist
    oauth2Client.on('tokens', async (tokens) => {
        if (tokens.access_token) {
            console.log("🔄 Refreshing verified Access Token for user", userId);
            const updates = {
                google_access_token: tokens.access_token,
                google_token_expires_at: new Date(tokens.expiry_date).toISOString(),
            };
            if (tokens.refresh_token) updates.google_refresh_token = tokens.refresh_token;

            await supabase.from('business_profiles').update(updates).eq('owner_user_id', userId);
        }
    });

    return oauth2Client;
}

// Helper: Fetch Upcoming Events (Next 48h)
async function getCalendarEvents(userId, profile) {
    if (!profile.google_access_token) return null;

    try {
        const auth = await getAuthenticatedClient(userId, profile);
        const calendar = google.calendar({ version: 'v3', auth });

        const now = new Date();
        const next48h = new Date();
        next48h.setHours(next48h.getHours() + 48);

        const res = await calendar.events.list({
            calendarId: profile.google_calendar_id || 'primary',
            timeMin: now.toISOString(),
            timeMax: next48h.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
        });

        const events = res.data.items;
        if (!events || events.length === 0) return "No upcoming events found for the next 48 hours. You are completely free.";

        return events.map((event) => {
            const start = event.start.dateTime ? new Date(event.start.dateTime).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' }) : event.start.date;
            const end = event.end.dateTime ? new Date(event.end.dateTime).toLocaleString('en-US', { hour: 'numeric', minute: '2-digit' }) : event.end.date;
            return `- ${event.summary} (${start} - ${end})`;
        }).join("\n");

    } catch (e) {
        console.error("Error fetching calendar:", e);
        return "Error checking calendar availability.";
    }
}

// Helper: Fetch full context for a user
async function getContextForUser(userId) {
    if (!supabase) throw new Error("Supabase not connected");

    // 1. Get Profile (Company Name, etc)
    const { data: profile } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('owner_user_id', userId)
        .single();

    if (!profile) throw new Error("Profile not found for this user");

    // 2. Get Info (Greetings, Instructions, QA)
    const { data: info } = await supabase
        .from('business_info')
        .select('*')
        .eq('owner_user_id', userId);

    const greeting = info.find(i => i.type === 'greeting')?.content?.text || "Hello, how can I help you?";
    const instructions = info.filter(i => i.type === 'instruction').map(i => i.content.text);
    const knowledge = info.filter(i => ['qa', 'fact'].includes(i.type)).map(i => i.content);
    const personalityItem = info.find(i => i.type === 'personality');
    const voiceId = profile.voice_id || personalityItem?.content?.voiceId;

    // 3. Get Calendar Context (if connected)
    let calendarContext = "";
    if (profile.google_access_token) {
        calendarContext = await getCalendarEvents(userId, profile);
    }

    return { profile, greeting, instructions, knowledge, voiceId, calendarContext };
}

// Helper: structured prompt builder
function generateSystemPrompt({ profile, greeting, instructions, knowledge, calendarContext }) {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
    const yearStr = now.getFullYear();

    let prompt = `SYSTEM CONTEXT

Today is ${dateStr}.
Current local time is ${timeStr}.
Timezone is America/New_York.

All relative dates like “today”, “tomorrow”, or weekdays must be calculated relative to this date.
Never assume a different year.
If a calculated date would fall in a past year or past date, do not book and ask the caller to confirm.

You must never guess the current date or year.

IDENTITY

You are a friendly, professional AI receptionist for ${profile.company_name || 'the business'}.
You represent the business clearly, calmly, and accurately.

Industry: ${profile.industry || 'General'}
Business description: ${profile.business_description || 'Not specified'}

CORE BEHAVIOR

Your primary role is to answer questions, take messages, and schedule appointments.

Be polite, concise, and natural.

Do not sound robotic.

Never invent information.

If you are unsure, ask a clarifying question.

If the caller asks for a human, offer to take a message or arrange a callback.

ABSOLUTE DATE RULES (CRITICAL)

Never use relative dates in confirmations.

Always speak and reason using absolute dates (e.g., “Monday, February 2nd, 2026”).

Never assume a year other than ${yearStr} unless the caller explicitly says a different year.

If a date resolves to the past, stop and ask for confirmation.

Before booking, silently verify the date is today or later.

CALENDAR & TOOL USAGE

1. checkAvailability(startTime, durationMinutes):
   - You MUST use this tool to check if a slot is free before offering it or confirming it.
   - Do not rely on valid/invalid assumptions. Check the actual calendar.

2. bookAppointment(summary, startTime):
   - Only call this AFTER you have checked availability and received a conformation from the user.

CALENDAR CONTEXT (Cached Preview - May be outdated, use tool to verify):
${calendarContext || "No upcoming events cached."}

BOOKING RULES

Confirm the full date and time with the caller before booking.

Example confirmation:

“Just to confirm, you’d like to book Tuesday, February 2nd, 2026 at 1:00 PM, correct?”

Only book after confirmation.

Never book appointments in the past.

SCRIPTING

Greeting:
“${greeting}”

FINAL SAFETY CHECK (MANDATORY)

Before booking:

Date is today or later
Year matches ${yearStr} or later
Timezone is America/New_York
Caller explicitly confirmed the date and time
You have checked availability using the tool and it returned "Available"

If any check fails, do not book and ask for clarification.
`;

    // Append Knowledge Base
    const qaItems = knowledge.filter(k => k.question && k.answer);
    const factItems = knowledge.filter(k => k.text && !k.question && !k.answer);

    if (qaItems.length > 0 || factItems.length > 0) {
        prompt += `\nADDITIONAL KNOWLEDGE BASE:\n`;
        factItems.forEach(f => prompt += `- ${f.text}\n`);
        qaItems.forEach(qa => prompt += `Q: ${qa.question}\nA: ${qa.answer}\n`);
    }

    if (instructions && instructions.length > 0) {
        prompt += `\nSPECIFIC INSTRUCTIONS:\n`;
        instructions.forEach(ins => prompt += `- ${ins}\n`);
    }

    return prompt;
}

// 1. Provision a Number & Assistant
app.post('/api/provision', async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: "Missing userId" });

        console.log(`🚀 Starting Provisioning for User: ${userId}`);

        const { profile, greeting, instructions, knowledge } = await getContextForUser(userId);

        // A. Idempotency Check
        if (profile.vapi_phone_number && profile.vapi_assistant_id) {
            console.log("✅ User already provisioned. Returning existing data.");
            return res.json({
                success: true,
                assistantId: profile.vapi_assistant_id,
                phoneNumber: profile.vapi_phone_number
            });
        }

        // B. Generate System Prompt
        const systemPrompt = generateSystemPrompt({ profile, greeting, instructions, knowledge });

        // C. Create Vapi Assistant
        const assistantPayload = {
            name: `${profile.company_name} Receptionist`,
            model: {
                provider: "openai",
                model: "gpt-4o",
                messages: [
                    {
                        role: "system",
                        content: systemPrompt
                    }
                ]
            },
            voice: {
                provider: "11labs",
                voiceId: "OYTbf65OHHFELVut7v2H" // Default to Woman 2
            },
            firstMessage: greeting
        };

        console.log("🤖 Creating Assistant...", assistantPayload.name);
        const assistantResponse = await fetch(`${VAPI_BASE_URL}/assistant`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${VAPI_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(assistantPayload)
        });

        if (!assistantResponse.ok) {
            const err = await assistantResponse.text();
            throw new Error(`Vapi Assistant Error: ${err}`);
        }
        const assistantData = await assistantResponse.json();
        const assistantId = assistantData.id;
        console.log("✅ Assistant Created:", assistantId);

        // D. Buy Phone Number (Retry Strategy)
        console.log("📞 Buying Phone Number...");

        // Strategy: Try "Any" first, then fallback to specific area codes if that results in a zombie number or failure.
        const strategies = [
            {}, // Try generic "any" first
            { numberDesiredAreaCode: "682" }, // Vapi suggested
            { numberDesiredAreaCode: "681" }, // Vapi suggested
            { numberDesiredAreaCode: "839" }, // Vapi suggested
            { numberDesiredAreaCode: "212" }, // NYC
            { numberDesiredAreaCode: "415" }, // SF
            { numberDesiredAreaCode: "310" }, // LA
            { numberDesiredAreaCode: "312" }, // Chicago
            { numberDesiredAreaCode: "512" }, // Austin
            { numberDesiredAreaCode: "202" }, // DC
            { numberDesiredAreaCode: "917" }, // NYC
            { numberDesiredAreaCode: "718" }, // NYC
            { numberDesiredAreaCode: "323" }, // LA
            { numberDesiredAreaCode: "725" }, // Vegas
            { numberDesiredAreaCode: "469" }  // Dallas
        ];

        let phoneData = null;
        let lastError = null;

        for (const strategy of strategies) {
            try {
                console.log(`Trying Strategy: ${JSON.stringify(strategy)}...`);
                // 1. Buy/Provision the number (WITHOUT assistantId first, to avoid potential bugs)
                const phoneResponse = await fetch(`${VAPI_BASE_URL}/phone-number`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${VAPI_TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        provider: "vapi",
                        ...strategy
                    })
                });

                if (phoneResponse.ok) {
                    phoneData = await phoneResponse.json();

                    // 2. VALIDATE THE NUMBER STRING
                    // If 'number' is missing, we must try to find it.
                    if (!phoneData.number && phoneData.id) {
                        console.log("⚠️ Number missing in initial response. Fetching full list to find number string...");
                        const listRes = await fetch(`${VAPI_BASE_URL}/phone-number`, {
                            headers: { 'Authorization': `Bearer ${VAPI_TOKEN}` }
                        });

                        if (listRes.ok) {
                            const allNumbers = await listRes.json();
                            const match = allNumbers.find(n => n.id === phoneData.id);
                            if (match && match.number) {
                                console.log("✅ Found number in list:", match.number);
                                phoneData.number = match.number;
                            }
                        }
                    }

                    // 3. DECISION
                    if (phoneData.number) {
                        // success! Now update with assistant
                        console.log("✅ Number acquired. Attaching assistant...");
                        await fetch(`${VAPI_BASE_URL}/phone-number/${phoneData.id}`, {
                            method: 'PATCH',
                            headers: {
                                'Authorization': `Bearer ${VAPI_TOKEN}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                assistantId: assistantId
                            })
                        });
                        break;
                    } else {
                        console.warn("❌ Provisioned resource has no number string. Deleting zombie resource...");
                        // CLEANUP: Delete the useless number resource
                        if (phoneData.id) {
                            await fetch(`${VAPI_BASE_URL}/phone-number/${phoneData.id}`, {
                                method: 'DELETE',
                                headers: { 'Authorization': `Bearer ${VAPI_TOKEN}` }
                            });
                        }
                        phoneData = null; // Reset
                        lastError = "Provisioned resource had no number (Zombie).";
                    }

                } else {
                    lastError = await phoneResponse.text();
                    console.warn(`Failed Strategy:`, lastError);
                }
            } catch (err) {
                console.error(`Error trying strategy:`, err);
                lastError = err.message;
            }
        }

        if (!phoneData || !phoneData.number) {
            throw new Error(`Could not buy number. Last error: ${lastError}`);
        }

        const phoneNumber = phoneData.number;
        console.log("✅ Phone Number Acquired:", phoneNumber);

        // E. Save to Business Profile
        const { error: updateError } = await supabase
            .from('business_profiles')
            .update({
                vapi_assistant_id: assistantId,
                vapi_phone_number: phoneNumber,
                vapi_phone_id: phoneData.id
            })
            .eq('owner_user_id', userId);

        if (updateError) throw new Error(`Supabase Update Error: ${updateError.message}`);

        res.json({ success: true, assistantId, phoneNumber });

    } catch (err) {
        console.error("❌ Provisioning Failed:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// 1.5 Get Calls for User
app.get('/api/calls', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ error: "Missing userId" });

        // Get assistantId from Supabase
        const { data: profile } = await supabase
            .from('business_profiles')
            .select('vapi_assistant_id')
            .eq('owner_user_id', userId)
            .single();

        if (!profile || !profile.vapi_assistant_id) {
            return res.json([]); // No assistant = no calls
        }

        const assistantId = profile.vapi_assistant_id;

        // Fetch calls from Vapi
        const vapiRes = await fetch(`${VAPI_BASE_URL}/call?assistantId=${assistantId}&limit=100`, {
            headers: { 'Authorization': `Bearer ${VAPI_TOKEN}` }
        });

        if (!vapiRes.ok) throw new Error("Vapi Call Fetch Error");

        const calls = await vapiRes.json();
        res.json(calls);
    } catch (err) {
        console.error("❌ Call Fetch Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// 2. Update Assistant (Sync DB -> Vapi)
app.post('/api/sync-assistant', async (req, res) => {
    try {
        const { userId, languages, voiceId: reqVoiceId, voice_id: reqVoiceIdUnderscore } = req.body;
        const explicitVoiceId = reqVoiceId || reqVoiceIdUnderscore;

        console.log("📥 Sync Request Body:", JSON.stringify(req.body, null, 2));
        if (!userId) return res.status(400).json({ error: "Missing userId" });

        const { profile, greeting, instructions, knowledge, voiceId } = await getContextForUser(userId);

        if (!profile.vapi_assistant_id) {
            return res.status(400).json({ error: "No assistant found. Provision first." });
        }

        let systemPrompt = generateSystemPrompt({ profile, greeting, instructions, knowledge });

        // Append Language Instructions if provided
        if (languages && Array.isArray(languages) && languages.length > 0) {
            systemPrompt += `\n\nIMPORTANT LANGUAGE INSTRUCTION: You are fluent in and can speak the following languages: ${languages.join(", ")}. If a user speaks to you in one of these languages, you MUST switch to that language immediately and reply in it.`;
        }

        // Log the prompt for debugging
        console.log("\n--- SYNCING PROMPT ---");
        console.log(systemPrompt);
        console.log("----------------------\n");

        const assistantName = profile.assistant_name || `${profile.company_name} Receptionist`;
        // Use explicit ID if provided, otherwise fallback to DB, then default.
        const activeVoiceId = explicitVoiceId || voiceId || "OYTbf65OHHFELVut7v2H";

        // PERSISTENCE FIX: Robsut Save to DB from server-side
        if (explicitVoiceId) {
            console.log(`💾 Persisting Voice ID ${activeVoiceId} to Supabase...`);

            // Fetch profile first to ensure we target the right row
            const { data: profiles, error: fetchErr } = await supabase
                .from('business_profiles')
                .select('id')
                .eq('owner_user_id', userId);

            if (fetchErr) console.error("❌ Fetch Profile Error:", fetchErr);

            if (profiles && profiles.length > 0) {
                const { error: saveErr } = await supabase
                    .from('business_profiles')
                    .update({ voice_id: activeVoiceId })
                    .eq('id', profiles[0].id);

                if (saveErr) console.error("❌ Failed to save voice_id to DB:", saveErr);
                else console.log("✅ Voice ID saved to DB.");
            } else {
                console.error("❌ No profile found to save voice_id.");
            }
        }

        // Log the voice ID to be sure
        console.log(`🎙️ Syncing Voice ID: ${activeVoiceId}`);

        // Dynamic Example Year & Date for Bulletproof Prompts
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(14, 0, 0, 0); // Default example to 2 PM
        const exampleISO = tomorrow.toISOString().replace(/\.\d{3}Z$/, ''); // Remove ms/Z to keep it simple ISO (e.g. 2026-02-02T14:00:00)

        const updatedPayload = {
            name: assistantName,
            voice: {
                provider: "11labs",
                voiceId: activeVoiceId,
                model: "eleven_turbo_v2", // Force Turbo v2 for low latency
                stability: 0.5,
                similarityBoost: 0.75
            },
            model: {
                provider: "openai",
                model: "gpt-4o",
                messages: [
                    {
                        role: "system",
                        content: systemPrompt
                    }
                ],
                tools: profile.google_access_token ? [
                    {
                        type: "function",
                        function: {
                            name: "checkAvailability",
                            description: "Check if a specific time slot is available on the calendar. Use this BEFORE booking.",
                            parameters: {
                                type: "object",
                                properties: {
                                    startTime: { type: "string", description: `ISO 8601 start time (e.g. ${exampleISO})` },
                                    durationMinutes: { type: "number", description: "Duration in minutes (default 30)" }
                                },
                                required: ["startTime"]
                            }
                        },
                        server: {
                            url: "https://interorbitally-waxier-versie.ngrok-free.dev/api/tools/check-availability",
                        }
                    },
                    {
                        type: "function",
                        function: {
                            name: "bookAppointment",
                            description: "Book an appointment or meeting on the calendar. Ask for the date, time, and user's name first.",
                            parameters: {
                                type: "object",
                                properties: {
                                    summary: { type: "string", description: "Title of the meeting (e.g. 'Meeting with John')" },
                                    startTime: { type: "string", description: `ISO 8601 start time (e.g. ${exampleISO})` },
                                    durationMinutes: { type: "number", description: "Duration in minutes (default 30)" }
                                },
                                required: ["summary", "startTime"]
                            }
                        },
                        server: {
                            url: "https://interorbitally-waxier-versie.ngrok-free.dev/api/tools/book-appointment",
                        }
                    }
                ] : []
            }, // Close model logic
            firstMessage: greeting
        };

        const response = await fetch(`${VAPI_BASE_URL}/assistant/${profile.vapi_assistant_id}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${VAPI_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedPayload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Vapi Sync Failed:", response.status, errorText);
            throw new Error(`Failed to update Vapi: ${errorText}`);
        }

        const responseData = await response.json();
        console.log("✅ Vapi Sync Success! Assistant Updated:", JSON.stringify(responseData, null, 2));

        res.json({ success: true, vapiResponse: responseData });

    } catch (err) {
        console.error("Sync Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// START SERVER
// 5. Secure Voice Preview (Proxy to ElevenLabs)
const previewCache = {};

app.post('/api/voice-preview', async (req, res) => {
    const { voiceId, text } = req.body;
    if (!voiceId) return res.status(400).json({ error: "Missing voiceId" });

    // Strict Validation
    const validIds = VOICES.map(v => v.id);
    if (!validIds.includes(voiceId)) return res.status(400).json({ error: "Invalid voice ID" });

    // 1. Better Cache Key (Voice + Text)
    const cacheKey = `${voiceId}:${text || "default"}`;

    if (previewCache[cacheKey]) {
        res.setHeader("Content-Type", "audio/mpeg");
        return res.send(previewCache[cacheKey]);
    }

    try {
        console.log(`🎙️ Generating preview for voice: ${voiceId}`);

        // 2. AbortController for Timeout (8 seconds)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: "POST",
            headers: {
                "xi-api-key": process.env.ELEVENLABS_API_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                text: text || "Hi, thanks for calling. How can I help you today?",
                model_id: "eleven_multilingual_v2"
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId); // Clear timeout on success

        if (!r.ok) {
            const err = await r.text();
            console.error("❌ 11Labs API Error:", err);
            return res.status(500).json({ error: "Preview failed" });
        }

        const buf = await r.arrayBuffer();
        const buffer = Buffer.from(buf);

        // Cache the audio buffer with new key
        previewCache[cacheKey] = buffer;

        res.setHeader("Content-Type", "audio/mpeg");
        res.send(buffer);
        console.log("✅ Preview sent and cached.");

    } catch (err) {
        if (err.name === 'AbortError') {
            console.error("Preview Timeout");
            return res.status(504).json({ error: "Preview timed out" });
        }
        console.error("Preview Endpoint Error:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// 5. Get Voices (ElevenLabs Source of Truth)
// Canonical Voice List
// Canonical Voice List - (Moved to top)

app.get('/api/voices', (req, res) => {
    console.log("Serving Curated Voice List");
    // Map to expected format for frontend if needed, or send as is. 
    // Frontend expects { id, name, provider: '11labs' }
    const voices = VOICES.map(v => ({ ...v, provider: '11labs' }));
    res.json(voices);
});




// --- GOOGLE CALENDAR AUTH ROUTES ---

// 1. Generate Auth URL
app.post('/api/auth/google-url', (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `http://localhost:3000/auth/google/callback` // Redirect URI
    );

    const scopes = [
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/calendar.events'
    ];

    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline', // Critical for receiving a refresh token
        scope: scopes,
        state: userId, // Pass userId as state to identify user in callback
        prompt: 'consent' // Force consent to ensure we get a refresh token
    });

    res.json({ url });
});

// 2. Auth Callback
app.get('/auth/google/callback', async (req, res) => {
    const { code, state: userId } = req.query;

    if (!code || !userId) {
        return res.status(400).send("Invalid Request: Missing code or state (userId)");
    }

    try {
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            `http://localhost:3000/auth/google/callback`
        );

        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        console.log(`✅ Acquired Google Tokens for User: ${userId}`);

        // Update Supabase
        // We set the expires_at to now + expiry_date (seconds from now)
        const expiryDate = new Date();
        expiryDate.setSeconds(expiryDate.getSeconds() + tokens.expiry_date); // tokens.expiry_date is usually relative ms? Wait, check docs.
        // Actually, oauth2Client tokens.expiry_date is usually "Timestamp of expiration".
        // Let's verify standard google output. Usually it is an absolute timestamp (ms) or relative.
        // Google Node helper usually gives `expiry_date` as an epoch timestamp (ms).

        const updates = {
            google_access_token: tokens.access_token,
            google_token_expires_at: new Date(tokens.expiry_date).toISOString(),
            google_calendar_id: 'primary', // Default to primary calendar on first connect
            // Only update refresh token if one was returned (it's only returned on the first offline access request)
            ...(tokens.refresh_token && { google_refresh_token: tokens.refresh_token })
        };

        const { error } = await supabase
            .from('business_profiles')
            .update(updates)
            .eq('owner_user_id', userId);

        if (error) {
            console.error("❌ Failed to save Google Tokens:", error);
            return res.status(500).send("Database Error saving tokens.");
        }

        // Redirect back to frontend
        res.redirect('http://localhost:5173/');

    } catch (err) {
        console.error("❌ Google Auth Error:", err);
        res.status(500).send("Authentication Failed: " + err.message);
    }
});

// 6.5 TOOL ENDPOINT: Check Availability
app.post('/api/tools/check-availability', async (req, res) => {
    console.log("🛠️ Tool Call: checkAvailability", req.body);
    try {
        const { message } = req.body;
        const toolCall = message.toolCalls[0];

        // Lookup User by Assistant ID
        const assistantId = message.assistant?.id || message.call?.assistantId;
        const { data: profile } = await supabase.from('business_profiles').select('*').eq('vapi_assistant_id', assistantId).single();

        if (!profile || !profile.google_refresh_token) {
            return res.json({ results: [{ toolCallId: toolCall.id, result: "Error: calendar_not_connected" }] });
        }

        const auth = await getAuthenticatedClient(profile.owner_user_id, profile);
        const calendar = google.calendar({ version: 'v3', auth });

        let args = toolCall.function.arguments;
        if (typeof args === 'string') {
            try { args = JSON.parse(args); } catch (e) { console.error("JSON Parse Error", e); }
        }

        const start = new Date(args.startTime);
        const end = new Date(start.getTime() + (args.durationMinutes || 30) * 60000);

        console.log(`🔍 Checking availability for ${start.toISOString()} to ${end.toISOString()}`);

        const freeBusy = await calendar.freebusy.query({
            requestBody: {
                timeMin: start.toISOString(),
                timeMax: end.toISOString(),
                items: [{ id: profile.google_calendar_id || 'primary' }]
            }
        });

        const busySlots = freeBusy.data.calendars[profile.google_calendar_id || 'primary'].busy;

        if (busySlots.length > 0) {
            return res.json({
                results: [{
                    toolCallId: toolCall.id,
                    result: `Busy. There is a conflict: ${busySlots.length} meeting(s) during this time set.`
                }]
            });
        }

        return res.json({
            results: [{
                toolCallId: toolCall.id,
                result: "Available. The slot is free."
            }]
        });

    } catch (e) {
        console.error("❌ Availability Check Error:", e);
        res.json({ results: [{ toolCallId: req.body.message.toolCalls[0].id, result: `Error checking availability: ${e.message}` }] });
    }
});

// 7. TOOL ENDPOINT: Book Appointment
app.post('/api/tools/book-appointment', async (req, res) => {
    console.log("🛠️ Tool Call: bookAppointment", req.body);
    try {
        // ... (Vapi logic)
        // Vapi sends the message payload. We need to find the user from the call.

        const { message } = req.body;
        const toolCall = message.toolCalls[0];

        // Lookup User by Assistant ID
        // Vapi payload structure varies. Check message.assistant.id or message.call.assistantId
        const assistantId = message.assistant?.id || message.call?.assistantId;

        console.log(`🔹 Lookup Assistant ID: ${assistantId}`);
        const { data: profile } = await supabase.from('business_profiles').select('*').eq('vapi_assistant_id', assistantId).single();

        console.log(`🔹 Found Profile for Assistant ${assistantId}: ${profile ? 'YES' : 'NO'}`);

        if (!profile || !profile.google_refresh_token) {
            console.warn("⚠️ No Google Refresh Token found for profile.");
            return res.json({ results: [{ toolCallId: toolCall.id, result: "Error: calendar_not_connected" }] });
        }

        // Authenticate Google
        console.log("🔹 Authenticating with Google...");
        const auth = await getAuthenticatedClient(profile.owner_user_id, profile);

        // DEBUG: Check credentials
        console.log("🧪 OAuth client credentials BEFORE refresh:", {
            hasAccess: !!auth.credentials.access_token,
            expiry: auth.credentials.expiry_date
        });

        // FORCE REFRESH to ensure token is valid
        try {
            const tokenInfo = await auth.getAccessToken();
            console.log("🧪 Token Refresh Result:", tokenInfo ? "Success" : "No token returned");
        } catch (refreshErr) {
            console.error("❌ FORCE REFRESH FAILED:", refreshErr.response ? refreshErr.response.data : refreshErr.message);
            // If refresh fails, invalid_grant likely means redirect URI mismatch or revoked token
            return res.json({ results: [{ toolCallId: toolCall.id, result: `Calendar connection expired. Please reconnect.` }] });
        }

        const calendar = google.calendar({ version: 'v3', auth });

        // Parse Arguments (Handle String vs Object)
        let args = toolCall.function.arguments;
        console.log("🔹 Raw Arguments:", typeof args, args);
        if (typeof args === 'string') {
            try { args = JSON.parse(args); } catch (e) { console.error("JSON Parse Error", e); }
        }

        const start = new Date(args.startTime);
        const end = new Date(start.getTime() + (args.durationMinutes || 30) * 60000);

        console.log(`🔹 Booking Event: "${args.summary}" at ${start.toISOString()} (America/New_York)`);
        console.log("🧪 About to call Google Calendar API...");

        const eventResponse = await calendar.events.insert({
            calendarId: profile.google_calendar_id || 'primary',
            requestBody: {
                summary: args.summary,
                start: { dateTime: start.toISOString(), timeZone: "America/New_York" },
                end: { dateTime: end.toISOString(), timeZone: "America/New_York" }
            }
        });

        console.log("✅ Event Inserted Successfully!");
        console.log("🔗 Event Link:", eventResponse.data.htmlLink);

        // Save to Supabase 'bookings' table
        const { error: dbError } = await supabase.from('bookings').insert({
            owner_user_id: profile.owner_user_id,
            call_id: message.call?.id || message.call?.id, // Should match call ID from Vapi
            event_id: eventResponse.data.id,
            event_link: eventResponse.data.htmlLink,
            summary: args.summary,
            start_time: start.toISOString()
        });

        if (dbError) console.error("⚠️ Failed to save booking to DB:", dbError);
        else console.log("💾 Booking saved to Supabase.");

        // Return success to Vapi
        res.json({
            results: [
                {
                    toolCallId: toolCall.id,
                    result: `Successfully booked "${args.summary}" for ${start.toLocaleString()}.`
                }
            ]
        });

    } catch (e) {
        console.error("❌ Booking Error FULL:", {
            message: e.message,
            response: e.response ? e.response.data : "No response data",
            code: e.code
        });
        res.json({ results: [{ toolCallId: req.body.message.toolCalls[0].id, result: `Failed to book: ${e.message}` }] });
    }
});

// 6. DB SAVE (Failsafe)
app.post('/api/save-voice', async (req, res) => {
    const { userId, voiceId } = req.body;
    console.log(`💾 FORCE SAVE Request: User ${userId}, Voice ${voiceId}`);

    if (!userId || !voiceId) return res.status(400).json({ error: "Missing fields" });

    try {
        // 1. Fetch Profile ID
        const { data: profiles, error: fetchErr } = await supabase
            .from('business_profiles')
            .select('id')
            .eq('owner_user_id', userId);

        if (fetchErr) {
            console.error("❌ Force Save Fetch Error:", fetchErr);
            return res.status(500).json({ error: fetchErr.message });
        }

        if (!profiles || profiles.length === 0) {
            console.error("❌ No profile found for user:", userId);
            return res.status(404).json({ error: "Profile not found" });
        }

        // 2. Update
        const { error: saveErr } = await supabase
            .from('business_profiles')
            .update({ voice_id: voiceId })
            .eq('id', profiles[0].id);

        if (saveErr) {
            console.error("❌ Force Save Write Error:", saveErr);
            return res.status(500).json({ error: saveErr.message });
        }

        console.log("✅ FORCE SAVE SUCCESSFUL");
        res.json({ success: true, voiceId });

    } catch (e) {
        console.error("Force Save Exception:", e);
        res.status(500).json({ error: e.message });
    }
});

app.listen(PORT, () => {
    console.log(`🧠 Brain running on http://localhost:${PORT}`);
    if (supabaseUrl) console.log(`🔌 Supabase connected to: ${supabaseUrl}`);
});
