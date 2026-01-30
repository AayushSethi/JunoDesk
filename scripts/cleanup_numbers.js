import dotenv from 'dotenv';
dotenv.config();

const VAPI_TOKEN = process.env.VAPI_PRIVATE_KEY;
const VAPI_BASE_URL = 'https://api.vapi.ai';

// The one number we want to KEEP (from your successful provisioning)
// You mentioned getting +1 (847) 972-8282
const KEEP_NUMBER = "+18479728282";

if (!VAPI_TOKEN) {
    console.error('❌ No VAPI_PRIVATE_KEY found in .env');
    process.exit(1);
}

async function cleanupNumbers() {
    console.log("☎️  Starting Phone Number Cleanup...");

    try {
        // 1. Fetch Numbers
        const res = await fetch(`${VAPI_BASE_URL}/phone-number`, {
            headers: { 'Authorization': `Bearer ${VAPI_TOKEN}` }
        });

        if (!res.ok) throw new Error(`Fetch failed: ${res.statusText}`);

        const numbers = await res.json();

        if (numbers.length === 0) {
            console.log("No numbers found.");
            return;
        }

        console.log(`Found ${numbers.length} numbers total.`);

        // 2. Identify Log
        const toKeep = numbers.find(n => n.number === KEEP_NUMBER);
        const toDelete = numbers.filter(n => n.number !== KEEP_NUMBER);

        if (toKeep) {
            console.log(`\n✅ SAFELY KEEPING: ${toKeep.number} (ID: ${toKeep.id})`);
        } else {
            console.warn(`\n⚠️  WARNING: Could not find the active number ${KEEP_NUMBER} in the list! NOT deleting anything until confirmed.`);
            // Just for safety, listing all found so you can confirm which to delete if the format is different
            numbers.forEach(n => console.log(`   Found: ${n.number}`));
            return // Safety exit
        }

        if (toDelete.length === 0) {
            console.log("No other numbers to delete.");
            return;
        }

        console.log(`\n🗑️  Found ${toDelete.length} old numbers to delete:`);

        // 3. Delete Loop
        for (const phone of toDelete) {
            process.stdout.write(`   Deleting ${phone.number}... `);
            const delRes = await fetch(`${VAPI_BASE_URL}/phone-number/${phone.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${VAPI_TOKEN}` }
            });

            if (delRes.ok) {
                console.log("Done");
            } else {
                console.log("Failed (" + delRes.status + ")");
            }

            // Tiny delay to be nice to API
            await new Promise(r => setTimeout(r, 200));
        }

        console.log("\n✨ Phone Cleanup Complete!");

    } catch (err) {
        console.error("Error:", err);
    }
}

cleanupNumbers();
