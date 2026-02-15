
import { google } from 'googleapis';
import { supabase } from '../config/supabase.js';

export const devSignup = async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) return res.status(400).json({ error: "Missing phone" });

        const phoneWithPlus = phone.startsWith('+') ? phone : `+1${phone}`;
        const email = `dev_${phone}@junodesk.dev`;
        const password = 'devpass_' + phone;

        console.log(`🔧 Dev Signup for: ${phoneWithPlus}`);

        let userId;
        let accessToken;
        let refreshToken;

        // 1. Try to sign in first (returning user)
        const { data: signInData } = await supabase.auth.signInWithPassword({
            email, password
        });

        if (signInData?.session) {
            userId = signInData.user.id;
            accessToken = signInData.session.access_token;
            refreshToken = signInData.session.refresh_token;
            console.log("✅ Existing dev user signed in:", userId);
        } else {
            // 2. Check if phone is already used by another auth user
            const { data: existingUsers } = await supabase.auth.admin.listUsers();
            const existingByPhone = existingUsers?.users?.find(u => u.phone === phoneWithPlus);

            if (existingByPhone) {
                // Phone exists on another user - update that user's email/password for dev login
                console.log("📱 Phone already registered, updating user for dev access:", existingByPhone.id);
                await supabase.auth.admin.updateUser(existingByPhone.id, {
                    email,
                    password,
                    email_confirm: true
                });
                userId = existingByPhone.id;

                // Sign in with new credentials
                const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
                    email, password
                });
                if (loginErr) throw new Error("Updated user but login failed: " + loginErr.message);
                accessToken = loginData.session.access_token;
                refreshToken = loginData.session.refresh_token;
            } else {
                // 3. Create brand new user (no phone conflict)
                const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
                    email,
                    password,
                    email_confirm: true,
                    phone: phoneWithPlus,
                    phone_confirm: true
                });

                if (createErr) throw new Error(createErr.message);

                userId = newUser.user.id;
                console.log("✅ Created dev user:", userId);

                // Sign in to get tokens
                const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
                    email, password
                });
                if (loginErr) throw new Error("Created user but login failed: " + loginErr.message);
                accessToken = loginData.session.access_token;
                refreshToken = loginData.session.refresh_token;
            }
        }

        // 4. Ensure profile exists
        const { data: existingProfile } = await supabase
            .from('business_profiles')
            .select('id')
            .eq('owner_user_id', userId)
            .maybeSingle();

        if (!existingProfile) {
            await supabase.from('business_profiles').insert({
                owner_user_id: userId,
                user_phone_number: phoneWithPlus
            });
            console.log("✅ Created business profile for:", userId);
        } else {
            await supabase.from('business_profiles')
                .update({ user_phone_number: phoneWithPlus })
                .eq('owner_user_id', userId);
            console.log("✅ Updated phone in profile for:", userId);
        }

        res.json({
            success: true,
            userId,
            email,
            accessToken,
            refreshToken,
            phone: phoneWithPlus
        });

    } catch (err) {
        console.error("❌ Dev Signup Failed (Logic Error):", err);
        const errorMsg = err.message || JSON.stringify(err) || "Unknown Error";
        res.status(500).json({ error: errorMsg });
    }
};

export const googleAuthUrl = (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.SERVER_URL || 'http://localhost:3000'}/auth/google/callback`
    );

    const scopes = [
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/calendar.events'
    ];

    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline', // Critical for receiving a refresh token
        scope: scopes,
        state: userId, // Pass userId as state to identify user in callback
        prompt: 'consent' // Force consent to ensure we get a refresh token
    });

    res.json({ url });
};

export const googleAuthCallback = async (req, res) => {
    const { code, state: userId } = req.query;

    if (!code || !userId) {
        return res.status(400).send("Invalid Request: Missing code or state (userId)");
    }

    try {
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            `${process.env.SERVER_URL || 'http://localhost:3000'}/auth/google/callback`
        );

        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        console.log(`✅ Acquired Google Tokens for User: ${userId}`);

        const updates = {
            google_access_token: tokens.access_token,
            google_token_expires_at: new Date(tokens.expiry_date).toISOString(),
            google_calendar_id: 'primary',
            ...(tokens.refresh_token && { google_refresh_token: tokens.refresh_token })
        };

        const { error } = await supabase
            .from('business_profiles')
            .update(updates)
            .eq('owner_user_id', userId);

        if (error) {
            console.error("❌ Failed to save Google Tokens:", error);
            return res.status(500).send("Database Error saving tokens.");
        }

        res.redirect(process.env.CLIENT_URL || 'http://localhost:5173/');

    } catch (err) {
        console.error("❌ Google Auth Error:", err);
        res.status(500).send("Authentication Failed: " + err.message);
    }
};
