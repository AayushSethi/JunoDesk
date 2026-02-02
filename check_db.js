import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Use VITE_ prefix if standard is missing
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing credentials in .env");
    console.log("URL:", supabaseUrl);
    console.log("Key:", supabaseKey ? "Found" : "Missing");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Checking business_info for website_content...");
    const { data, error } = await supabase
        .from('business_info')
        .select('*')
        .eq('type', 'website_content');

    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Rows found:", data.length);
        if (data.length > 0) {
            console.log("First row content preview:", JSON.stringify(data[0].content).substring(0, 200));
            console.log("Owner ID:", data[0].owner_user_id);
        } else {
            console.log("No rows found with type='website_content'.");
            // Check recent rows
            const { data: all } = await supabase.from('business_info').select('type, owner_user_id, created_at').order('created_at', { ascending: false }).limit(5);
            console.log("Most recent 5 rows types:", all);
        }
    }
}

check();
