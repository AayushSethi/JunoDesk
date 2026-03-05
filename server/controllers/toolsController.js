
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

        // Support both Range Query (new) and Specific Slot Check (legacy/strict)
        let paramStart = args.queryStartDate || args.startTime;
        let paramEnd = args.queryEndDate; // Optional, might be missing if legacy

        if (!paramStart) throw new Error("Missing start time");

        const start = new Date(paramStart);
        // If end is missing, assume it's a specific slot check of duration or default 30m
        const end = paramEnd
            ? new Date(paramEnd)
            : new Date(start.getTime() + (args.durationMinutes || 30) * 60000);

        const timezone = profile.timezone || 'America/New_York';

        // 1. Fetch Busy Intervals
        const freeBusy = await calendar.freebusy.query({
            requestBody: {
                timeMin: start.toISOString(),
                timeMax: end.toISOString(),
                timeZone: timezone,
                items: [{ id: profile.google_calendar_id || 'primary' }]
            }
        });

        const busySlots = freeBusy.data.calendars[profile.google_calendar_id || 'primary'].busy;

        // 2. Logic: Range Search vs Spot Check
        const isRangeSearch = !!(args.queryStartDate && args.queryEndDate);

        if (!isRangeSearch) {
            // Legacy/Strict Spot Check
            const conflict = busySlots.length > 0;
            return res.json({
                results: [{
                    toolCallId: toolCall.id,
                    result: conflict ? `Busy. ${busySlots.length} conflict(s).` : "Available."
                }]
            });
        }

        // 3. Smart Slot Finding (Range Search)
        // We have a window (e.g. 1pm to 4pm). We want to find chunks of [duration] minutes.
        const durationMs = (args.durationMinutes || 30) * 60000;
        const availableSlots = [];
        let cursor = start.getTime();
        const endWindow = end.getTime();

        while (cursor + durationMs <= endWindow) {
            const slotStart = cursor;
            const slotEnd = cursor + durationMs;

            // Check if this candidate slot overlaps with any busy slot
            const isBusy = busySlots.some(busy => {
                const bStart = new Date(busy.start).getTime();
                const bEnd = new Date(busy.end).getTime();
                return (slotStart < bEnd) && (slotEnd > bStart);
            });

            if (!isBusy) {
                availableSlots.push(new Date(slotStart).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    timeZone: timezone
                }));
                // Limit to 5 suggestions to avoid token overflow
                if (availableSlots.length >= 5) break;
            }

            // Step forward by 30 mins (standard grid) or duration
            cursor += 30 * 60000;
        }

        const resultText = availableSlots.length > 0
            ? `Available slots: ${availableSlots.join(", ")}.`
            : "No availability in that window.";

        return res.json({
            results: [{
                toolCallId: toolCall.id,
                result: resultText
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

        const customerNumber = message.customer?.number || message.call?.customer?.number || 'Unknown Number';
        const customerName = args.name || "Guest";

        const eventDescription = `AI Receptionist Booking
Caller Name: ${customerName}
Caller Number: ${customerNumber}
Summary: ${args.summary}`;

        const eventResponse = await calendar.events.insert({
            calendarId: profile.google_calendar_id || 'primary',
            requestBody: {
                summary: args.summary,
                description: eventDescription,
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
        if (customerNumber !== 'Unknown Number' && profile.vapi_phone_number) {
            try {
                const tz = profile.timezone || 'America/New_York';
                const formattedDate = start.toLocaleString('en-US', {
                    weekday: 'short', month: 'short', day: 'numeric',
                    hour: 'numeric', minute: '2-digit', timeZone: tz
                });

                const smsBody = `Hello! Your appointment with ${profile.company_name || 'us'} is confirmed for ${formattedDate}. Topic: ${args.summary}. See you then!`;

                await twilioClient.messages.create({
                    body: smsBody,
                    from: profile.vapi_phone_number,
                    to: customerNumber
                });
            } catch (e) {
                console.error("SMS Failed:", e.message);
            }
        }

        res.json({ results: [{ toolCallId: toolCall.id, result: "Success." }] });

    } catch (e) {
        console.error("❌ Booking Error:", e);
        res.json({ results: [{ toolCallId: req.body.message.toolCalls[0].id, result: "Failed to book." }] });
    }
};

export const getCurrentTime = async (req, res) => {
    try {
        const assistantId = req.body.message?.assistantId || req.body.call?.assistantId;
        let timezone = 'America/New_York';

        if (assistantId) {
            const { data: profile } = await supabase
                .from('business_profiles')
                .select('timezone')
                .eq('vapi_assistant_id', assistantId)
                .maybeSingle();

            if (profile && profile.timezone) timezone = profile.timezone;
        }

        const now = new Date();
        const timestr = now.toLocaleString('en-US', { timeZone: timezone, dateStyle: 'full', timeStyle: 'short' });

        res.json({
            results: [{
                toolCallId: req.body.message?.toolCalls?.[0]?.id,
                result: `Current Date/Time: ${timestr} (${timezone}).`
            }]
        });
    } catch (e) {
        console.error("getCurrentTime Error:", e);
        res.status(500).json({ error: e.message });
    }
};
