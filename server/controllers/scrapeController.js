
import * as cheerio from 'cheerio';
import { supabase } from '../config/supabase.js';

export const scrapeWebsite = async (req, res) => {
    try {
        const { url, userId } = req.body;
        if (!url) return res.status(400).json({ error: "Missing URL" });

        console.log(`🕷️ Scraping: ${url}`);
        const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JunoBot/1.0)' } });
        if (!response.ok) throw new Error("Failed to fetch website");

        const html = await response.text();
        const $ = cheerio.load(html);

        $('script, style, noscript, iframe, svg, nav, footer, header').remove();

        const bodyText = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 8000);
        const title = $('title').text().trim();
        const fullContent = `Source: ${url}\nTitle: ${title}\n\nContent:\n${bodyText}`;

        if (userId) {
            // Simple robust fix: Delete old, add new
            await supabase.from('business_info').delete()
                .eq('owner_user_id', userId)
                .eq('type', 'website_content');

            await supabase.from('business_info').insert({
                owner_user_id: userId,
                type: 'website_content',
                content: { text: fullContent, source: 'website_scrape', url, title }
            });
        }

        res.json({ success: true, text: fullContent, title });
    } catch (e) {
        console.error("Scrape Error:", e);
        res.status(500).json({ error: e.message });
    }
};
