import { supabase } from '../config/supabase.js';
import { twilioClient } from '../config/twilio.js';

const VAPI_BASE_URL = 'https://api.vapi.ai';
const VAPI_TOKEN = process.env.VAPI_PRIVATE_KEY;

// Fetch chat messages from Supabase
export const getChats = async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ error: "Missing userId" });

        const { data: messages, error } = await supabase
            .from('messages')
            .select('*')
            .eq('owner_user_id', userId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        // Group messages by customer phone for chat threads
        const grouped = {};
        for (let m of messages) {
            if (!grouped[m.customer_phone]) {
                grouped[m.customer_phone] = {
                    phone: m.customer_phone,
                    history: [],
                    lastMessage: null,
                    updatedAt: m.created_at
                };
            }
            grouped[m.customer_phone].history.push(m);
            grouped[m.customer_phone].lastMessage = m;
            grouped[m.customer_phone].updatedAt = m.created_at;
        }

        // Return sorted conversations based on latest activity
        const conversations = Object.values(grouped).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

        res.json({ success: true, conversations });
    } catch (err) {
        console.error("❌ Failed to fetch chats:", err);
        res.status(500).json({ error: err.message });
    }
};

// Send a message from the Business App directly to a Customer (manual fallback)
// This hits Twilio to text the user and saves it.
export const sendChatMessage = async (req, res) => {
    try {
        const { userId, toPhone, content } = req.body;
        if (!userId || !toPhone || !content) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // 1. Get business twilio number
        const { data: profile } = await supabase
            .from('business_profiles')
            .select('vapi_phone_number')
            .eq('owner_user_id', userId)
            .single();

        if (!profile || !profile.vapi_phone_number) {
            return res.status(400).json({ error: "No active phone number found for this account." });
        }

        const fromPhone = profile.vapi_phone_number;

        // 2. Fetch previous chat ID if exists to keep AI context if needed
        const { data: lastMsg } = await supabase
            .from('messages')
            .select('vapi_chat_id')
            .eq('owner_user_id', userId)
            .eq('customer_phone', toPhone)
            .not('vapi_chat_id', 'is', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        const vapiChatId = lastMsg?.vapi_chat_id;

        // 3. Save to DB
        const { data: newMsg, error: insertErr } = await supabase.from('messages').insert({
            owner_user_id: userId,
            customer_phone: toPhone,
            direction: 'outbound_manual',
            content,
            vapi_chat_id: vapiChatId || null
        }).select().single();

        if (insertErr) throw insertErr;

        // 4. Send via Twilio
        await twilioClient.messages.create({
            body: content,
            from: fromPhone,
            to: toPhone
        });

        res.json({ success: true, message: newMsg });
    } catch (err) {
        console.error("❌ Failed to send manual chat message:", err);
        res.status(500).json({ error: err.message });
    }
};

// Start a text conversation directly with the AI via Chats API
export const createVapiChat = async (req, res) => {
    try {
        const { userId, customerPhone, message } = req.body;

        const { data: profile } = await supabase
            .from('business_profiles')
            .select('owner_user_id, vapi_assistant_id, company_name')
            .eq('owner_user_id', userId)
            .maybeSingle();

        if (!profile || !profile.vapi_assistant_id) {
            return res.status(400).json({ error: "No assistant configured." });
        }

        // Save inbound message
        await supabase.from('messages').insert({
            owner_user_id: userId,
            customer_phone: customerPhone || 'WebClient',
            direction: 'inbound',
            content: message
        });

        const vapiPayload = {
            assistantId: profile.vapi_assistant_id,
            messages: [{ role: "user", content: message }]
        };

        const vapiRes = await fetch(`${VAPI_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${VAPI_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(vapiPayload)
        });

        if (!vapiRes.ok) {
            return res.status(vapiRes.status).json({ error: await vapiRes.text() });
        }

        const vapiData = await vapiRes.json();
        const aiMessage = vapiData.choices?.[0]?.message?.content || "No reply from AI";

        // Save AI reply
        const { data: aiResponseRow } = await supabase.from('messages').insert({
            owner_user_id: userId,
            customer_phone: customerPhone || 'WebClient',
            direction: 'outbound_ai',
            content: aiMessage,
            vapi_chat_id: vapiData.id
        }).select().single();

        res.json({ success: true, reply: aiMessage, messageRow: aiResponseRow });
    } catch (err) {
        console.error("❌ Failed to create Vapi chat:", err);
        res.status(500).json({ error: err.message });
    }
};
