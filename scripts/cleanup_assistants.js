import dotenv from 'dotenv';
dotenv.config();

const VAPI_TOKEN = process.env.VAPI_PRIVATE_KEY;
const VAPI_BASE_URL = 'https://api.vapi.ai';

if (!VAPI_TOKEN) {
    console.error('❌ No VAPI_PRIVATE_KEY found in .env');
    process.exit(1);
}

async function cleanup() {
    console.log("🧹 Starting Vapi Cleanup...");

    try {
        // 1. Fetch
        const res = await fetch(`${VAPI_BASE_URL}/assistant`, {
            headers: { 'Authorization': `Bearer ${VAPI_TOKEN}` }
        });
        const assistants = await res.json();

        // 2. Sort Newest First
        assistants.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        if (assistants.length === 0) {
            console.log("No assistants found.");
            return;
        }

        const newest = assistants[0];
        const others = assistants.slice(1);

        console.log(`\n✅ KEEPING: [${newest.id}] ${newest.name} (Created: ${new Date(newest.createdAt).toLocaleString()})`);

        if (others.length === 0) {
            console.log("No other assistants to delete.");
            return;
        }

        console.log(`\n🗑️  Found ${others.length} old assistants to delete:`);

        // 3. Delete loop
        for (const assistant of others) {
            process.stdout.write(`   Deleting [${assistant.id}] ${assistant.name}... `);
            const delRes = await fetch(`${VAPI_BASE_URL}/assistant/${assistant.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${VAPI_TOKEN}` }
            });

            if (delRes.ok) {
                console.log("Done");
            } else {
                console.log("Failed (" + delRes.status + ")");
            }
        }

        console.log("\n✨ Cleanup Complete!");

    } catch (err) {
        console.error("Error:", err);
    }
}

cleanup();
