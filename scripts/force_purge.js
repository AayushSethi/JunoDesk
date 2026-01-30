import dotenv from 'dotenv';
dotenv.config();

const VAPI_TOKEN = process.env.VAPI_PRIVATE_KEY;
const VAPI_BASE_URL = 'https://api.vapi.ai';

// The ONLY number suffix we want to keep
const KEEP_SUFFIX = "282";

if (!VAPI_TOKEN) {
    console.error('❌ No VAPI_PRIVATE_KEY found in .env');
    process.exit(1);
}

async function forcePurge() {
    console.log("☠️  STARTING FORCE PURGE...");

    // --- 1. CLEAN PHONES ---
    try {
        const res = await fetch(`${VAPI_BASE_URL}/phone-number`, { headers: { 'Authorization': `Bearer ${VAPI_TOKEN}` } });
        const numbers = await res.json();

        console.log(`\n📞 checking ${numbers.length} numbers...`);
        for (const n of numbers) {
            if (n.number && n.number.endsWith(KEEP_SUFFIX)) {
                console.log(`✅ KEEPING Phone: ${n.number}`);
            } else {
                process.stdout.write(`❌ DELETING Phone: ${n.number}... `);
                await fetch(`${VAPI_BASE_URL}/phone-number/${n.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${VAPI_TOKEN}` } });
                console.log("Deleted");
                await new Promise(r => setTimeout(r, 200)); // Rate limit safety
            }
        }
    } catch (e) {
        console.error("Phone Error:", e);
    }

    // --- 2. CLEAN ASSISTANTS ---
    // Strategy: We can't easily query which assistant is attached to which phone without checking the phone objects.
    // BUT usually the newest assistant is the "Real" one. 
    // Let's rely on the creation date again but be more aggressive if there are older ones.
    try {
        const res = await fetch(`${VAPI_BASE_URL}/assistant`, { headers: { 'Authorization': `Bearer ${VAPI_TOKEN}` } });
        const assistants = await res.json();
        assistants.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Newest first

        console.log(`\n🤖 checking ${assistants.length} assistants...`);

        if (assistants.length > 0) {
            const keeper = assistants[0];
            const trash = assistants.slice(1);

            console.log(`✅ KEEPING Assistant: [${keeper.id}] ${keeper.name} (Newest)`);

            for (const a of trash) {
                process.stdout.write(`❌ DELETING Assistant: [${a.id}] ${a.name}... `);
                await fetch(`${VAPI_BASE_URL}/assistant/${a.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${VAPI_TOKEN}` } });
                console.log("Deleted");
                await new Promise(r => setTimeout(r, 200));
            }
        }
    } catch (e) {
        console.error("Assistant Error:", e);
    }

    console.log("\n✨ Force Purge Complete!");
}

forcePurge();
