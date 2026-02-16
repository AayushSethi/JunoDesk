
import { supabase } from '../config/supabase.js';

const VAPI_BASE_URL = 'https://api.vapi.ai';
const VAPI_TOKEN = process.env.VAPI_PRIVATE_KEY;

export const vapiWebhook = async (req, res) => {
    try {
        const { message } = req.body;
        console.log(`📨 Webhook Received: ${message.type}`);

        if (message.type === 'assistant-request') {
            const now = new Date().toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: 'full', timeStyle: 'short' });
            const systemUpdate = `[SYSTEM UPDATE] Current Date and Time: ${now}. You must use this date for all scheduling.`;

            return res.json({
                assistant: {
                    ...message.assistant,
                    model: {
                        ...message.assistant.model,
                        messages: [
                            { role: "system", content: systemUpdate },
                            ...(message.assistant.model.messages || [])
                        ]
                    },
                    analysisPlan: {
                        summaryPlan: {
                            messages: [
                                { role: "system", content: "You are an expert concise summarizer. Output a summary of this call in STRICTLY 20 WORDS OR LESS. If you exceed 20 words, you fail. Do not include filler words like 'The caller to'. Just state the outcome." },
                                { role: "user", content: "Transcript: {{transcript}}" }
                            ],
                            enabled: true,
                            timeoutSeconds: 10
                        }
                    }
                }
            });
        }

        if (message.type === 'end-of-call-report') {
            const { call, customer, analysis, artifact } = message;
            const assistantId = message.assistantId || call.assistantId;
            const { data: profile } = await supabase.from('business_profiles').select('owner_user_id').eq('vapi_assistant_id', assistantId).maybeSingle();

            if (profile) {
                const durationSeconds = Math.round((new Date(call.endedAt).getTime() - new Date(call.startedAt).getTime()) / 1000);
                const summaryText = (analysis?.summary || "").toLowerCase();
                const isSpam = (durationSeconds < 5) || summaryText.includes('wrong number') || summaryText.includes('spam');

                await supabase.from('calls').upsert({
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
                }, { onConflict: 'id' });
                console.log("✅ Saved Call to DB:", call.id);
            }
        }
        res.status(200).send('OK');
    } catch (e) {
        console.error("❌ Webhook Error", e);
        res.status(500).send('Err');
    }
};

export const getCalls = async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ error: "Missing userId" });

        const { data: profile } = await supabase.from('business_profiles').select('vapi_assistant_id').eq('owner_user_id', userId).single();
        if (!profile?.vapi_assistant_id) return res.json([]);

        const vapiRes = await fetch(`${VAPI_BASE_URL}/call?assistantId=${profile.vapi_assistant_id}&limit=100`, {
            headers: { 'Authorization': `Bearer ${VAPI_TOKEN}` }
        });
        if (!vapiRes.ok) throw new Error("Vapi Call Fetch Error");
        res.json(await vapiRes.json());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const syncCalls = async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ error: "Missing userId" });

        const { data: profile } = await supabase.from('business_profiles').select('*').eq('owner_user_id', userId).single();
        if (!profile?.vapi_assistant_id) return res.status(404).json({ error: "No assistant linked" });

        const response = await fetch(`${VAPI_BASE_URL}/call?assistantId=${profile.vapi_assistant_id}&limit=1000`, {
            headers: { 'Authorization': `Bearer ${VAPI_TOKEN}` }
        });
        const calls = await response.json();

        // Handle { results: [] } format wrapper if present
        const callsList = Array.isArray(calls) ? calls : (calls.results || []);

        let count = 0;
        for (const call of callsList) {
            const durationSeconds = call.endedAt ? Math.round((new Date(call.endedAt).getTime() - new Date(call.startedAt).getTime()) / 1000) : 0;
            const safeDuration = isNaN(durationSeconds) ? 0 : durationSeconds;
            const summaryText = (call.analysis?.summary || call.summary || "").toLowerCase();
            const isSpam = (safeDuration < 5) || summaryText.includes('wrong number') || summaryText.includes('spam');

            const { error } = await supabase.from('calls').upsert({
                id: call.id,
                user_id: userId,
                customer_number: call.customer?.number || "Unknown",
                started_at: call.startedAt,
                ended_at: call.endedAt,
                duration_seconds: safeDuration,
                summary: call.analysis?.summary || call.summary || "Processing...",
                transcript: call.transcript || call.analysis?.transcript || "",
                recording_url: call.artifact?.recordingUrl || call.recordingUrl,
                is_spam: isSpam
            }, { onConflict: 'id' });

            if (!error) count++;
        }

        console.log(`✅ Backfilled ${count} calls for user ${userId}`);
        res.json({ success: true, count, vapiCount: callsList.length });

    } catch (e) {
        console.error("Sync Error:", e);
        res.status(500).json({ error: e.message });
    }
};
