
import { supabase } from '../config/supabase.js';
import { getCalendarEvents } from './googleService.js';

/**
 * Fetch full context for a user
 */
export async function getContextForUser(userId) {
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

    const timezone = profile.timezone || 'America/New_York';
    return { profile, greeting, endingMessage, instructions, commonWords, knowledge, websiteContent, voiceId, calendarContext, timezone };
}
