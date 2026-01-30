import dotenv from 'dotenv';
dotenv.config();

const VAPI_TOKEN = process.env.VAPI_PRIVATE_KEY;

if (!VAPI_TOKEN) {
    console.error('❌ No VAPI_PRIVATE_KEY found in .env');
    process.exit(1);
}

const VAPI_BASE_URL = 'https://api.vapi.ai';

async function cleanup() {
    console.log("🔍 Fetching Vapi assistants...");

    try {
        const res = await fetch(`${VAPI_BASE_URL}/assistant`, {
            headers: {
                'Authorization': `Bearer ${VAPI_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        if (!res.ok) {
            throw new Error(`Failed to fetch: ${res.statusText}`);
        }

        const assistants = await res.json();
        console.log(`\nFound ${assistants.length} assistants in total.`);

        // Sort by creation time (newest first)
        assistants.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        console.log("\n--- Assistants List ---");
        assistants.forEach((a, index) => {
            console.log(`${index + 1}. [${a.id}] ${a.name || 'Unnamed'} (Created: ${new Date(a.createdAt).toLocaleString()})`);
        });

    } catch (err) {
        console.error("Error:", err.message);
    }
}

cleanup();
