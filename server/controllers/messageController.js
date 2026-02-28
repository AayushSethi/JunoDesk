import { supabase } from '../config/supabase.js';
import { twilioClient } from '../config/twilio.js';

const VAPI_BASE_URL = 'https://api.vapi.ai';
const VAPI_TOKEN = process.env.VAPI_PRIVATE_KEY;

export const twilioSmsWebhook = async (req, res) => {
    try {
        const { From, To, Body } = req.body;
        console.log(`💬 Incoming SMS from ${From} to ${To}: ${Body}`);

        // 1. Find the business profile associated with this Twilio number (To)
        const { data: profile } = await supabase
            .from('business_profiles')
            .select('owner_user_id, vapi_assistant_id, company_name')
            .eq('vapi_phone_number', To)
            .maybeSingle();

        if (!profile) {
            console.error(`❌ No business found for Twilio number: ${To}`);
            return res.status(200).send('<Response></Response>'); // Acknowledge Twilio
        }

        const userId = profile.owner_user_id;

        // 2. Fetch recent conversation to get vapi_chat_id if available (to maintain context)
        const { data: lastMsg } = await supabase
            .from('messages')
            .select('vapi_chat_id')
            .eq('owner_user_id', userId)
            .eq('customer_phone', From)
            .not('vapi_chat_id', 'is', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        const vapiChatId = lastMsg?.vapi_chat_id;

        // 3. Save incoming message to our DB
        await supabase.from('messages').insert({
            owner_user_id: userId,
            customer_phone: From,
            direction: 'inbound',
            content: Body,
            vapi_chat_id: vapiChatId || null
        });

        // Ensure we send 200 OK early to Twilio to prevent timeouts,
        // but we can't if we want to return TwiML. Actually we can just send empty TwiML 
        // and send the outbound message asynchronously via Twilio API.
        res.set('Content-Type', 'text/xml');
        res.status(200).send('<Response></Response>');

        // --- ASYNC VAPI & OUTBOUND HANDLING ---
        if (profile.vapi_assistant_id) {
            console.log(`🤖 Passing message to Vapi Assistant: ${profile.vapi_assistant_id}`);

            const vapiPayload = {
                assistantId: profile.vapi_assistant_id,
                input: Body
            };
            if (vapiChatId) {
                vapiPayload.previousChatId = vapiChatId;
            }

            try {
                const vapiRes = await fetch(`${VAPI_BASE_URL}/chat`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${VAPI_TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(vapiPayload)
                });

                if (vapiRes.ok) {
                    const vapiData = await vapiRes.json();

                    if (vapiData.output && vapiData.output.length > 0) {
                        const aiReply = vapiData.output[0].content || vapiData.output[0].message;
                        const newChatId = vapiData.id || vapiChatId;

                        console.log(`🤖 AI Reply: ${aiReply}`);

                        // Save AI reply to DB
                        await supabase.from('messages').insert({
                            owner_user_id: userId,
                            customer_phone: From,
                            direction: 'outbound_ai',
                            content: aiReply,
                            vapi_chat_id: newChatId
                        });

                        // Send via Twilio
                        await twilioClient.messages.create({
                            body: aiReply,
                            from: To,
                            to: From
                        });
                        console.log('✅ Sent AI reply via Twilio.');
                    }
                } else {
                    console.error('❌ Vapi Error:', await vapiRes.text());
                }
            } catch (err) {
                console.error('❌ Error processing Vapi chat:', err);
            }
        }

    } catch (err) {
        console.error('❌ Twilio SMS Webhook Error:', err);
        if (!res.headersSent) {
            res.status(500).send('Internal Server Error');
        }
    }
};

export const getMessages = async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ error: "Missing userId" });

        const { data: messages, error } = await supabase
            .from('messages')
            .select('*')
            .eq('owner_user_id', userId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        // Group messages by customer_phone
        const grouped = {};
        for (let m of messages) {
            if (!grouped[m.customer_phone]) {
                grouped[m.customer_phone] = { phone: m.customer_phone, history: [] };
            }
            grouped[m.customer_phone].history.push(m);
        }

        res.json({ success: true, conversations: Object.values(grouped) });
    } catch (err) {
        console.error("❌ Failed to fetch messages:", err);
        res.status(500).json({ error: err.message });
    }
};

export const sendManualMessage = async (req, res) => {
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

        // 2. Fetch previous chat ID if exists to keep AI context
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

        // Optional: We might want to inject this fake message into VAPI's context 
        // using chats API if we want AI to know we replied manually.
        // For now, Vapi context handles inputs best. 
        // In the future: could use /chats endpoint to inject assistant message.

        res.json({ success: true, message: newMsg });
    } catch (err) {
        console.error("❌ Failed to send manual message:", err);
        res.status(500).json({ error: err.message });
    }
};
