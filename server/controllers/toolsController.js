
import { google } from 'googleapis';
import { supabase } from '../config/supabase.js';
import { getAuthenticatedClient } from '../services/googleService.js';
import { twilioClient } from '../config/twilio.js';

export const checkAvailability = async (req, res) => {
    console.log("🛠️ Tool Call: checkAvailability", req.body);
    try {
        const { message } = req.body;
        const toolCall = message.toolCalls[0];
        const assistantId = message.assistant?.id || message.call?.assistantId;
        const { data: profile } = await supabase.from('business_profiles').select('*').eq('vapi_assistant_id', assistantId).single();

        if (!profile || !profile.google_refresh_token) {
            return res.json({ results: [{ toolCallId: toolCall.id, result: "Error: calendar_not_connected" }] });
        }

        const auth = await getAuthenticatedClient(profile.owner_user_id, profile);
        const calendar = google.calendar({ version: 'v3', auth });

        let args = toolCall.function.arguments;
        if (typeof args === 'string') try { args = JSON.parse(args); } catch (e) { }

        const start = new Date(args.startTime);
        const end = new Date(start.getTime() + (args.durationMinutes || 30) * 60000);

        const timezone = profile.timezone || 'America/New_York';
        const freeBusy = await calendar.freebusy.query({
            requestBody: {
                timeMin: start.toISOString(),
                timeMax: end.toISOString(),
                timeZone: timezone,
                items: [{ id: profile.google_calendar_id || 'primary' }]
            }
        });

        const busySlots = freeBusy.data.calendars[profile.google_calendar_id || 'primary'].busy;
        return res.json({
            results: [{
                toolCallId: toolCall.id,
                result: busySlots.length > 0 ? `Busy. ${busySlots.length} conflict(s).` : "Available."
            }]
        });

    } catch (e) {
        console.error("❌ Availability Check Error:", e);
        res.json({ results: [{ toolCallId: req.body.message.toolCalls[0].id, result: "Error checking." }] });
    }
};

export const bookAppointment = async (req, res) => {
    console.log("🛠️ Tool Call: bookAppointment", req.body);
    try {
        const { message } = req.body;
        const toolCall = message.toolCalls[0];
        const assistantId = message.assistant?.id || message.call?.assistantId;
        const { data: profile } = await supabase.from('business_profiles').select('*').eq('vapi_assistant_id', assistantId).single();

        if (!profile || !profile.google_refresh_token) {
            return res.json({ results: [{ toolCallId: toolCall.id, result: "Error: calendar_not_connected" }] });
        }

        const auth = await getAuthenticatedClient(profile.owner_user_id, profile);
        const calendar = google.calendar({ version: 'v3', auth });

        let args = toolCall.function.arguments;
        if (typeof args === 'string') try { args = JSON.parse(args); } catch (e) { }

        const start = new Date(args.startTime);
        const end = new Date(start.getTime() + (args.durationMinutes || 30) * 60000);

        const eventResponse = await calendar.events.insert({
            calendarId: profile.google_calendar_id || 'primary',
            requestBody: {
                summary: args.summary,
                start: { dateTime: start.toISOString(), timeZone: profile.timezone || 'America/New_York' },
                end: { dateTime: end.toISOString(), timeZone: profile.timezone || 'America/New_York' }
            }
        });

        await supabase.from('bookings').insert({
            owner_user_id: profile.owner_user_id,
            call_id: message.call?.id,
            event_id: eventResponse.data.id,
            event_link: eventResponse.data.htmlLink,
            summary: args.summary,
            start_time: start.toISOString()
        });

        // SMS Notification
        const customerNumber = message.customer?.number || message.call?.customer?.number;
        if (customerNumber && profile.vapi_phone_number) {
            try {
                await twilioClient.messages.create({
                    body: `Meeting confirmed: "${args.summary}" at ${start.toLocaleString()}.`,
                    from: profile.vapi_phone_number,
                    to: customerNumber
                });
            } catch (e) { }
        }

        res.json({ results: [{ toolCallId: toolCall.id, result: "Success." }] });

    } catch (e) {
        console.error("❌ Booking Error:", e);
        res.json({ results: [{ toolCallId: req.body.message.toolCalls[0].id, result: "Failed to book." }] });
    }
};

export const getCurrentTime = (req, res) => {
    const now = new Date();
    res.json({
        results: [{
            toolCallId: req.body.message?.toolCalls?.[0]?.id,
            result: `Current Time: ${now.toLocaleString('en-US', { timeZone: 'America/New_York' })} ET.`
        }]
    });
};
