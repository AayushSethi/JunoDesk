
import dotenv from 'dotenv';
import { google } from 'googleapis';
import { supabase } from '../config/supabase.js';

dotenv.config();

/**
 * Get Authenticated Google Client (Handles Refresh)
 */
export async function getAuthenticatedClient(userId, profile) {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.SERVER_URL || 'http://localhost:3000'}/auth/google/callback`
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

/**
 * Fetch Upcoming Events (Next 48h)
 */
export async function getCalendarEvents(userId, profile) {
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
