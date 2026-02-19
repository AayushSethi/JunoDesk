
import twilio from 'twilio';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars from root .env file
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // MUST use Service Role Key for admin tasks
const twilioSid = process.env.TWILIO_ACCOUNT_SID;
const twilioToken = process.env.TWILIO_AUTH_TOKEN;

if (!supabaseUrl || !supabaseServiceKey || !twilioSid || !twilioToken) {
    console.error("❌ Missing required environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const client = new twilio(twilioSid, twilioToken);

const AMOUNT_TO_BUY = parseInt(process.argv[2]) || 2; // Default to buying 2 numbers
const VAPI_WEBHOOK = 'https://api.vapi.ai/twilio/inbound_call';

const restockNumbers = async () => {
    console.log(`🚀 Starting Restock for ${AMOUNT_TO_BUY} numbers...`);

    try {
        // 1. Check current pool size
        const { count, error: countError } = await supabase
            .from('backup_numbers')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'available');

        if (countError) throw countError;
        console.log(`📊 Current Backup Pool Size: ${count} numbers.`);

        // 2. Buy Numbers Loop
        for (let i = 0; i < AMOUNT_TO_BUY; i++) {
            console.log(`\n🛍️  Buying Number ${i + 1}/${AMOUNT_TO_BUY}...`);

            // Search for US numbers (Voice & SMS capable)
            const available = await client.availablePhoneNumbers('US').local.list({
                limit: 1,
                smsEnabled: true,
                voiceEnabled: true
            });

            if (!available.length) {
                console.warn("⚠️ No numbers available via Twilio API right now.");
                continue;
            }

            const candidate = available[0];

            // Purchase
            const bought = await client.incomingPhoneNumbers.create({
                phoneNumber: candidate.phoneNumber,
                friendlyName: `JunoDesk Backup Pool - ${new Date().toISOString()}`,
                voiceUrl: VAPI_WEBHOOK  // Auto-configure for Vapi
            });

            console.log(`✅ Paid & Acquired: ${bought.phoneNumber} (${bought.sid})`);

            // Save to DB
            const { error: insertError } = await supabase
                .from('backup_numbers')
                .insert([{
                    phone_number: bought.phoneNumber,
                    twilio_sid: bought.sid,
                    status: 'available'
                }]);

            if (insertError) {
                console.error(`❌ Failed to save ${bought.phoneNumber} to DB!`, insertError.message);
                // Optional: Release number if DB save fails to save money? 
                // client.incomingPhoneNumbers(bought.sid).remove();
            } else {
                console.log(`💾 Saved to Backup Pool.`);
            }
        }

        // Final Status
        const { count: finalCount } = await supabase
            .from('backup_numbers')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'available');

        console.log(`\n🎉 Restock Complete! New Pool Size: ${finalCount}`);

    } catch (err) {
        console.error("❌ Fatal Error during restock:", err.message);
        process.exit(1);
    }
};

restockNumbers();
