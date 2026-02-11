import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import * as cheerio from 'cheerio';
import twilio from 'twilio';


// Initialize Environment Variables
dotenv.config();

const app = express();
const PORT = 3000;

// Initialize Twilio
const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);


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

// --- DEV BYPASS: Create real user + profile without SMS ---
app.post('/api/dev-signup', async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) return res.status(400).json({ error: "Missing phone" });

        const phoneWithPlus = phone.startsWith('+') ? phone : `+1${phone}`;
        const email = `dev_${phone}@junodesk.dev`;
        const password = 'devpass_' + phone;

        console.log(`🔧 Dev Signup for: ${phoneWithPlus}`);

        let userId;
        let accessToken;
        let refreshToken;

        // 1. Try to sign in first (returning user)
        const { data: signInData } = await supabase.auth.signInWithPassword({
            email, password
        });

        if (signInData?.session) {
            userId = signInData.user.id;
            accessToken = signInData.session.access_token;
            refreshToken = signInData.session.refresh_token;
            console.log("✅ Existing dev user signed in:", userId);
        } else {
            // 2. Check if phone is already used by another auth user
            const { data: existingUsers } = await supabase.auth.admin.listUsers();
            const existingByPhone = existingUsers?.users?.find(u => u.phone === phoneWithPlus);

            if (existingByPhone) {
                // Phone exists on another user - update that user's email/password for dev login
                console.log("📱 Phone already registered, updating user for dev access:", existingByPhone.id);
                await supabase.auth.admin.updateUser(existingByPhone.id, {
                    email,
                    password,
                    email_confirm: true
                });
                userId = existingByPhone.id;

                // Sign in with new credentials
                const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
                    email, password
                });
                if (loginErr) throw new Error("Updated user but login failed: " + loginErr.message);
                accessToken = loginData.session.access_token;
                refreshToken = loginData.session.refresh_token;
            } else {
                // 3. Create brand new user (no phone conflict)
                const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
                    email,
                    password,
                    email_confirm: true,
                    phone: phoneWithPlus,
                    phone_confirm: true
                });

                if (createErr) throw new Error(createErr.message);

                userId = newUser.user.id;
                console.log("✅ Created dev user:", userId);

                // Sign in to get tokens
                const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
                    email, password
                });
                if (loginErr) throw new Error("Created user but login failed: " + loginErr.message);
                accessToken = loginData.session.access_token;
                refreshToken = loginData.session.refresh_token;
            }
        }

        // 4. Ensure profile exists
        const { data: existingProfile } = await supabase
            .from('business_profiles')
            .select('id')
            .eq('owner_user_id', userId)
            .maybeSingle();

        if (!existingProfile) {
            await supabase.from('business_profiles').insert({
                owner_user_id: userId,
                user_phone_number: phoneWithPlus
            });
            console.log("✅ Created business profile for:", userId);
        } else {
            await supabase.from('business_profiles')
                .update({ user_phone_number: phoneWithPlus })
                .eq('owner_user_id', userId);
            console.log("✅ Updated phone in profile for:", userId);
        }

        res.json({
            success: true,
            userId,
            email,
            accessToken,
            refreshToken,
            phone: phoneWithPlus
        });

    } catch (err) {
        console.error("❌ Dev Signup Failed (Logic Error):", err);
        // Ensure error is a string or object
        const errorMsg = err.message || JSON.stringify(err) || "Unknown Error";
        res.status(500).json({ error: errorMsg });
    }
});

// --- VAPI INTEGRATION ---
const VAPI_BASE_URL = 'https://api.vapi.ai';
const VAPI_TOKEN = process.env.VAPI_PRIVATE_KEY;

export const VOICES = [
    { id: 'cgSgspJ2msm6clMCkdW9', name: 'Hope' },
    { id: 'flHkNRp1BlvT73UL6gyz', name: 'Jessica' },
    { id: 'qBDvhofpxp92JgXJxDjB', name: 'Lily' },
    { id: 'iiidtqDt9FBdT1vfBluA', name: 'Bill' },
    { id: '94zOad0g7T7K4oa7zhDq', name: 'Jeff' },
    { id: 'UgBBYS2sOqTuMpoF3BR0', name: 'Mark' }
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
    const endingMessage = info.find(i => i.type === 'ending_message')?.content?.text || "Thank you for calling. Have a great day!";
    const instructions = info.filter(i => i.type === 'instruction').map(i => i.content.text);
    const commonWords = info.filter(i => i.type === 'common_words').map(i => i.content.text);
    const knowledge = info.filter(i => ['qa', 'fact'].includes(i.type)).map(i => i.content);
    const websiteContent = info.find(i => i.type === 'website_content')?.content;
    const personalityItem = info.find(i => i.type === 'personality');
    const voiceId = profile.voice_id || personalityItem?.content?.voiceId;

    // 3. Get Calendar Context (if connected)
    let calendarContext = "";
    if (profile.google_access_token) {
        calendarContext = await getCalendarEvents(userId, profile);
    }

    return { profile, greeting, endingMessage, instructions, commonWords, knowledge, websiteContent, voiceId, calendarContext };
}


// Helper: structured prompt builder (Vapi-style, over-safe)
function generateSystemPrompt({
    profile,
    greeting,
    endingMessage,
    instructions,
    commonWords,
    knowledge,
    websiteContent,
    calendarContext,
}) {
    // ---- Runtime safety defaults ----
    profile = profile || {};
    const kb = Array.isArray(knowledge) ? knowledge : [];
    const ins = Array.isArray(instructions) ? instructions : [];
    const wc = websiteContent && typeof websiteContent === 'object' ? websiteContent : null;

    // ---- Timezone-safe date/time ----
    const TZ = 'America/New_York';
    const now = new Date();

    const dateStr = now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: TZ,
    });

    const timeStr = now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
        timeZone: TZ,
    });

    const yearStr = now.toLocaleDateString('en-US', {
        year: 'numeric',
        timeZone: TZ,
    });

    // ---- Knowledge split (facts + Q/A) ----
    const qaItems = kb.filter((k) => k && k.question && k.answer);
    const factItems = kb.filter((k) => k && k.text && !k.question && !k.answer);

    // ---- Compact business + website text (voice friendly) ----
    // Keep long website content last; the flow sections should appear earlier.
    const websiteBlock =
        wc && wc.text
            ? `\n[Website Knowledge]\nSource: ${wc.url || 'unknown'}\n${wc.text}\n`
            : '';

    const extraFactsBlock =
        factItems.length > 0
            ? `\n[Extra Facts]\n- ${factItems.map((f) => f.text).join('\n- ')}\n`
            : '';

    const qaBlock =
        qaItems.length > 0
            ? `\n[Q&A]\n${qaItems
                .map((qa) => `Q: ${qa.question}\nA: ${qa.answer}`)
                .join('\n')}\n`
            : '';

    const instructionsBlock =
        ins.length > 0 ? `\n[Specific Instructions]\n- ${ins.join('\n- ')}\n` : '';

    const keywordsBlock =
        Array.isArray(commonWords) && commonWords.length > 0
            ? `\n[Special Vocabulary]\nPay extra attention to these words/names: ${commonWords.join(", ")}\n`
            : '';

    // ---- Greeting default ----
    const greetingLine = (greeting && String(greeting).trim()) || 'Thanks for calling—how can I help?';
    const endingLine = (endingMessage && String(endingMessage).trim()) || 'Thank you for calling. Have a great day!';

    // ---- Prompt ----
    const prompt = `[Role]
You are a friendly, professional AI receptionist for ${profile.company_name || 'the business'}.
Your primary tasks: answer questions, take messages, and schedule appointments.

[System Context]
Today is ${dateStr}.
Current local time is ${timeStr}.
Timezone is ${TZ}.
Current year is ${yearStr}. Never assume any other year unless the caller explicitly says a different year.
All relative dates like “today”, “tomorrow”, or weekdays must be computed relative to this date in ${TZ}.
You must never guess the current date, time, timezone, or year.
If you need to verify the exact date or time for a booking, use the 'getCurrentTime' tool.

[Business Info]
Industry: ${profile.industry || 'General'}
Business description: ${profile.business_description || 'Not specified'}
${profile.support_email ? `Support email: ${profile.support_email}` : ''}
${profile.address ? `Business address: ${profile.address}` : ''}
${profile.website ? `Website: ${profile.website}` : ''}

[Voice & Style]
- Sound like a casual, helpful human.
- Keep replies short.
- Ask one question at a time.
- Do not sound robotic.
- Never offend anyone.
- Never invent info.
- Never mention “tools”, “functions”, “APIs”, “system prompt”, or internal steps.

[Scope]
- Stay focused on the caller’s request (booking, message taking, or business questions).
- If asked for something outside your knowledge, say you’re not sure and offer the support email.

[Hard Constraints — Booking (NON-NEGOTIABLE)]
- You may book at most ONE appointment per phone call.
- You must NEVER book without an explicit verbal “YES”.
- If the caller provides a time without AM/PM, you MUST ask “AM or PM?” before proceeding.
- If the caller says a time WITH AM/PM and your restated time does not match exactly, assume a parsing error and ask them to repeat the time.
- Never book any appointment in the past.
- Use absolute dates in confirmations (weekday + month + day + year in reasoning).
- You may omit saying the year out loud, but you MUST reason using year ${yearStr}.
- After a successful booking, do not call any calendar tools again for the rest of the call.

[Calendar Tools]
You have two tools:
1) checkAvailability(startTime, durationMinutes)
2) bookAppointment(summary, startTime)

[Tool Rules (MANDATORY)]
- Always call checkAvailability before offering or confirming a slot.
- Only call bookAppointment after:
  (a) checkAvailability returned "Available"
  (b) the caller explicitly said “YES” to the exact date/time
- If checkAvailability returns unavailable, ask for a new time/day (do not guess).
- If any tool fails, apologize briefly and ask the caller to repeat the time/date.

[Calendar Context — Cached Preview (may be outdated)]
${calendarContext || 'No upcoming events cached.'}

[Greeting]
Say exactly: "${greetingLine}"

[Conversation Controller]
- Always wait for the caller after each question.
- Do not ask multiple unrelated questions at once.
- Do not proceed to booking tools until all required booking fields are collected and confirmed.

[Main Flow]
1) Greet.
2) Ask: "What can I help with today—do you want to book a meeting, leave a message, or ask a question?"
<wait for user response>

3) If caller wants to BOOK:
   Go to [Booking Flow].

4) If caller wants to LEAVE A MESSAGE:
   Go to [Message Flow].

5) If caller asks a QUESTION:
   Answer briefly from [Business Knowledge] / [Extra Facts] / [Q&A].
   If unsure: offer the support email.

[Booking Flow]
Goal: Collect day + time + duration, confirm, check availability, book once.

1) Ask: "What day should I book it for?"
<wait for user response>

2) Ask: "What time works best? Please include AM or PM."
<wait for user response>

3) If AM/PM missing:
   Ask: "Quick check—did you mean AM or PM?"
   <wait for user response>

4) Ask: "How long should the meeting be—15 minutes, 30 minutes, or something else?"
<wait for user response>

5) Confirm (must be explicit, binary):
   Say: "Please confirm: {weekday, month day} at {time with AM/PM} Eastern, for {duration}. Say YES to book or NO to change it."
<wait for user response>

6) If caller says YES:
   - Call checkAvailability(startTime, durationMinutes)
   - <wait for tool result>
   - If Available:
       - Call bookAppointment(summary, startTime)
       - <wait for tool result>
       - Say: "All set—you’re booked for {weekday, month day} at {time} Eastern."
       - Stop booking actions for the rest of the call.
   - If Not available:
       - Say: "That time isn’t available."
       - Ask: "Do you want a different time the same day, or a different day?"
       - <wait for user response>
       - Return to step 1 or step 2 based on their answer.

7) If caller says NO (or anything other than YES):
   - Ask: "No problem—what should I change: the day, the time, or the duration?"
   - <wait for user response>
   - Return to the relevant step.

[Message Flow]
1) Ask: "Sure—what’s your name?"
<wait for user response>
2) Ask: "What’s the best callback number?"
<wait for user response>
3) Ask: "What message would you like me to pass along?"
<wait for user response>
4) Read back: "Got it. You’re {name}, callback {number}, and the message is: {message}. Is that right?"
<wait for user response>
5) If yes: "Perfect—I’ll pass that along."
6) If no: ask what to correct and update once.

[End of Call]
When the conversation is over, say exactly: "${endingLine}"

[Business Knowledge]
${websiteBlock}${extraFactsBlock}${qaBlock}${instructionsBlock}${keywordsBlock}
`;

    return prompt;
}

// 6.7 WEBHOOK: Vapi End-of-Call Report
app.post('/api/webhook/vapi', async (req, res) => {
    try {
        const { message } = req.body;

        // Log generic message type
        console.log(`📨 Webhook Received: ${message.type}`);

        if (message.type === 'end-of-call-report') {
            const { call, customer, analysis, artifact } = message;

            console.log("📝 Processing End of Call Report for:", call.id);

            // 1. Find User by Assistant ID
            // We use 'maybeSingle' to be safe
            const assistantId = message.assistantId || call.assistantId;
            const { data: profile } = await supabase
                .from('business_profiles')
                .select('owner_user_id')
                .eq('vapi_assistant_id', assistantId)
                .maybeSingle();

            if (profile) {
                // 2. Calculate Duration
                const duration = new Date(call.endedAt).getTime() - new Date(call.startedAt).getTime();
                const durationSeconds = Math.round(duration / 1000);

                // 3. Spam Detection
                const summaryText = (analysis?.summary || "").toLowerCase();
                const isSpam = (durationSeconds < 5) ||
                    summaryText.includes('wrong number') ||
                    summaryText.includes('spam') ||
                    (call.endedReason === 'customer-did-not-give-microphone-permission');

                // 4. Upsert into Calls Table
                const { error } = await supabase.from('calls').upsert({
                    id: call.id,
                    user_id: profile.owner_user_id,
                    customer_number: customer?.number || "Unknown",
                    started_at: call.startedAt,
                    ended_at: call.endedAt,
                    duration_seconds: durationSeconds,
                    summary: analysis?.summary || "Processing...",
                    transcript: analysis?.transcript || "",
                    recording_url: artifact?.recordingUrl || call.recordingUrl,
                    is_spam: isSpam
                    // is_read and is_archived default to false
                }, { onConflict: 'id' });

                if (error) console.error("❌ Failed to save call:", error);
                else console.log("✅ Saved Call to DB:", call.id);
            } else {
                console.warn("⚠️ No profile found for assistant:", assistantId);
            }
        }
        res.status(200).send('OK');
    } catch (e) {
        console.error("❌ Webhook Error", e);
        res.status(500).send('Err');
    }
});

// 6.8 SYNC CALLS: Backfill from Vapi
app.get('/api/sync-calls', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ error: "Missing userId" });

        // 1. Get Profile
        const { data: profile } = await supabase.from('business_profiles').select('*').eq('owner_user_id', userId).single();
        if (!profile || !profile.vapi_assistant_id) return res.status(404).json({ error: "No assistant linked" });

        // 2. Fetch Calls from Vapi
        // 2. Fetch Calls from Vapi (Fetch up to 1000 recent calls)
        const url = `${VAPI_BASE_URL}/call?assistantId=${profile.vapi_assistant_id}&limit=1000`;
        console.log(`fetching calls from: ${url}`);
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${VAPI_TOKEN}` }
        });

        if (!response.ok) {
            const errText = await response.text();
            console.log(`❌ Vapi Sync Failed: ${response.status} ${response.statusText}`, errText);
            throw new Error(`Vapi fetch failed: ${response.statusText}`);
        }

        const calls = await response.json();

        // Safety Check: Ensure calls is an array
        if (!Array.isArray(calls)) {
            console.log("⚠️ Vapi returned non-array for calls:", typeof calls);
            // If Vapi returns { results: [...] }, handle it
            if (calls && Array.isArray(calls.results)) {
                calls = calls.results; // Fix it
            } else {
                // Return empty to avoid crash
                res.json({ success: true, count: 0, vapiCount: 0, assistantId: profile.vapi_assistant_id });
                return;
            }
        }

        const vapiCount = calls.length;

        // 3. Upsert to DB
        let count = 0;
        if (Array.isArray(calls)) {
            for (const call of calls) {
                const durationSeconds = call.endedAt ? Math.round((new Date(call.endedAt).getTime() - new Date(call.startedAt).getTime()) / 1000) : 0;
                // Safety: Ensure duration is a number
                const safeDuration = isNaN(durationSeconds) ? 0 : durationSeconds;

                const summaryText = (call.analysis?.summary || call.summary || "").toLowerCase();
                const isSpam = (safeDuration < 5) ||
                    summaryText.includes('wrong number') ||
                    summaryText.includes('spam');

                const { error } = await supabase.from('calls').upsert({
                    id: call.id,
                    user_id: userId, // MATCHES DB SCHEMA
                    customer_number: call.customer?.number || "Unknown",
                    started_at: call.startedAt,
                    ended_at: call.endedAt,
                    duration_seconds: safeDuration,
                    summary: call.analysis?.summary || call.summary || "Processing...",
                    transcript: call.transcript || call.analysis?.transcript || "",
                    recording_url: call.artifact?.recordingUrl || call.recordingUrl,
                    is_spam: isSpam
                    // DEBUG: confirming we do not overwrite is_read
                    // is_archived & is_read are omitted so they use DB defaults for new rows
                    // and are NOT overwritten for existing rows.
                }, { onConflict: 'id' });

                if (error) console.error("Upsert fail", error);
                if (!error) count++;
            }
        }

        console.log(`✅ Backfilled ${count}/${vapiCount} calls for user ${userId}`);
        res.json({ success: true, count, vapiCount, assistantId: profile.vapi_assistant_id });

    } catch (e) {
        console.log("❌ Sync Error (stdout):", e.message); // Log to stdout to ensure visibility
        console.error("Sync Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// 6.9 FIX ASSISTANT LINK: Fallback to find correct assistant
app.get('/api/fix-assistant-link', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).send("Missing userId");

        // 1. Get Profile
        const { data: profile } = await supabase.from('business_profiles').select('*').eq('owner_user_id', userId).single();
        if (!profile) return res.status(404).send("Profile not found");

        console.log(`🔧 Attempting to fix assistant link for: ${profile.company_name}`);

        // 2. List All Assistants from Vapi
        const response = await fetch(`${VAPI_BASE_URL}/assistant`, {
            headers: { 'Authorization': `Bearer ${VAPI_TOKEN}` }
        });
        const assistants = await response.json();

        // 3. Find match by name (fuzzy or exact)
        const targetName = `${profile.company_name} Receptionist`;
        // Also look for just "Receptionist" if singular
        const match = assistants.find(a => a.name === targetName) || assistants.find(a => a.name.includes(profile.company_name));

        if (match) {
            console.log(`✅ Found matching assistant: ${match.name} (${match.id})`);

            // 4. Update DB
            await supabase
                .from('business_profiles')
                .update({ vapi_assistant_id: match.id })
                .eq('owner_user_id', userId);

            // 5. Also ensure Webhook is set on it!
            const webhookUrl = `${process.env.SERVER_URL || `http://localhost:${PORT}`}/api/webhook/vapi`;
            if (match.serverUrl !== webhookUrl) {
                await fetch(`${VAPI_BASE_URL}/assistant/${match.id}`, {
                    method: 'PATCH',
                    headers: { 'Authorization': `Bearer ${VAPI_TOKEN}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ serverUrl: webhookUrl })
                });
                console.log("🔗 Updated Webhook URL on recovered assistant");
            }

            res.json({ success: true, fixed: true, assistantId: match.id, name: match.name });
        } else {
            console.warn("❌ No matching assistant found in Vapi account.");
            res.json({ success: false, error: "No assistant found matching company name" });
        }

    } catch (e) {
        console.error("Fix Link Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// 1. Provision a Number & Assistant
app.post('/api/provision', async (req, res) => {
    let purchased = null; // For rollback if needed

    try {
        const { userId, companyName, industry, userPhone } = req.body;
        if (!userId) return res.status(400).json({ error: "Missing userId" });

        console.log(`🚀 Starting Provisioning for User: ${userId}`);

        // Check if profile exists, create minimal one if not (for mock users)
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

            if (createErr) {
                console.error("❌ Failed to create profile:", createErr);
                throw new Error(`Cannot create profile: ${createErr.message}`);
            }
            profile = newProfile;
            console.log("✅ Created minimal profile for:", userId);
        }

        // Load business context (greeting, instructions, knowledge)
        const { data: info } = await supabase
            .from('business_info')
            .select('*')
            .eq('owner_user_id', userId);

        const greeting = info?.find(i => i.type === 'greeting')?.content?.text || "Hello, how can I help you?";
        const instructions = info?.filter(i => i.type === 'instruction').map(i => i.content.text) || [];
        const knowledge = info?.filter(i => ['qa', 'fact'].includes(i.type)).map(i => i.content) || [];

        // CHUNK 0 — Idempotency guard (check ALL provisioning artifacts)
        if (
            profile.vapi_assistant_id &&
            profile.vapi_phone_number &&
            profile.vapi_phone_id
        ) {
            console.log("✅ User fully provisioned. Returning existing data.");
            return res.json({
                success: true,
                assistantId: profile.vapi_assistant_id,
                phoneNumber: profile.vapi_phone_number,
                vapiPhoneId: profile.vapi_phone_id,
                profileId: profile.id
            });
        }

        // Check for partial state - if assistant exists but phone import failed
        if (profile.vapi_assistant_id && !profile.vapi_phone_id) {
            console.log("⚠️ Partial state detected: assistant exists but no phone. Continuing...");
        }

        // CHUNK 1 — Create Vapi assistant FIRST
        let assistantId = profile.vapi_assistant_id;

        if (!assistantId) {
            const systemPrompt = generateSystemPrompt({ profile, greeting, instructions, knowledge });

            const assistantPayload = {
                name: `${profile.company_name} Receptionist`,
                serverUrl: `${process.env.SERVER_URL || `http://localhost:${PORT}`}/api/webhook/vapi`,
                model: {
                    provider: "openai",
                    model: "gpt-4o",
                    messages: [
                        {
                            role: "system",
                            content: systemPrompt
                        }
                    ],
                    tools: [
                        {
                            type: "function",
                            function: {
                                name: "getCurrentTime",
                                description: "Get the current date and time. Use this when you need to know today's date or time for booking.",
                                parameters: { type: "object", properties: {} }
                            },
                            server: {
                                url: `${process.env.SERVER_URL || `http://localhost:${PORT}`}/api/tools/get-current-time`,
                            }
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
                headers: {
                    'Authorization': `Bearer ${VAPI_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(assistantPayload)
            });

            if (!assistantRes.ok) {
                const status = assistantRes.status;
                const errText = await assistantRes.text();
                console.error("❌ Assistant creation failed:", status, errText);
                throw new Error(`Assistant creation failed (${status}): ${errText}`);
            }

            const assistant = await assistantRes.json();
            assistantId = assistant.id;
            console.log("✅ Assistant Created:", assistantId);

            // Save assistant immediately (enables retry safety)
            await supabase
                .from('business_profiles')
                .update({ vapi_assistant_id: assistantId })
                .eq('owner_user_id', userId);
        } else {
            console.log("✅ Assistant already exists:", assistantId);
        }

        // CHUNK 2 — Buy Twilio number (SMS-capable only)
        // Skip if we already have a number
        if (profile.vapi_phone_number && profile.twilio_phone_sid) {
            console.log("✅ Twilio number already exists:", profile.vapi_phone_number);
            purchased = { phoneNumber: profile.vapi_phone_number, sid: profile.twilio_phone_sid };
        } else {
            console.log("📞 Searching for available SMS-capable numbers on Twilio...");

            const available = await twilioClient
                .availablePhoneNumbers('US')
                .local
                .list({
                    limit: 1,
                    smsEnabled: true,
                    voiceEnabled: true
                });

            if (!available.length) {
                throw new Error("No SMS-capable numbers available from Twilio");
            }

            purchased = await twilioClient.incomingPhoneNumbers.create({
                phoneNumber: available[0].phoneNumber,
                friendlyName: `${profile.company_name} - JunoDesk`
            });

            console.log(`✅ Purchased number: ${purchased.phoneNumber} (SID: ${purchased.sid})`);
            // DO NOT save to DB yet - enables rollback if Vapi import fails
        }

        // CHUNK 3 — Import into Vapi (SMS SAFE)
        let vapiPhoneId = profile.vapi_phone_id;

        if (!vapiPhoneId) {
            console.log("📥 Importing number to Vapi (SMS-safe mode)...");

            const phonePayload = {
                provider: "twilio",
                number: purchased.phoneNumber,
                twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
                twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
                assistantId: assistantId,
                name: `${profile.company_name} Line`,
                smsEnabled: false   // 🔒 CRITICAL: Do NOT touch SMS webhooks
            };

            console.log('📤 Vapi phone payload:', { ...phonePayload, twilioAuthToken: '[REDACTED]' });

            const phoneRes = await fetch(`${VAPI_BASE_URL}/phone-number`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${VAPI_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(phonePayload)
            });

            if (!phoneRes.ok) {
                // 🔥 rollback Twilio number on failure
                if (purchased && purchased.sid && !profile.twilio_phone_sid) {
                    console.log("🔥 Rolling back Twilio number...");
                    try {
                        await twilioClient.incomingPhoneNumbers(purchased.sid).remove();
                        console.log("✅ Twilio number released");
                    } catch (rollbackErr) {
                        console.error("❌ Failed to rollback Twilio number:", rollbackErr.message);
                    }
                }
                const errText = await phoneRes.text();
                throw new Error(`Vapi phone import failed: ${errText}`);
            }

            const vapiPhone = await phoneRes.json();
            vapiPhoneId = vapiPhone.id;
            console.log("✅ Number imported to Vapi:", vapiPhoneId);
        } else {
            console.log("✅ Vapi phone already imported:", vapiPhoneId);
        }

        // CHUNK 4 — Final DB commit (atomic)
        console.log("💾 Final atomic profile update...");
        const { error: updateError } = await supabase
            .from('business_profiles')
            .update({
                vapi_phone_number: purchased.phoneNumber,
                twilio_phone_sid: purchased.sid,
                vapi_phone_id: vapiPhoneId
            })
            .eq('owner_user_id', userId);

        if (updateError) throw new Error(`Supabase Update Error: ${updateError.message}`);

        console.log("🎉 Provisioning Complete!");
        res.json({
            success: true,
            assistantId,
            phoneNumber: purchased.phoneNumber,
            vapiPhoneId,
            profileId: profile.id
        });

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

        const { profile, greeting, endingMessage, instructions, commonWords, knowledge, websiteContent, voiceId, calendarContext } = await getContextForUser(userId);

        if (!profile.vapi_assistant_id) {
            return res.status(400).json({ error: "No assistant found. Provision first." });
        }

        let systemPrompt = generateSystemPrompt({ profile, greeting, endingMessage, instructions, commonWords, knowledge, websiteContent, calendarContext });

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
            serverUrl: `${process.env.SERVER_URL || `http://localhost:${PORT}`}/api/webhook/vapi`,
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
                tools: [
                    ...(profile.google_access_token ? [
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
                                url: `${process.env.SERVER_URL || `http://localhost:${PORT}`}/api/tools/check-availability`,
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
                                url: `${process.env.SERVER_URL || `http://localhost:${PORT}`}/api/tools/book-appointment`,
                            }
                        }
                    ] : []),
                    // Always available tool:
                    {
                        type: "function",
                        function: {
                            name: "getCurrentTime",
                            description: "Get the current date and time. Use this when you need to know today's date or time for booking.",
                            parameters: { type: "object", properties: {} }
                        },
                        server: {
                            url: `${process.env.SERVER_URL || `http://localhost:${PORT}`}/api/tools/get-current-time`,
                        }
                    }
                ]
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
        // Log to stdout for visibility
        console.log("❌ Sync Assistant Failed (stdout):", err.message);
        console.error("❌ Sync Assistant Failed:", {
            message: err.message,
            stack: err.stack,
            userId: req.body.userId,
            voiceId: req.body.voiceId
        });
        res.status(500).json({ error: `Sync failed: ${err.message}` });
    }
});

// START SERVER
// 5. Secure Voice Preview (Proxy to ElevenLabs)
const previewCache = {};

app.post('/api/voice-preview', async (req, res) => {
    const { voiceId, text } = req.body;
    if (!voiceId) return res.status(400).json({ error: "Missing voiceId" });

    // Relaxed Validation: Allow any non-empty string as ID, but log it.
    if (!voiceId || typeof voiceId !== 'string') return res.status(400).json({ error: "Invalid voice ID format" });

    // Check key
    if (!process.env.ELEVENLABS_API_KEY) {
        console.error("❌ Missing ELEVENLABS_API_KEY");
        return res.status(500).json({ error: "Server misconfiguration: Missing API Key" });
    }

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

        // --- TWILIO SMS NOTIFICATION ---
        const customerNumber = message.customer?.number || message.call?.customer?.number;

        if (customerNumber && profile.vapi_phone_number) {
            try {
                console.log(`💬 Sending confirmation SMS to ${customerNumber}...`);
                const smsBody = `Hi! This is ${profile.company_name || 'your assistant'}. Your meeting for "${args.summary}" is confirmed for ${start.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}.`;

                await twilioClient.messages.create({
                    body: smsBody,
                    from: profile.vapi_phone_number,
                    to: customerNumber
                });
                console.log("✅ SMS Sent successfully.");
            } catch (smsErr) {
                console.error("❌ Failed to send SMS (A2P/Network Error):", smsErr.message);
                // We do NOT fail the tool call because the booking succeeded.
            }
        } else {
            console.log("⚠️ SMS skipped: Missing customer number or Vapi phone number");
        }


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

// 8. TOOL ENDPOINT: Get Current Time
app.post('/api/tools/get-current-time', (req, res) => {
    const now = new Date();
    const result = {
        date: now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/New_York' }),
        time: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })
    };
    console.log("⌚️ Tool Call: getCurrentTime", result);

    // Safety: check structure
    const toolCallId = req.body.message?.toolCalls?.[0]?.id;
    if (!toolCallId) return res.status(400).send("No tool call in body");

    return res.json({
        results: [{
            toolCallId: toolCallId,
            result: `Current Date: ${result.date}. Current Time: ${result.time} ET.`
        }]
    });
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

// Utility: Scrape Website for Training
app.post('/api/scrape-website', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ error: "Missing URL" });

        console.log(`🕷️ Scraping: ${url}`);
        const response = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JunoBot/1.0)' }
        });

        if (!response.ok) throw new Error("Failed to fetch website");

        const html = await response.text();
        const $ = cheerio.load(html);

        // Aggressive Cleaning
        const removeSelectors = [
            'script', 'style', 'noscript', 'iframe', 'svg',
            'nav', 'footer', 'header', 'aside', 'form',
            '.nav', '.navbar', '.menu', '.sidebar', '.cookie-banner', '.popup',
            '[role="navigation"]', '[role="alert"]', '[role="banner"]', '[aria-hidden="true"]',
            '.mw-jump-link', '.mw-editsection', '.reflist', '.catlinks'
        ];
        removeSelectors.forEach(sel => $(sel).remove());

        // Extract Text
        const title = $('title').text().trim();
        const description = $('meta[name="description"]').attr('content') || "";

        // Better Text Extraction
        let $content = $('main, article, #content, #main');
        if ($content.length === 0) $content = $('body');

        let bodyText = $content.text()
            .replace(/\s+/g, ' ')
            .replace(/Jump to content/gi, '')
            .replace(/Skip to main content/gi, '')
            .trim();

        // Limit length to avoid token explosion (e.g. 5000 chars)
        const MAX_LENGTH = 8000;
        if (bodyText.length > MAX_LENGTH) {
            bodyText = bodyText.substring(0, MAX_LENGTH) + "...";
        }

        const fullContent = `Source: ${url}\nTitle: ${title}\nDescription: ${description}\n\nContent:\n${bodyText}`;

        // Save to business_info for assistant knowledge
        const { userId } = req.body;
        if (userId) {
            await supabase.from('business_info').upsert({
                owner_user_id: userId,
                type: 'website_content',
                content: { text: fullContent, source: 'website_scrape', url }
            }, { onConflict: 'owner_user_id,type' });
            console.log(`💾 Saved website content to knowledge for user: ${userId}`);
        }

        res.json({ success: true, text: fullContent, title });
    } catch (e) {
        console.error("Scrape Error:", e);
        res.status(500).json({ error: e.message });
    }
});

app.listen(PORT, () => {
    console.log(`🧠 Brain running on http://localhost:${PORT}`);
    if (supabaseUrl) console.log(`🔌 Supabase connected to: ${supabaseUrl}`);
});
