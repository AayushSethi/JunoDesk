import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Initialize Environment Variables
dotenv.config();

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// --- Supabase Setup ---
// We will look for these in a .env file
const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL_HERE';
const supabaseKey = process.env.SUPABASE_KEY || 'YOUR_SUPABASE_ANON_KEY_HERE';

let supabase = null;
if (supabaseUrl && supabaseUrl.startsWith('http')) {
    supabase = createClient(supabaseUrl, supabaseKey);
} else {
    console.log("⚠️  Supabase URL missing or invalid. Server running in offline mode.");
}

// --- Routes ---

// Health Check
app.get('/', (req, res) => {
    res.send('AI Receptionist Brain is Active 🧠');
});

// GET Calls
app.get('/api/calls', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('calls')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('Error fetching calls:', err.message);
        // Fallback for demo if no Supabase connection
        res.json([]);
    }
});

// GET Texts
app.get('/api/texts', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('texts')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('Error fetching texts:', err.message);
        res.json([]);
    }
});

// GET Settings
app.get('/api/settings', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('receptionist_settings')
            .select('*')
            .limit(1)
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('Error fetching settings:', err.message);
        // Fallback defaults
        res.json({
            company_name: 'LCE',
            industry: 'Tech',
            description: '',
            greeting_message: 'Hello!',
            knowledge_base: [],
            custom_vocabulary: []
        });
    }
});

// UPDATE Settings
app.post('/api/settings', async (req, res) => {
    const settings = req.body;
    try {
        // Simple singleton update: we assume we are always editing row with ID 1
        // In a real multi-user app, we'd use user_id
        const { data, error } = await supabase
            .from('receptionist_settings')
            .update(settings)
            .eq('id', 1) // Updating the single 'global' settings row
            .select();

        if (error) throw error;
        res.json(data[0]);
    } catch (err) {
        console.error('Error updating settings:', err.message);
        res.status(500).json({ error: 'Failed to save settings' });
    }
});

// Simulate Incoming Call (Write to DB)
app.post('/api/simulate/call', async (req, res) => {
    const newCall = {
        name: 'New Caller',
        number: '+1 (555) 019-2834',
        status: 'unread',
        summary: 'Incoming simulation...',
        transcript: []
    };

    try {
        const { data, error } = await supabase
            .from('calls')
            .insert([newCall])
            .select();

        if (error) throw error;
        res.json(data[0]);
    } catch (err) {
        console.error('Error simulating call:', err.message);
        // Fallback for demo
        res.status(500).json({ error: 'Failed to simulate call' });
    }
});

// START SERVER
app.listen(PORT, () => {
    console.log(`🧠 Brain running on http://localhost:${PORT}`);
    console.log(`🔌 Supabase connected to: ${supabaseUrl}`);
});
