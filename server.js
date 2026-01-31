import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

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

    return { profile, greeting, instructions, knowledge, voiceId };
}

// Helper: structured prompt builder
function generateSystemPrompt({ profile, greeting, instructions, knowledge }) {
    // 1. Identity & Tone
    let prompt = `You are the friendly and professional AI Receptionist for ${profile.company_name || 'a business'}.`;

    if (profile.industry) {
        prompt += ` The business is in the ${profile.industry} industry.\n`;
    }

    if (profile.business_description) {
        prompt += `\nBUSINESS CONTEXT:\n${profile.business_description}\n`;
    }

    // 2. Core Behavior & Guardrails
    prompt += `\nCORE BEHAVIOR:
- Your main goal is to answer questions, take messages, and help callers efficiently.
- Be polite, concise, and natural. Do not sound robotic.
- If the caller asks to speak to a real person, offer to take a message or say you can have someone call them back.
- NEVER make up information. If the answer is not in your Knowledge Base, say "I don't have that information handy, but I can check and get back to you."\n`;

    // 3. Knowledge Base
    const qaItems = knowledge.filter(k => k.question && k.answer);
    const factItems = knowledge.filter(k => k.text && !k.question && !k.answer); // 'fact' type

    if (qaItems.length > 0 || factItems.length > 0) {
        prompt += `\nKNOWLEDGE BASE (Use this to answer questions):\n`;

        if (factItems.length > 0) {
            prompt += `Important Facts:\n`;
            factItems.forEach(f => prompt += `- ${f.text}\n`);
            prompt += `\n`;
        }

        if (qaItems.length > 0) {
            prompt += `Common Q&A:\n`;
            qaItems.forEach(qa => {
                prompt += `Q: ${qa.question}\nA: ${qa.answer}\n`;
            });
        }
    }

    // 4. Specific Instructions
    if (instructions && instructions.length > 0) {
        prompt += `\nSPECIFIC INSTRUCTIONS:\n`;
        instructions.forEach(ins => prompt += `- ${ins}\n`);
    }

    // 5. Scripting
    prompt += `\nSCRIPTING:\n`;
    prompt += `Greeting: "${greeting}"\n`;

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
                ]
            },
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

        res.json({ success: true });

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
