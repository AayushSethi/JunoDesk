
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import router from './server/routes/index.js';

// Initialize Environment Variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Mount Routes
app.use('/', router);

// Start Server
app.listen(PORT, () => {
    console.log(`🧠 Brain running on http://localhost:${PORT}`);

    // Log Supabase status if available (checking env var directly for simplicity)
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    if (supabaseUrl) console.log(`🔌 Supabase configuration detected.`);
});
