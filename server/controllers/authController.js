
import { google } from 'googleapis';
import { supabase } from '../config/supabase.js';

export const devSignup = async (req, res) => {
    try {
        const { phone, email: providedEmail } = req.body;
        if (!phone) return res.status(400).json({ error: "Missing phone" });

        const phoneWithPlus = phone.startsWith('+') ? phone : `+1${phone}`;
        // If email is provided, use it. Otherwise falback to generated (used by dev bypass)
        const email = providedEmail ? providedEmail : `dev_${phone}@junodesk.dev`;
        const password = 'devpass_' + phone;

        console.log(`🔧 Dev Signup for: ${phoneWithPlus} (Email: ${email})`);

        let userId;
        let accessToken;
        let refreshToken;

        // 1. Try to sign in first (returning user perfectly matching email & password)
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
            email, password
        });

        if (signInData?.session) {
            userId = signInData.user.id;
            accessToken = signInData.session.access_token;
            refreshToken = signInData.session.refresh_token;
            console.log("✅ Existing dev user signed in:", userId);
        } else {
            // 2. Fetch all users because we might have a collision on either phone or email
            const { data: existingUsersData } = await supabase.auth.admin.listUsers();
            const allUsers = existingUsersData?.users || [];

            // Check collisions
            let existingUser = allUsers.find(u => u.email === email);
            if (!existingUser) {
                existingUser = allUsers.find(u => u.phone === phoneWithPlus);
            }

            if (existingUser) {
                // We found a collision! Let's forcefully overwrite the password and phone so dev mode continues
                console.log("📱 User collision found (email or phone), updating user for dev access:", existingUser.id);
                const { error: updateErr } = await supabase.auth.admin.updateUserById(existingUser.id, {
                    email,
                    phone: phoneWithPlus,
                    password,
                    email_confirm: true,
                    phone_confirm: true
                });

                if (updateErr) throw new Error("Updated user failed: " + updateErr.message);
                userId = existingUser.id;

                // Sign in with new credentials
                const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
                    email, password
                });
                if (loginErr) throw new Error("Updated user but login failed: " + loginErr.message);
                accessToken = loginData.session.access_token;
                refreshToken = loginData.session.refresh_token;
            } else {
                // 3. Create brand new user (no collision at all)
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

        res.send(`
            <html>
                <body>
                    <h2>Google Calendar Connected!</h2>
                    <p>You can safely close this window to continue your setup.</p>
                    <script>
                        setTimeout(() => { window.close(); }, 1500);
                    </script>
                </body>
            </html>
        `);

    } catch (err) {
        console.error("❌ Google Auth Error:", err);
        res.status(500).send("Authentication Failed: " + err.message);
    }
};
