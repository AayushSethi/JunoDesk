import React, { useState, useEffect } from 'react';


import {
    Phone, MessageSquare, Menu, RefreshCw, ChevronRight, User,
    ChevronLeft, Settings, HelpCircle, PhoneCall,
    Calendar, Bell, Edit2, MapPin, Clock, Briefcase, Globe, Plus, X,
    ArrowRight, Check, Share2, Search, Mic, Play, Pause, Copy, Info, ChevronDown,
    CreditCard, UserPlus, Star, ArrowUpRight, XCircle, MessageCircle, LifeBuoy, AudioWaveform, LogOut,
    ShieldAlert, Archive, Trash2, Activity, Inbox, Users, PhoneOff, Lock, FileText, CalendarCheck, LayoutGrid
} from 'lucide-react';
import { supabase } from './supabase';

import hopeAvatar from './assets/avatars/Avatars/Hope.jpg';
import jessicaAvatar from './assets/avatars/Avatars/Jessica.jpg';
import lilyAvatar from './assets/avatars/Avatars/Lily.jpg';
import billAvatar from './assets/avatars/Avatars/Bill.jpg';
import jeffAvatar from './assets/avatars/Avatars/Jeff.jpg';
import markAvatar from './assets/avatars/Avatars/Mark.jpg';

import hopeVoice from './assets/avatars/Voices/Hope.mp3';
import jessicaVoice from './assets/avatars/Voices/Jessica.mp3';
import lilyVoice from './assets/avatars/Voices/Lily.mp3';
import billVoice from './assets/avatars/Voices/Bill.mp3';
import jeffVoice from './assets/avatars/Voices/Jeff.mp3';
import markVoice from './assets/avatars/Voices/Mark.mp3';

const FALLBACK_VOICES = [
    { id: 'cgSgspJ2msm6clMCkdW9', name: 'Hope', provider: '11labs', avatar: hopeAvatar, preview: hopeVoice },
    { id: 'flHkNRp1BlvT73UL6gyz', name: 'Jessica', provider: '11labs', avatar: jessicaAvatar, preview: jessicaVoice },
    { id: 'qBDvhofpxp92JgXJxDjB', name: 'Lily', provider: '11labs', avatar: lilyAvatar, preview: lilyVoice },
    { id: 'iiidtqDt9FBdT1vfBluA', name: 'Bill', provider: '11labs', avatar: billAvatar, preview: billVoice },
    { id: '94zOad0g7T7K4oa7zhDq', name: 'Jeff', provider: '11labs', avatar: jeffAvatar, preview: jeffVoice },
    { id: 'UgBBYS2sOqTuMpoF3BR0', name: 'Mark', provider: '11labs', avatar: markAvatar, preview: markVoice }
];

const LANGUAGES = [
    { name: 'English', flag: '🇺🇸' }, { name: 'Spanish', flag: '🇪🇸' },
    { name: 'French', flag: '🇫🇷' }, { name: 'Portuguese', flag: '🇵🇹' },
    { name: 'Italian', flag: '🇮🇹' }, { name: 'German', flag: '🇩🇪' },
    { name: 'Japanese', flag: '🇯🇵' }, { name: 'Hindi', flag: '🇮🇳' },
    { name: 'Dutch', flag: '🇳🇱' }
];

export default function App() {
    // --- State ---
    // --- State ---
    const [session, setSession] = useState(null);
    const [authLoading, setAuthLoading] = useState(false);
    const [calls, setCalls] = useState([]);


    // --- Navigation State ---
    const [view, setView] = useState('auth'); // auth, onboarding, intro, inbox, receptionist, settings, call-detail, manage-plan, account
    const [selectedCall, setSelectedCall] = useState(null);
    const [playingVoiceId, setPlayingVoiceId] = useState(null); // Used for voice preview AND call recording playback
    const [audioProgress, setAudioProgress] = useState(0); // 0 to 100 for call recording progress
    // --- Auth Effect ---
    useEffect(() => {
        const checkUser = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                setSession(session);
                if (session) {
                    // 1. Try to find profile by User ID (standard)
                    let { data: profile } = await supabase
                        .from('business_profiles')
                        .select('id, vapi_phone_number, company_name, user_phone_number')
                        .eq('owner_user_id', session.user.id)
                        .maybeSingle();

                    // 2. Fallback: Try to find profile by Phone Number (if ID didn't match)
                    if (!profile && session.user.phone) {
                        const { data: phoneProfile } = await supabase
                            .from('business_profiles')
                            .select('id, vapi_phone_number, company_name, user_phone_number')
                            .eq('user_phone_number', session.user.phone)
                            .maybeSingle();

                        if (phoneProfile) {
                            profile = phoneProfile;
                            // Update the old profile to link to the new User ID (the "Merge")
                            await supabase
                                .from('business_profiles')
                                .update({ owner_user_id: session.user.id })
                                .eq('id', profile.id);
                        }
                    }

                    if (profile && profile.company_name) {
                        setView('receptionist');
                    } else if (session) {
                        // For demo: if logged in but no profile, go to inbox
                        setView('inbox');
                    }
                } else {
                    // Start at the Auth Landing Page
                    setView('auth');
                }
            } catch (error) {
                console.error('Session check error:', error);
                setView('auth'); // Default to landing on error
            }
        };
        checkUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            // SIGNED_IN is handled by handleAuth directly, so we only handle SIGNED_OUT here
            // This avoids race conditions with the explicit login flow
            if (_event === 'SIGNED_OUT') {
                setView('auth');
            }
            // For SIGNED_IN, TOKEN_REFRESHED, INITIAL_SESSION - let the explicit handlers manage view
        });

        return () => subscription.unsubscribe();
    }, []);


    // --- Receptionist Settings State ---
    const [greeting, setGreeting] = useState("");
    const [activeReceptionistTab, setActiveReceptionistTab] = useState('instructions'); // 'instructions', 'knowledge', 'phone'
    const [isEditingReceptionist, setIsEditingReceptionist] = useState(false);
    const [toast, setToast] = useState(null);
    const [toastAction, setToastAction] = useState(null);
    const [isForwardingSetupOpen, setIsForwardingSetupOpen] = useState(false);
    const [isReceptionistActive, setIsReceptionistActive] = useState(true);

    // --- Onboarding State (Premium Flow) ---
    const [onboardingStep, setOnboardingStep] = useState(1); // 1-10 Steps
    const [onboardingData, setOnboardingData] = useState({
        companyName: '',
        website: '',
        voiceId: 'OYTbf65OHHFELVut7v2H', // Default to 'Rachel'
        greeting: "Thanks for calling, how can I help?",
        capabilities: {
            takeMessages: true,
            scheduleAppointments: true,
            handleBilling: false
        },
        password: ''
    });

    // Forwarding Flow State
    const [forwardingMode, setForwardingMode] = useState('enable');
    const [activationStep, setActivationStep] = useState(1);
    const [selectedCarrier, setSelectedCarrier] = useState('AT&T');
    const [activePlan, setActivePlan] = useState('monthly');

    const carriers = [
        { name: 'AT&T', code: '*004*(513) 327-7680*11#', disableCode: '##004#' },
        { name: 'Verizon', code: '*71*(513) 327-7680#', disableCode: '*73' },
        { name: 'T-Mobile', code: '**21*(513) 327-7680#', disableCode: '##21#' },
        { name: 'UScellular', code: '*92*(513) 327-7680#', disableCode: '*920' },
    ];

    const currentCarrierConfig = carriers.find(c => c.name === selectedCarrier) || carriers[0];

    // Personality State
    const [personality, setPersonality] = useState({
        name: "Assistant",
        description: "Professional, formal, and polite."
    });

    // --- User Info State ---
    const [userInfo, setUserInfo] = useState({
        number: "", // This might need to come from elsewhere or remain mock for now
        name: "",
        company: "",
        businessType: "",
        email: "",
        address: "",
        website: "",
        useEmergencyNumber: false,
        businessDetails: "",
        instructions: ""
    });

    // --- Knowledge State ---
    const [knowledgeItems, setKnowledgeItems] = useState([]); // Stores both 'qa' and 'fact' types


    // --- Archive State ---
    const [activeInboxTab, setActiveInboxTab] = useState('inbox'); // 'inbox' | 'archived'
    const [archivedIds, setArchivedIds] = useState([]);

    const handleArchiveCall = async (callId) => {
        // Optimistic Update
        setCalls(prev => prev.map(c => c.id === callId ? { ...c, isArchived: true } : c));
        showToast("Call archived");

        try {
            const { error } = await supabase
                .from('calls')
                .update({ is_archived: true })
                .eq('id', callId);

            if (error) throw error;
        } catch (err) {
            console.error("Failed to archive call", err);
            showToast("Failed to archive call");
            // Revert optimistic update? (Simplified: Just log for now)
        }
    };

    const handleUnarchiveCall = async (callId) => {
        // Optimistic Update
        setCalls(prev => prev.map(c => c.id === callId ? { ...c, isArchived: false } : c));
        showToast("Call moved to inbox");

        try {
            const { error } = await supabase
                .from('calls')
                .update({ is_archived: false })
                .eq('id', callId);

            if (error) throw error;
        } catch (err) {
            console.error("Failed to unarchive call", err);
            showToast("Failed to unarchive call");
        }
    };

    const handleDeleteCall = async (callId) => {
        // Optimistic Update
        const callToDelete = calls.find(c => c.id === callId);
        setCalls(prev => prev.filter(c => c.id !== callId));

        showToast("Call deleted", async () => {
            // UNDO Action
            if (callToDelete) {
                setCalls(prev => [...prev, callToDelete]);
                await supabase.from('calls').insert({
                    ...callToDelete, // This mapping might be tricky if structure differs, but upsert handles it if we match schema
                    // Better: Don't real delete until toast clears?
                    // For now, simpler to just NOT implementing real undo DB logic in this quick iteration, 
                    // or just re-insert.
                    // Actually, "delete" usually means just hide or hard delete.
                    // Let's do HARD DELETE for "Delete".
                    // If undo, we re-fetch?
                });
                // Undo logic for Hard Delete is complex without partial deletion state.
                // Let's skip Undo DB logic for now or implement Soft Delete (is_deleted).
                // User asked for "Delete".
            }
        }, "Undo");

        try {
            const { error } = await supabase
                .from('calls')
                .delete()
                .eq('id', callId);

            if (error) throw error;
        } catch (err) {
            console.error("Failed to delete call", err);
            showToast("Failed to delete call");
        }
    };


    // --- Data Fetching ---
    useEffect(() => {
        const loadUserData = async () => {
            if (!session?.user) return;

            try {
                console.log("🔍 Fetching user data for:", session.user.id);

                // 1. Fetch Business Profile (Try ID then Phone)
                let { data: profile, error: profileError } = await supabase
                    .from('business_profiles')
                    .select('*')
                    .eq('owner_user_id', session.user.id)
                    .maybeSingle();

                // Fallback to Phone lookup
                if (!profile && session.user.phone) {
                    const { data: phoneProfile } = await supabase
                        .from('business_profiles')
                        .select('*')
                        .eq('user_phone_number', session.user.phone)
                        .maybeSingle();

                    if (phoneProfile) profile = phoneProfile;
                }

                if (profileError) throw profileError;

                // 2. Fetch Business Info (Knowledge, Greeting, Ending) - fetch BEFORE processing
                console.log("🔍 Fetching business_info...");
                const { data: info, error: infoError } = await supabase
                    .from('business_info')
                    .select('*')
                    .eq('owner_user_id', session.user.id);

                if (infoError) throw infoError;

                // 3. Process Profile
                if (profile) {
                    console.log("✅ Profile exists, processing...");

                    setUserInfo(prev => ({
                        ...prev,
                        company: profile.company_name || '',
                        businessType: profile.industry || '',
                        email: profile.support_email || '',
                        address: profile.address || '',
                        website: profile.website || '',
                        websiteTraining: profile.website_training_enabled || false,
                        emergencyNumber: profile.emergency_phone || '',
                        useEmergencyNumber: profile.emergency_transfer_enabled || false,
                        businessDetails: profile.business_description || '',
                        google_access_token: profile.google_access_token || null,
                        instructions: profile.instructions || '',
                        profileId: profile.id || '',
                        vapiPhoneNumber: profile.vapi_phone_number || '',
                        userPhoneNumber: profile.user_phone_number || ''
                    }));
                    console.log("✅ UserInfo updated");

                    // Extract Personality (Prioritize Profile for Voice)
                    const personalityItem = info?.find(i => i.type === 'personality');
                    const savedVoiceId = profile.voice_id || personalityItem?.content?.voiceId;
                    let savedName = profile.assistant_name || personalityItem?.content?.name || "Assistant";

                    // If name is generic but we have a valid voice ID, try to resolve the correct name
                    if (savedName === "Assistant" && savedVoiceId) {
                        const voiceMatch = FALLBACK_VOICES.find(v => v.id === savedVoiceId);
                        if (voiceMatch) savedName = voiceMatch.name;
                    }

                    setPersonality({
                        name: savedName,
                        description: "Professional, formal, and polite.",
                        voiceId: savedVoiceId
                    });
                    console.log("✅ Personality set:", savedName, savedVoiceId);
                }

                // 4. Process Business Info
                if (info) {
                    console.log("📊 Business Info:", info);

                    // Extract Greeting
                    const greetingItem = info.find(i => i.type === 'greeting');
                    if (greetingItem?.content?.text) {
                        setGreeting(greetingItem.content.text);
                        console.log("✅ Greeting loaded:", greetingItem.content.text);
                    }

                    // Extract Languages
                    const languagesItem = info.find(i => i.type === 'languages');
                    if (languagesItem?.content?.languages) {
                        setLanguages(languagesItem.content.languages);
                        console.log("✅ Languages loaded:", languagesItem.content.languages);
                    }

                    // Extract Knowledge Items (QA, Fact, Instruction)
                    const items = info.filter(i => ['qa', 'fact', 'instruction', 'website_content'].includes(i.type));
                    setKnowledgeItems(items);

                    console.log("✅ Knowledge items loaded:", items.length);
                }

            } catch (err) {
                console.error("Error loading user data:", err);
            }
        };

        loadUserData();
    }, [session, view]); // Re-fetch when view changes (e.g. wizard -> receptionist)









    // Input States
    const [newFact, setNewFact] = useState("");
    const [newInstruction, setNewInstruction] = useState("");


    // --- UI State for Interactions ---
    const [activeModal, setActiveModal] = useState(null); // 'add-question', 'add-appointment', etc.
    const [expandedCallId, setExpandedCallId] = useState(null);
    const [showTranscript, setShowTranscript] = useState(false);
    const [showLanguageModal, setShowLanguageModal] = useState(false);
    const [voiceOptions] = useState(FALLBACK_VOICES);
    const [languages, setLanguages] = useState(['English']);
    // const [playingVoiceId, setPlayingVoiceId] = useState(null); // Moved to top

    // Input States
    const [tempQuestion, setTempQuestion] = useState({ q: "", a: "" });

    // --- Auth UI State ---
    const [authPhone, setAuthPhone] = useState('');
    const [planCycle, setPlanCycle] = useState('annual'); // 'monthly' | 'annual'
    const [otpCode, setOtpCode] = useState('');
    const [showOtpInput, setShowOtpInput] = useState(false);
    const [authError, setAuthError] = useState(null);
    const [loginMethod, setLoginMethod] = useState('otp'); // 'otp' | 'password'
    const [authPassword, setAuthPassword] = useState('');

    const handleSendOtp = async () => {
        if (!authPhone || authPhone.length < 10) {
            setAuthError("Please enter a valid phone number");
            return false;
        }

        setAuthLoading(true);
        setAuthError(null);

        try {
            const { error } = await supabase.auth.signInWithOtp({
                phone: authPhone.startsWith('+') ? authPhone : `+1${authPhone}`,
            });

            if (error) {
                // Suppress raw Twilio errors for cleaner UI
                setAuthError("Please enter a valid phone number");
                return false;
            } else {
                setShowOtpInput(true);
                showToast("Verification code sent!");
                return true;
            }
        } catch (err) {
            console.error("OTP Send Exception:", err);
            setAuthError("Failed to send code. Please try again.");
            return false;
        } finally {
            setAuthLoading(false);
        }
    };

    const handlePasswordLogin = async () => {
        if (!authPhone || authPhone.length < 10) {
            setAuthError("Please enter a valid phone number");
            return false;
        }
        if (!authPassword) {
            setAuthError("Please enter your password");
            return false;
        }

        setAuthLoading(true);
        setAuthError(null);

        try {
            const phone = authPhone.startsWith('+') ? authPhone : `+1${authPhone}`;
            const { data, error } = await supabase.auth.signInWithPassword({
                phone,
                password: authPassword,
            });

            if (error) {
                setAuthError(error.message);
                return false;
            }

            if (data?.session) {
                setSession(data.session);
                setView('inbox');
                return true;
            }
            return false;
        } catch (err) {
            console.error("Password login error:", err);
            setAuthError("Login failed. Please try again.");
            return false;
        } finally {
            setAuthLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (otpCode.length !== 6) {
            setAuthError("Please enter the 6-digit code");
            return false;
        }

        setAuthLoading(true);
        setAuthError(null);

        try {
            // --- DEV BYPASS for Twilio Block ---
            if (otpCode === '123456') {
                console.log("Using Dev Bypass");
                try {
                    // Call backend to create real user (bypasses SMS, uses service role key)
                    const res = await fetch('/api/dev-signup', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ phone: authPhone })
                    });
                    const result = await res.json();

                    if (!res.ok || result.error) {
                        throw new Error(result.error || 'Dev signup failed');
                    }

                    // Set real Supabase session using returned tokens
                    const { error: sessionErr } = await supabase.auth.setSession({
                        access_token: result.accessToken,
                        refresh_token: result.refreshToken
                    });

                    if (sessionErr) throw sessionErr;

                    const { data: { session: newSession } } = await supabase.auth.getSession();
                    setSession(newSession);
                    console.log("✅ Dev session established for:", result.userId);

                    setView('onboarding');
                    setOnboardingStep(3); // Skip phone verification steps
                    showToast("Dev Access Granted 🔓");
                    return true;
                } catch (devErr) {
                    console.error("❌ Dev bypass failed:", devErr);
                    setAuthError("Dev bypass failed: " + devErr.message);
                    return false;
                }
            }

            const { data, error } = await supabase.auth.verifyOtp({
                phone: authPhone.startsWith('+') ? authPhone : `+1${authPhone}`,
                token: otpCode,
                type: 'sms'
            });

            if (error) {
                setAuthError(error.message);
                return false;
            } else if (data?.session) {
                setSession(data.session);
                const currentUser = data.user;

                // --- SMART PROFILE LINKING ---
                // Try finding by ID first
                let { data: profile } = await supabase
                    .from('business_profiles')
                    .select('id, company_name')
                    .eq('owner_user_id', currentUser.id)
                    .maybeSingle();

                // Fallback to Phone lookup
                if (!profile && currentUser.phone) {
                    const { data: phoneProfile } = await supabase
                        .from('business_profiles')
                        .select('id, company_name')
                        .eq('user_phone_number', currentUser.phone)
                        .maybeSingle();

                    if (phoneProfile) {
                        profile = phoneProfile;
                        // Bridge the old record to the new account
                        await supabase
                            .from('business_profiles')
                            .update({ owner_user_id: currentUser.id })
                            .eq('id', profile.id);
                    }
                }

                // Save phone number to profile if not already set
                const phoneWithPlus = authPhone.startsWith('+') ? authPhone : `+1${authPhone}`;
                await supabase.from('business_profiles').upsert({
                    owner_user_id: currentUser.id,
                    user_phone_number: phoneWithPlus
                }, { onConflict: 'owner_user_id' });
                console.log("✅ Saved phone to profile (OTP):", phoneWithPlus);

                // For demo, always go to inbox
                setView('inbox');
                return true;
            }
            return false;
        } catch (err) {
            console.error("OTP Verify Exception:", err);
            setAuthError("Invalid code. Please try again.");
            return false;
        } finally {
            setAuthLoading(false);
        }
    };


    const handleOnboardingSubmit = async () => {
        if (!userInfo.company) return showToast("Company name is required");

        try {
            const { error } = await supabase
                .from('business_profiles')
                .update({
                    company_name: userInfo.company,
                    industry: userInfo.businessType,
                    business_description: userInfo.businessDetails,
                    support_email: userInfo.email,
                    // Save capabilities to metadata or description for now (expand schema later)
                    // For now, we assume they are handled by enabling features
                })
                .eq('owner_user_id', session.user.id);

            if (error) throw error;

            showToast("Profile saved. Setting up your phone line...");

            // Trigger Provisioning (Blocking)
            const success = await handleProvision();

            if (success) {
                setView('receptionist');
                showToast("Setup Complete! 🚀");
            } else {
                showToast("Phone setup failed. Please try again.");
                // User stays on onboarding to retry
            }
        } catch (err) {
            console.error("Error saving profile:", err);
            showToast("Failed to save profile");
        }
    };

    const saveProfileField = async (field, value) => {
        try {
            const { error } = await supabase
                .from('business_profiles')
                .update({ [field]: value })
                .eq('owner_user_id', session.user.id);

            if (error) throw error;
            // Optional: Success toast or silent save
        } catch (err) {
            console.error(`Error saving ${field}:`, err);
            showToast("Failed to save changes");
        }
    };

    // --- Effects ---
    // --- Effects ---
    // --- Effects ---
    // --- Effects ---
    const isFetchingCallsRef = React.useRef(false);

    const fetchCalls = async () => {
        if (!session?.user || isFetchingCallsRef.current) return;

        isFetchingCallsRef.current = true;

        try {
            // NEW: Fetch from our own 'calls' table
            const { data: dbCalls, error: callsError } = await supabase
                .from('calls')
                .select('*')
                .eq('user_id', session.user.id)
                .order('started_at', { ascending: false });

            if (callsError) {
                // Only log non-abort errors
                if (callsError.message && !callsError.message.includes('AbortError')) {
                    console.error("Supabase calls fetch error:", callsError);
                }
                return;
            }

            // Fetch Bookings with safety check
            let bookings = [];
            try {
                const { data: bookingData, error } = await supabase.from('bookings').select('*').eq('owner_user_id', session.user.id);
                if (error && !error.message?.includes('AbortError')) console.error("Booking fetch error:", error);
                if (bookingData) bookings = bookingData;
            } catch (err) {
                if (!err.message?.includes('AbortError')) {
                    console.warn("Supabase booking fetch failed:", err);
                }
            }

            if (dbCalls) {
                const formatted = dbCalls.map((c, index) => {
                    // Smart Matching:
                    const callDate = new Date(c.started_at);
                    let booking = bookings.find(b => {
                        // 1. Exact ID
                        if (b.call_id === c.id) return true;

                        // 2. Fuzzy Time Match (Expanded window & robust parsing)
                        // created_at is automatic in Supabase
                        if (b.created_at) {
                            const bookCreation = new Date(b.created_at);
                            // If invalid date, skip
                            if (isNaN(bookCreation.getTime())) return false;

                            const diffMins = Math.abs(bookCreation - callDate) / (1000 * 60);
                            return diffMins < 60; // 60 min window
                        }
                        return false;
                    });

                    // DEBUG LOG
                    if (booking) console.log(`✅ Matched Booking for Call ${c.id}:`, booking);

                    // Safe Date Parsing
                    let bookingLabel = null;
                    if (booking) {
                        try {
                            const dateStr = new Date(booking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            bookingLabel = `Booked: ${booking.summary} @ ${dateStr}`;
                        } catch (e) {
                            bookingLabel = "Meeting Scheduled";
                        }
                    }

                    // Spam logic is now in DB provided by is_spam column!
                    const isSpam = c.is_spam;

                    return {
                        id: c.id,
                        name: "Unknown Caller", // Could be enhanced if we have Contact book later
                        number: c.customer_number || "Unknown Number",
                        time: new Date(c.started_at).toLocaleString(),
                        rawTime: c.started_at,
                        preview: c.summary || "No summary available",
                        summary: c.summary || "Processing summary...",
                        transcript: c.transcript || "No transcript available",
                        recordingUrl: c.recording_url,
                        status: 'completed', // DB calls are always completed
                        isSpam: isSpam,
                        isRead: c.is_read || false,       // NEW: From DB
                        isArchived: c.is_archived || false, // NEW: From DB

                        // Attach booking info
                        actionItem: booking ? {
                            type: 'booking',
                            label: "Meeting Scheduled",
                            summary: booking.summary,
                            startTime: booking.start_time,
                            link: booking.event_link,
                            displayTime: new Date(booking.start_time).toLocaleTimeString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })
                        } : null
                    };
                });
                setCalls(formatted);
            }
        } catch (e) {
            if (!e.message?.includes('AbortError')) {
                console.error("Failed to fetch calls", e);
            }
        } finally {
            isFetchingCallsRef.current = false;
        }
    };

    useEffect(() => {
        if (!session) return;

        let isMounted = true;
        let syncTimeout;

        // Initial fetch
        fetchCalls();

        // Background Sync with delay to avoid race condition
        syncTimeout = setTimeout(() => {
            if (!isMounted) return;
            fetch(`/api/sync-calls?userId=${session.user.id}`)
                .then(async res => {
                    if (!res.ok) {
                        const err = await res.json().catch(() => ({ error: res.statusText }));
                        throw new Error(err.error || res.statusText);
                    }
                    return res.json();
                })
                .then(data => {
                    if (!isMounted) return;
                    console.log("Sync Response:", data);
                    if (data.count > 0) fetchCalls();
                })
                .catch(err => {
                    console.error("Background sync failed:", err);
                });
        }, 1000);

        // Poll for new calls every 15s
        const interval = setInterval(() => {
            if (isMounted) fetchCalls();
        }, 15000);

        return () => {
            isMounted = false;
            clearInterval(interval);
            clearTimeout(syncTimeout);
        };
    }, [session]);




    const openCallDetail = (call) => {
        setSelectedCall(call);
        setView('call-detail');
    };

    const showToast = (message, action = null, actionLabel = 'Undo') => {
        setToast(message);
        setToastAction(action ? { run: action, label: actionLabel } : null);

        // Clear previous timeout if any (not tracking currently, but simple override works)
        setTimeout(() => {
            setToast(null);
            setToastAction(null);
        }, 4000);
    };

    // --- Styles ---

    const [provisioning, setProvisioning] = useState(false);
    const [isScraping, setIsScraping] = useState(false);

    const handleProvision = async () => {
        if (!session?.user) return;
        setProvisioning(true);
        try {
            const phoneWithPlus = authPhone.startsWith('+') ? authPhone : `+1${authPhone}`;
            const res = await fetch('/api/provision', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: session.user.id,
                    companyName: onboardingData.companyName || userInfo.company,
                    industry: userInfo.businessType,
                    userPhone: phoneWithPlus
                })
            });
            const data = await res.json();

            if (data.error) throw new Error(data.error);

            setUserInfo(prev => ({ ...prev, vapiPhoneNumber: data.phoneNumber }));
            // showToast("Receptionist Activated! 🚀"); // Handled in submit
            return true;
        } catch (err) {
            console.error(err);
            showToast("Failed to activate: " + err.message);
            return false;
        } finally {
            setProvisioning(false);
        }
    };

    const syncTimerRef = React.useRef(null); // Define syncTimerRef here

    const syncAssistant = (overrideVoiceId = null) => {
        if (!session?.user) return;

        // Debounce: Clear existing timer
        if (syncTimerRef.current) clearTimeout(syncTimerRef.current);

        // Set new timer (2 seconds)
        syncTimerRef.current = setTimeout(async () => {
            try {
                console.log("🔄 Syncing Assistant (Debounced)...");
                await fetch('/api/sync-assistant', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: session.user.id, languages, voiceId: overrideVoiceId, summaryPrompt: "Summarize the call in 2 sentences max." })
                });
                console.log("✅ Assistant Synced");
                setToast("Assistant Updated");
                setTimeout(() => setToast(null), 3000);
            } catch (err) {
                console.error("Sync failed (likely not provisioned yet):", err);
                // setToast("Sync Failed"); // Suppress visible error for smoother onboarding
            }
        }, 2000);
    };


    // --- RENDER ---
    const [hasTriedProvisioning, setHasTriedProvisioning] = useState(false);

    useEffect(() => {
        if (session && userInfo.company && !userInfo.vapiPhoneNumber && !provisioning && !hasTriedProvisioning) {
            // Only auto-provision if we are NOT in the onboarding view (i.e. returning user who has data but no phone)
            // If we are in onboarding, we wait for the explicit Submit.
            if (view !== 'onboarding' && view !== 'auth') {
                setHasTriedProvisioning(true);
                handleProvision();
            }
        }
    }, [session, userInfo.company, userInfo.vapiPhoneNumber, hasTriedProvisioning, view]);

    return (
        <div className="flex flex-col h-screen bg-[#F2F4F8] font-sans relative text-gray-900 overflow-hidden">


            {/* --- Auth View (Landing Page) --- */}
            {/* ##### Landing Page ##### */}
            {view === 'auth' && (
                // <div className="flex flex-col h-full items-center justify-between px-6 py-8 bg-gradient-to-b from-blue-600 via-blue-700 to-gray-900 relative">
                <div className="flex flex-col h-full items-center justify-between px-6 py-8 bg-gradient-to-b from-[#F5F6FA] via-[#EEF2FF] to-[#E6ECFF] relative">


                    {/* Top Right - Log In Button & Logout if session exists */}
                    <div className="w-full flex justify-end gap-3">
                        {session && (
                            <button
                                onClick={() => supabase.auth.signOut()}
                                className="px-6 py-2.5 bg-gray-100 border border-gray-200 rounded-full text-gray-600 font-bold text-sm hover:bg-gray-200 transition-all"
                            >
                                Logout
                            </button>
                        )}
                        <button
                            onClick={() => setView('login')}
                            className="px-6 py-2.5 bg-blue-600 backdrop-blur-md border border-blue-500/50 rounded-full text-white font-semibold text-sm hover:bg-blue-700 active:scale-95 transition-all duration-200 shadow-lg shadow-blue-600/30"
                        >
                            Log in
                        </button>
                    </div>

                    {/* Center Section - Logo & Title */}
                    <div className="flex-1 flex flex-col items-center justify-center text-center w-full max-w-md">
                        {/* Logo - No Background */}
                        <div className="mb-12">
                            <img src="/pics/JunoDesk_Logo.svg" alt="JunoDesk" className="w-32 h-32" />
                        </div>

                        {/* Title */}
                        <h1 className="text-5xl font-black mb-4 tracking-tight text-center leading-tight">
                            Welcome to<br />
                            <span className="text-gray-900">Juno</span><span className="text-blue-600">Desk</span>
                        </h1>
                        <p className="text-black/80 text-lg font-medium leading-relaxed px-8 mb-12">
                            Your AI receptionist that never misses a call.
                        </p>

                        {/* Bottom Section - Get Started Button */}
                        <div className="w-full max-w-md">
                            <button
                                onClick={() => {
                                    setView('onboarding');
                                    setOnboardingStep(1);
                                }}
                                className="w-full bg-blue-600 text-white py-5 rounded-full font-black text-lg tracking-wide shadow-[0_20px_60px_-15px_rgba(37,99,235,0.8)] hover:shadow-[0_25px_80px_-10px_rgba(37,99,235,0.9)] hover:bg-blue-700 active:scale-[0.97] transition-all duration-300"
                            >
                                <span className="relative drop-shadow-[0_0_12px_rgba(147,197,253,0.9)]">
                                    Get Started
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Login View (Separate from Signup) --- */}
            {view === 'login' && (
                <div className="flex flex-col h-full items-center justify-between px-6 py-8 bg-gradient-to-b from-[#F5F6FA] via-[#EEF2FF] to-[#E6ECFF] relative overflow-hidden">
                    {/* Background Decorative Rings */}
                    <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] bg-blue-400/10 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="absolute bottom-[-5%] left-[-10%] w-[300px] h-[300px] bg-indigo-400/10 rounded-full blur-3xl pointer-events-none"></div>

                    {/* Top Right - Back Button */}
                    <div className="w-full flex justify-end z-10">
                        <button
                            onClick={() => {
                                if (showOtpInput) {
                                    setShowOtpInput(false);
                                } else {
                                    setView('auth');
                                }
                                setAuthError(null);
                            }}
                            className="px-6 py-2.5 bg-white/60 backdrop-blur-md border border-gray-200/50 rounded-full text-gray-700 font-bold text-sm hover:bg-white/80 active:scale-95 transition-all duration-200 shadow-sm"
                        >
                            {showOtpInput ? 'Change Number' : '← Back'}
                        </button>
                    </div>

                    {/* Center Section - Login Form */}
                    <div className="flex-1 flex flex-col items-center justify-center text-center w-full max-w-md z-10">
                        {/* Logo */}
                        <div className="mb-8">
                            <img src="/pics/JunoDesk_Logo.svg" alt="JunoDesk" className="w-20 h-20" />
                        </div>

                        {/* Title */}
                        <h2 className="text-4xl font-black text-gray-900 mb-2">
                            {showOtpInput ? 'Enter Code' : 'Welcome back'}
                        </h2>
                        <p className="text-gray-500 text-base font-medium mb-10">
                            {showOtpInput
                                ? `Verify the 6-digit code sent to ${authPhone}`
                                : <>Sign in to your <span className="text-gray-900 font-bold">Juno</span><span className="text-blue-600 font-bold">Desk</span></>
                            }
                        </p>

                        {/* Login Method Toggle */}
                        {!showOtpInput && (
                            <div className="flex bg-gray-100/80 rounded-full p-1 mb-6 w-full max-w-xs mx-auto">
                                <button
                                    onClick={() => { setLoginMethod('otp'); setAuthError(null); }}
                                    className={`flex-1 py-2.5 rounded-full text-sm font-bold transition-all duration-200 ${loginMethod === 'otp' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                                >
                                    Send Code
                                </button>
                                <button
                                    onClick={() => { setLoginMethod('password'); setAuthError(null); }}
                                    className={`flex-1 py-2.5 rounded-full text-sm font-bold transition-all duration-200 ${loginMethod === 'password' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                                >
                                    Use Password
                                </button>
                            </div>
                        )}

                        {/* Login Card */}
                        <div className="w-full bg-white/80 backdrop-blur-2xl rounded-[32px] p-8 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.1)] border border-white/50">
                            <div className="space-y-6">
                                {!showOtpInput ? (
                                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4">
                                        {/* Phone Input */}
                                        <div>
                                            <div className="flex justify-between items-center mb-2 px-1">
                                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.1em]">Phone Number</label>
                                            </div>
                                            <div className="relative">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-[15px]">
                                                    🇺🇸 +1
                                                </div>
                                                <input
                                                    type="tel"
                                                    value={authPhone}
                                                    onChange={e => {
                                                        const val = e.target.value.replace(/\D/g, '');
                                                        if (val.length <= 10) setAuthPhone(val);
                                                    }}
                                                    className="w-full bg-gray-50/50 border-2 border-transparent rounded-[20px] pl-16 pr-4 py-5 text-[17px] font-bold text-gray-900 placeholder-gray-300 focus:bg-white focus:border-blue-500/10 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all duration-300"
                                                    placeholder="(555) 000-0000"
                                                />
                                            </div>
                                        </div>

                                        {/* Password Input (only in password mode) */}
                                        {loginMethod === 'password' && (
                                            <div>
                                                <div className="flex justify-between items-center mb-2 px-1">
                                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.1em]">Password</label>
                                                </div>
                                                <input
                                                    type="password"
                                                    value={authPassword}
                                                    onChange={e => setAuthPassword(e.target.value)}
                                                    className="w-full bg-gray-50/50 border-2 border-transparent rounded-[20px] px-4 py-5 text-[17px] font-bold text-gray-900 placeholder-gray-300 focus:bg-white focus:border-blue-500/10 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all duration-300"
                                                    placeholder="Enter your password"
                                                />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    /* OTP Input */
                                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <div className="flex justify-between items-center mb-2 px-1">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.1em]">Verification Code</label>
                                        </div>
                                        <input
                                            type="text"
                                            maxLength={6}
                                            value={otpCode}
                                            onChange={e => {
                                                const val = e.target.value.replace(/\D/g, '');
                                                if (val.length <= 6) setOtpCode(val);
                                            }}
                                            className="w-full bg-gray-50/50 border-2 border-transparent rounded-[20px] px-4 py-5 text-[24px] font-black text-gray-900 text-center tracking-[0.5em] placeholder-gray-200 focus:bg-white focus:border-blue-500/10 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all duration-300"
                                            placeholder="000000"
                                        />
                                    </div>
                                )}

                                {/* Error Message */}
                                {authError && (
                                    <div className="bg-red-50/50 border border-red-100 p-4 rounded-2xl animate-in zoom-in-95 duration-200">
                                        <p className="text-red-600 text-[13px] font-bold text-center leading-tight">{authError}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Section - Action Button */}
                    <div className="w-full max-w-md z-10">
                        <button
                            onClick={showOtpInput ? handleVerifyOtp : (loginMethod === 'password' ? handlePasswordLogin : handleSendOtp)}
                            disabled={authLoading}
                            className="w-full group bg-blue-600 text-white py-5 rounded-[24px] font-black text-lg tracking-wide shadow-[0_20px_50px_-15px_rgba(37,99,235,0.4)] hover:shadow-[0_25px_60px_-10px_rgba(37,99,235,0.5)] hover:bg-blue-700 active:scale-[0.98] transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden relative"
                        >
                            {/* Shiny Overlay Effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full duration-1000 transition-transform"></div>

                            {authLoading ? (
                                <span className="flex items-center justify-center gap-3">
                                    <div className="w-5 h-5 border-[3px] border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Processing...
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    {showOtpInput ? 'Verify Account' : (loginMethod === 'password' ? 'Sign In' : 'Send Verification Code')}
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 duration-300 transition-transform" />
                                </span>
                            )}
                        </button>

                        {!showOtpInput && (
                            <p className="text-gray-400 text-[11px] font-bold uppercase tracking-wider text-center mt-6 px-10 leading-relaxed opacity-60">
                                By signing in, you agree to receive an automated verification text.
                            </p>
                        )}
                    </div>
                </div>
            )}


            {/* --- Provisioning Loading Screen --- */}
            {provisioning && (
                <div className="absolute inset-0 z-[100] bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-300">
                    <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6 animate-pulse">
                        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <h2 className="text-xl font-black text-gray-900 mb-2">Setting up your AI Receptionist</h2>
                    <p className="text-sm font-bold text-gray-600">Acquiring dedicated phone number...</p>
                </div>
            )}



            {/* =========================================
               INBOX VIEW
               ========================================= */}
            {
                view === 'inbox' && (
                    <div className="flex flex-col h-full bg-transparent overflow-y-auto no-scrollbar animate-in fade-in duration-500">

                        {/* Header (Matches Inbox Style) */}
                        <div className="pt-14 pb-6 px-6 flex justify-center items-center shrink-0 z-20">
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-black tracking-tighter">
                                    <span className="text-gray-900">Juno</span><span className="text-blue-600">Desk</span>
                                </h1>
                                <div className="h-6 w-px bg-gray-200"></div>
                                <span className="px-2 py-1 rounded-md bg-gray-50 border border-gray-200 text-[10px] font-bold text-gray-500 tracking-widest uppercase">
                                    AI Receptionist
                                </span>
                            </div>
                        </div>


                        <div className="flex-1 pb-48 px-4">
                            {/* Dashboard Stats */}
                            <div className="mb-8">
                                {/* Assistant Status Card - Light Blue Theme */}
                                <div className="bg-blue-50 border border-blue-100 shadow-sm rounded-2xl p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full overflow-hidden bg-white border-2 border-white shadow-sm shrink-0">
                                            <img
                                                src={voiceOptions.find(v => v.id === personality.voiceId || v.name === personality.name)?.avatar || voiceOptions[0].avatar}
                                                alt="Assistant"
                                                className="w-full h-full object-cover scale-110 translate-y-0.5"
                                            />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900 text-lg leading-tight tracking-tight">{personality.name}</h3>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <div className={`w-2 h-2 rounded-full ${isReceptionistActive ? 'bg-[#2563EB] animate-pulse' : 'bg-gray-400'}`}></div>
                                                <span className={`text-[11px] font-bold uppercase tracking-wide ${isReceptionistActive ? 'text-[#2563EB]' : 'text-gray-500'}`}>
                                                    {isReceptionistActive ? "Active 24/7" : "Offline"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => { showToast("Refreshing..."); fetchCalls(); }}
                                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-white text-[#2563EB] shadow-sm hover:bg-blue-100 transition-all active:scale-95 border border-blue-100"
                                    >
                                        <RefreshCw size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Tabs - Consistent Style with Borders */}
                            <div className="flex items-center gap-2 mb-6 w-full">
                                {['inbox', 'unread', 'archived'].map(tab => {
                                    const isActive = activeInboxTab === tab;
                                    const count = calls.filter(c => {
                                        if (tab === 'inbox') return !c.isSpam && !c.isArchived;
                                        if (tab === 'unread') return !c.isSpam && !c.isArchived && !c.isRead;
                                        if (tab === 'archived') return c.isArchived;
                                        return false;
                                    }).length;

                                    return (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveInboxTab(tab)}
                                            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${isActive
                                                ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-lg shadow-blue-200 scale-[1.02]'
                                                : 'bg-white text-slate-500 border-gray-200 hover:bg-slate-50 hover:border-gray-300'
                                                }`}
                                        >
                                            <span className="capitalize">{tab}</span>
                                            {count > 0 && (
                                                <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                                    {count}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Calls List */}
                            <div className="space-y-4">
                                {authLoading ? (
                                    <div className="text-center py-12 text-gray-400">Loading calls...</div>
                                ) : calls.filter(c => {
                                    if (activeInboxTab === 'inbox') return !c.isSpam && !c.isArchived;
                                    if (activeInboxTab === 'unread') return !c.isSpam && !c.isArchived && (!c.isRead || expandedCallId === c.id);
                                    if (activeInboxTab === 'archived') return c.isArchived;
                                    return false;
                                }).length === 0 ? (
                                    <div className="text-center py-12 text-gray-400">
                                        <p className="mb-4">No calls in this view.</p>
                                        <button
                                            onClick={async () => {
                                                setToast("Fixing connection...");
                                                try {
                                                    const res = await fetch(`/api/fix-assistant-link?userId=${session.user.id}`);
                                                    const d = await res.json();
                                                    if (d.fixed) {
                                                        showToast("Connection Fixed! Syncing...");
                                                        // Trigger sync
                                                        fetch(`/api/sync-calls?userId=${session.user.id}`)
                                                            .then(r => r.json())
                                                            .then(data => {
                                                                if (data.count > 0) fetchCalls();
                                                                showToast(`Fixed & Synced ${data.count} calls`);
                                                            });
                                                    } else if (d.error) {
                                                        showToast("Fix Failed: " + d.error);
                                                    } else {
                                                        showToast("Connection seems fine. No Assistant mis-match found.");
                                                    }
                                                } catch (e) {
                                                    showToast("Error: " + e.message);
                                                }
                                            }}
                                            className="text-xs text-blue-500 font-bold hover:underline"
                                        >
                                            Missing calls? Fix Connection
                                        </button>
                                    </div>
                                ) : (() => {
                                    const visibleCalls = calls.filter(c => {
                                        if (activeInboxTab === 'inbox') return !c.isSpam && !c.isArchived;
                                        if (activeInboxTab === 'unread') return !c.isSpam && !c.isArchived && (!c.isRead || expandedCallId === c.id);
                                        if (activeInboxTab === 'archived') return c.isArchived;
                                        return false;
                                    });

                                    // Helper: Date Formatter
                                    const fmtDate = (d) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                                    const now = new Date(); // Current time

                                    const grouped = visibleCalls.reduce((acc, call) => {
                                        const date = new Date(call.rawTime);

                                        // Reset hours to start of day for accurate day comparison
                                        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                                        const startOfCallDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

                                        const diffTime = startOfToday - startOfCallDate;
                                        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                                        let label = "Older";

                                        if (diffDays === 0) label = "Today";
                                        else if (diffDays === 1) label = "Yesterday";
                                        else if (diffDays < 7) {
                                            // For individual days up to a week, show exact date (e.g., "Feb 5")
                                            label = fmtDate(date);
                                        }
                                        else if (diffDays < 14) label = "2 Weeks Ago";
                                        else if (diffDays < 30) label = "Last 30 Days";

                                        if (!acc[label]) acc[label] = [];
                                        acc[label].push(call);
                                        return acc;
                                    }, {});

                                    // Generate dynamic order keys based on what we found (plus fixed ones)
                                    // We want: Today, Yesterday, [Dynamic Dates descending], 2 Weeks Ago, Last 30 Days, Older

                                    // Get all keys that are purely dates (not special labels)
                                    const dateKeys = Object.keys(grouped).filter(k =>
                                        k !== "Today" && k !== "Yesterday" && k !== "2 Weeks Ago" && k !== "Last 30 Days" && k !== "Older"
                                    );

                                    // Sort date keys descending (newest first)
                                    dateKeys.sort((a, b) => new Date(b + ` ${now.getFullYear()}`) - new Date(a + ` ${now.getFullYear()}`));

                                    const order = ["Today", "Yesterday", ...dateKeys, "2 Weeks Ago", "Last 30 Days", "Older"];

                                    return order.map(label => {
                                        if (!grouped[label] || grouped[label].length === 0) return null;
                                        return (
                                            <div key={label}>
                                                <h3 className="text-[#2563EB] font-bold text-sm mb-3 pl-1">{label}</h3>
                                                <div className="space-y-4">
                                                    {grouped[label].map(call => {

                                                        const isExpanded = expandedCallId === call.id;
                                                        const isUnread = !call.isRead;

                                                        return (
                                                            <div
                                                                onClick={async () => {
                                                                    const isCurrentlyExpanded = expandedCallId === call.id;
                                                                    setExpandedCallId(isCurrentlyExpanded ? null : call.id);
                                                                    setShowTranscript(false);

                                                                    // Mark as Read Logic (DB Update)
                                                                    if (!isCurrentlyExpanded && !call.isRead) {
                                                                        // Optimistic Update
                                                                        setCalls(prev => prev.map(c => c.id === call.id ? { ...c, isRead: true } : c));

                                                                        try {
                                                                            const { error } = await supabase
                                                                                .from('calls')
                                                                                .update({ is_read: true })
                                                                                .eq('id', call.id);

                                                                            if (error) console.error("Failed to mark read:", error);
                                                                        } catch (err) {
                                                                            console.error("Mark read exception:", err);
                                                                        }
                                                                    }
                                                                }}
                                                                className={`bg-white rounded-2xl p-5 border transition-all duration-300 relative group overflow-hidden ${isExpanded
                                                                    ? 'border-blue-200 shadow-[0_8px_30px_rgba(37,99,235,0.1)] ring-1 ring-blue-100 transform scale-[1.01]'
                                                                    : 'border-gray-100 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] hover:border-blue-100 hover:shadow-[0_4px_12px_-2px_rgba(37,99,235,0.08)] active:scale-[0.99]'
                                                                    }`}
                                                            >
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <div>
                                                                        <h4 className="font-semibold text-gray-700 text-lg flex items-center gap-2 tracking-tight">
                                                                            {call.name === "Unknown Caller" ? call.number : call.name}
                                                                            {isUnread && (
                                                                                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(37,99,235,0.4)]"></span>
                                                                            )}
                                                                        </h4>
                                                                        <div className="text-[11px] font-medium text-gray-400 mt-0.5 flex items-center gap-1.5">
                                                                            {call.name !== "Unknown Caller" && call.number}
                                                                        </div>
                                                                    </div>
                                                                    <span className="text-sm font-medium text-gray-400">
                                                                        {new Date(call.rawTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                                                    </span>
                                                                </div>
                                                                {/* Compact Meeting Status Pill */}
                                                                {call.actionItem && (
                                                                    <div
                                                                        className="mb-4 inline-flex items-center gap-2 px-2 py-1.2 rounded-full
               bg-blue-50 border border-blue-200/60 text-blue-900
               text-[11px] font-semibold tracking-tight
               hover:bg-blue-100 transition-colors cursor-pointer"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            if (call.actionItem.link) {
                                                                                window.open(call.actionItem.link, "_blank");
                                                                            }
                                                                        }}
                                                                        title="View in Calendar"
                                                                    >
                                                                        <div className="w-5 h-5 bg-[#2563EB] rounded-full flex items-center justify-center text-white shadow-sm">
                                                                            <CalendarCheck size={11} strokeWidth={3} />
                                                                        </div>

                                                                        <span className="whitespace-nowrap">
                                                                            Booked · {call.actionItem.displayTime}
                                                                        </span>
                                                                    </div>
                                                                )}

                                                                {/* Summary / Preview */}
                                                                {
                                                                    !isExpanded && (
                                                                        <p className="text-gray-600 text-xs truncate font-medium mt-1">
                                                                            {call.summary}
                                                                        </p>
                                                                    )
                                                                }

                                                                {/* Expanded View Content */}
                                                                {
                                                                    isExpanded && (
                                                                        <div className="animate-in fade-in slide-in-from-top-2 duration-300 pt-2">
                                                                            <p className="text-gray-700 text-sm font-medium leading-relaxed mb-6">
                                                                                {call.summary}
                                                                            </p>


                                                                            {/* Actions */}
                                                                            <div className="flex items-center gap-2 mb-6">
                                                                                <button className="bg-[#2563EB] text-white px-5 py-2 rounded-xl font-bold text-[11px] flex items-center gap-1.5 shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors">
                                                                                    <Phone size={13} className="fill-current" /> Call
                                                                                </button>
                                                                                <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl font-bold text-[11px] flex items-center gap-1.5 hover:bg-gray-200 transition-colors whitespace-nowrap">
                                                                                    <UserPlus size={13} /> Add
                                                                                </button>
                                                                                <div className="flex gap-1.5 ml-auto">
                                                                                    <button
                                                                                        onClick={(e) => { e.stopPropagation(); showToast("Sharing options..."); }}
                                                                                        className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                                                                                        title="Share"
                                                                                    >
                                                                                        <Share2 size={14} />
                                                                                    </button>
                                                                                    {!call.isArchived && (
                                                                                        <button
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                handleArchiveCall(call.id);
                                                                                            }}
                                                                                            className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                                                                                            title="Archive"
                                                                                        >
                                                                                            <Archive size={14} />
                                                                                        </button>
                                                                                    )}
                                                                                    {call.isArchived && (
                                                                                        <button
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                handleUnarchiveCall(call.id);
                                                                                            }}
                                                                                            className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 hover:text-green-500 hover:bg-green-50 transition-colors"
                                                                                            title="Move to Inbox"
                                                                                        >
                                                                                            <Inbox size={14} />
                                                                                        </button>
                                                                                    )}
                                                                                    <button
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            handleDeleteCall(call.id);
                                                                                        }}
                                                                                        className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                                                    >
                                                                                        <Trash2 size={14} />
                                                                                    </button>
                                                                                </div>
                                                                            </div>

                                                                            {/* Audio Player (Music Player Style) */}
                                                                            {call.recordingUrl && (
                                                                                <div className="bg-white border border-gray-100 rounded-xl p-3 flex items-center gap-3 mb-6 shadow-sm z-10 relative" onClick={(e) => e.stopPropagation()}>
                                                                                    <button
                                                                                        onClick={() => {
                                                                                            const audioId = `audio-${call.id}`;
                                                                                            const audioEl = document.getElementById(audioId);
                                                                                            if (audioEl) {
                                                                                                if (audioEl.paused) {
                                                                                                    document.querySelectorAll('audio').forEach(el => { if (el.id !== audioId) el.pause(); });
                                                                                                    audioEl.play();
                                                                                                } else {
                                                                                                    audioEl.pause();
                                                                                                }
                                                                                                if (playingVoiceId !== call.id) {
                                                                                                    setPlayingVoiceId(call.id);
                                                                                                    setAudioProgress(0);
                                                                                                } else {
                                                                                                    // If pausing same audio, keep ID but we know it is paused from UI toggle logic
                                                                                                    // actually, usually simpler to clear ID on pause or track 'isPlaying' state.
                                                                                                    // For this simple implementation, we toggle ID on play, keep it on pause?
                                                                                                    // No, if we pause, we usually want to show play icon. 
                                                                                                    // Since our icon logic is `playingVoiceId === call.id`, pausing updates the UI to play icon? 
                                                                                                    // Wait, existing logic was: onPause={() => setPlayingVoiceId(null)}
                                                                                                    // So pausing clears the ID.
                                                                                                }
                                                                                            }
                                                                                        }}
                                                                                        className={`w-8 h-8 rounded-full flex items-center justify-center text-white shadow-md shrink-0 transition-all active:scale-95 ${playingVoiceId === call.id ? 'bg-[#2563EB] shadow-blue-200' : 'bg-gray-900 shadow-gray-200'}`}
                                                                                    >
                                                                                        {playingVoiceId === call.id ? <Pause size={12} className="fill-current" /> : <Play size={12} className="fill-current ml-0.5" />}
                                                                                    </button>

                                                                                    <audio
                                                                                        id={`audio-${call.id}`}
                                                                                        src={call.recordingUrl}
                                                                                        onEnded={() => { setPlayingVoiceId(null); setAudioProgress(0); }}
                                                                                        onPlay={() => setPlayingVoiceId(call.id)}
                                                                                        onPause={() => setPlayingVoiceId(null)}
                                                                                        onTimeUpdate={(e) => {
                                                                                            const p = (e.currentTarget.currentTime / e.currentTarget.duration) * 100;
                                                                                            setAudioProgress(p || 0);
                                                                                        }}
                                                                                        className="hidden"
                                                                                    />

                                                                                    {/* Real-time Progress Bar */}
                                                                                    <div className="flex-1 h-3.5 bg-gray-100 rounded-full overflow-hidden relative group cursor-pointer"
                                                                                        onClick={(e) => {
                                                                                            // Optional: Click to seek
                                                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                                                            const x = e.clientX - rect.left;
                                                                                            const width = rect.width;
                                                                                            const percent = x / width;
                                                                                            const audioId = `audio-${call.id}`;
                                                                                            const audioEl = document.getElementById(audioId);
                                                                                            if (audioEl && Number.isFinite(audioEl.duration)) {
                                                                                                audioEl.currentTime = percent * audioEl.duration;
                                                                                                setAudioProgress(percent * 100);
                                                                                            }
                                                                                        }}
                                                                                    >
                                                                                        {/* Background Track */}
                                                                                        <div className="absolute inset-0 bg-gray-200/50"></div>

                                                                                        {/* Progress Fill */}
                                                                                        <div
                                                                                            className="h-full bg-[#2563EB] rounded-full transition-all duration-75 relative"
                                                                                            style={{ width: `${playingVoiceId === call.id ? audioProgress : 0}%` }}
                                                                                        >
                                                                                            {/* Knob (Visible on hover or when playing) */}
                                                                                            {playingVoiceId === call.id && (
                                                                                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full shadow-sm border border-gray-100 translate-x-1/2"></div>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>

                                                                                    <span className="text-[10px] font-bold text-gray-400 tabular-nums min-w-[24px]">
                                                                                        {playingVoiceId === call.id ? (
                                                                                            // Format Current Time
                                                                                            (() => {
                                                                                                const audioId = `audio-${call.id}`;
                                                                                                const el = document.getElementById(audioId);
                                                                                                if (!el) return "0:00";
                                                                                                const mins = Math.floor(el.currentTime / 60);
                                                                                                const secs = Math.floor(el.currentTime % 60);
                                                                                                return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
                                                                                            })()
                                                                                        ) : "0:00"}
                                                                                    </span>
                                                                                </div>
                                                                            )}

                                                                            {/* Transcript Chat (Collapsible) */}
                                                                            <div className="space-y-3">
                                                                                <button
                                                                                    onClick={(e) => { e.stopPropagation(); setShowTranscript(!showTranscript); }}
                                                                                    className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors py-2"
                                                                                >
                                                                                    {showTranscript ? <ChevronDown size={14} strokeWidth={2.5} /> : <ChevronRight size={14} strokeWidth={2.5} />}
                                                                                    Read Transcript
                                                                                </button>

                                                                                {showTranscript && (
                                                                                    <div className="pt-2 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                                                                        {/* Parse Transcript */}
                                                                                        {call.transcript ? (
                                                                                            call.transcript.split(/(?=AI:|User:)/g).map((msg, i) => {
                                                                                                const isAI = msg.trim().startsWith("AI:");
                                                                                                const cleanMsg = msg.replace(/^(AI:|User:)/i, '').trim();
                                                                                                if (!cleanMsg) return null;

                                                                                                return (
                                                                                                    <div key={i} className={`flex gap-3 text-[13px] leading-relaxed mb-4 ${isAI ? 'flex-row' : 'flex-row-reverse'}`}>
                                                                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black tracking-wide shadow-sm border ${isAI ? 'bg-white border-blue-100 text-blue-600' : 'bg-gray-900 border-gray-900 text-white'}`}>
                                                                                                            {isAI ? 'AI' : 'C'}
                                                                                                        </div>
                                                                                                        <div className={`py-2 px-3.5 rounded-2xl max-w-[80%] ${isAI
                                                                                                            ? 'bg-blue-50/50 text-gray-800 rounded-tl-none border border-blue-100/50'
                                                                                                            : 'bg-gray-100 text-gray-900 rounded-tr-none'
                                                                                                            }`}>
                                                                                                            {cleanMsg}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                );
                                                                                            })
                                                                                        ) : (
                                                                                            <div className="text-gray-400 text-xs italic p-4 text-center bg-gray-50 rounded-xl">
                                                                                                No transcript available for this call.
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                )}
                                                                            </div>

                                                                        </div>
                                                                    )
                                                                }
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                    </div>
                )
            }




            {/* =========================================
               RECEPTIONIST VIEW
               ========================================= */}
            {
                view === 'receptionist' && (
                    <div className="flex flex-col h-full bg-transparent overflow-y-auto no-scrollbar animate-in fade-in duration-500">
                        {/* Header (Matches Inbox Style) */}
                        <div className="pt-14 pb-6 px-6 flex justify-center items-center shrink-0 z-20">
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-black tracking-tighter">
                                    <span className="text-gray-900">Juno</span><span className="text-blue-600">Desk</span>
                                </h1>
                                <div className="h-6 w-px bg-gray-200"></div>
                                <span className="px-2 py-1 rounded-md bg-gray-50 border border-gray-200 text-[10px] font-bold text-gray-500 tracking-widest uppercase">
                                    AI Receptionist
                                </span>
                            </div>
                        </div>

                        {/* Tabs (Consistent Square Style) */}
                        <div className="flex items-center gap-2 mb-6 px-4 w-full">
                            {['Instructions', 'Knowledge', 'Phone'].map((tab) => {
                                const isActive = activeReceptionistTab === tab.toLowerCase();
                                return (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveReceptionistTab(tab.toLowerCase())}
                                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${isActive
                                            ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-lg shadow-blue-200 scale-[1.02]'
                                            : 'bg-white text-slate-500 border-gray-200 hover:bg-slate-50 hover:border-gray-300'
                                            }`}
                                    >
                                        {tab}
                                    </button>
                                );
                            })}
                        </div>


                        {/* --- Tab Content --- */}
                        <div className="w-full flex-auto bg-transparent relative z-10 px-6 pt-8 pb-32 min-h-[60vh]">
                            {activeReceptionistTab === 'instructions' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">



                                    {/* Voice & Personality Grid */}
                                    <section>
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                                <AudioWaveform size={18} className="text-[#2563EB]" /> Voice
                                            </h3>

                                        </div>
                                        <div className="grid grid-cols-3 gap-3">
                                            {voiceOptions.length > 0 ? voiceOptions.map((p) => {
                                                const isSelected = personality.voiceId === p.id;
                                                const isPlaying = playingVoiceId === p.id;

                                                return (
                                                    <button
                                                        key={p.id}
                                                        onClick={async () => {
                                                            // Play Local Preview
                                                            setPlayingVoiceId(p.id);
                                                            try {
                                                                const audio = new Audio(p.preview);
                                                                audio.onended = () => setPlayingVoiceId(null);
                                                                audio.onerror = () => {
                                                                    console.error("Audio playback error");
                                                                    setPlayingVoiceId(null);
                                                                };
                                                                await audio.play();
                                                            } catch (e) {
                                                                console.error("Audio play failed", e);
                                                                setPlayingVoiceId(null);
                                                            }

                                                            setPersonality(prev => ({ ...prev, name: p.name, voiceId: p.id }));

                                                            // Sync to DB (business_profiles is source of truth for voice)
                                                            try {
                                                                await supabase
                                                                    .from('business_profiles')
                                                                    .update({
                                                                        voice_id: p.id
                                                                    })
                                                                    .eq('owner_user_id', session.user.id);

                                                                syncAssistant(p.id);
                                                            } catch (err) {
                                                                console.error("Failed to save personality", err);
                                                                showToast("Failed to save voice");
                                                            }
                                                        }}
                                                        className={`relative flex flex-col items-center justify-center p-2 transition-all ${isSelected ? 'scale-110' : 'hover:scale-105'}`}
                                                    >
                                                        <div className={`w-20 h-20 rounded-full overflow-hidden relative transition-all ${isSelected ? 'ring-4 ring-blue-500 ring-offset-2 ring-offset-white shadow-[0_0_20px_rgba(37,99,235,0.5)]' : 'ring-2 ring-gray-200'}`}>
                                                            <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                                                            {isPlaying && (
                                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                                    <AudioWaveform size={20} className="text-white animate-pulse" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <span className={`text-xs font-bold mt-3 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`}>{p.name}</span>
                                                    </button>
                                                )
                                            }) : (
                                                <div className="col-span-3 text-center py-8 text-gray-400 text-sm font-medium">
                                                    Loading voices...
                                                </div>
                                            )}
                                        </div>
                                    </section>

                                    {/* Languages Selection (Premium UI) */}
                                    <section>
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                                <Globe size={18} className="text-[#2563EB]" /> Languages
                                            </h3>
                                            <button
                                                onClick={() => setShowLanguageModal(true)}
                                                className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors"
                                            >
                                                Edit
                                            </button>
                                        </div>

                                        <div
                                            onClick={() => setShowLanguageModal(true)}
                                            className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-2xl p-5 shadow-sm cursor-pointer hover:shadow-md hover:border-blue-200 transition-all group relative overflow-hidden"
                                        >
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-50/50 to-transparent rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>

                                            <div className="flex flex-wrap gap-2 relative z-10">
                                                {languages.length > 0 ? languages.map(lang => {
                                                    const langObj = LANGUAGES.find(l => l.name === lang);
                                                    return (
                                                        <div key={lang} className="bg-white border border-gray-200 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-sm font-bold text-sm text-gray-800 group-hover:border-blue-200 transition-colors">
                                                            <span className="text-lg leading-none">{langObj?.flag || '🌐'}</span>
                                                            <span>{lang}</span>
                                                        </div>
                                                    );
                                                }) : (
                                                    <span className="text-gray-400 text-sm font-medium italic">No languages selected (Defaults to English)</span>
                                                )}
                                            </div>

                                            <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
                                                <span>Auto-detect active</span>
                                            </div>
                                        </div>
                                    </section>

                                    {/* Greeting Message */}
                                    <section>
                                        <h3 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
                                            <MessageCircle size={18} className="text-[#2563EB]" /> Greeting Message
                                        </h3>
                                        <p className="text-xs text-gray-500 mb-4">
                                            The first message your receptionist says upon accepting a call
                                        </p>

                                        <div className="border border-gray-100 rounded-xl p-4 shadow-sm bg-white">
                                            <textarea
                                                value={greeting}
                                                onChange={(e) => setGreeting(e.target.value)}
                                                onInput={(e) => {
                                                    // auto-grow height
                                                    e.currentTarget.style.height = "auto";
                                                    e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
                                                }}
                                                onBlur={async () => {
                                                    await supabase
                                                        .from("business_info")
                                                        .update({ content: { text: greeting } })
                                                        .eq("owner_user_id", session.user.id)
                                                        .eq("type", "greeting");

                                                    showToast("Greeting saved");
                                                    syncAssistant();
                                                }}
                                                className="w-full text-sm text-gray-900 font-medium outline-none bg-transparent placeholder-gray-400 resize-none overflow-hidden leading-5"
                                                placeholder="Hey, thank you for calling LCE. How may I help you?"
                                                rows={1}
                                            />
                                        </div>
                                    </section>




                                    {/* Instructions */}
                                    <section>
                                        <h3 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
                                            <FileText size={18} className="text-[#2563EB]" /> Instructions
                                        </h3>
                                        <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                                            Specific instructions for how your receptionist should handle calls.
                                        </p>

                                        <div className="space-y-3">
                                            {knowledgeItems.filter(i => i.type === 'instruction' && !i.content.text.startsWith('WEBSITE KNOWLEDGE') && i.content.source !== 'website_scrape').map((item) => {
                                                const isWebsite = false;

                                                if (isWebsite) {
                                                    const titleMatch = item.content.text.match(/WEBSITE KNOWLEDGE \((.*?)\):/);
                                                    const title = titleMatch ? titleMatch[1] : (item.content.url ? new URL(item.content.url).hostname : "Website Content");

                                                    return (
                                                        <div key={item.id} className="bg-white border border-gray-100 rounded-xl shadow-sm group overflow-hidden transition-all hover:border-blue-100">
                                                            <details className="group/details">
                                                                <summary className="p-4 flex justify-between items-center cursor-pointer list-none hover:bg-gray-50 transition-colors">
                                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                                                                            <Globe size={16} />
                                                                        </div>
                                                                        <div className="flex flex-col overflow-hidden">
                                                                            <span className="text-sm font-bold text-gray-900 truncate pr-2">{title}</span>
                                                                            <span className="text-[10px] text-gray-400 font-medium">Website Knowledge Base</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-3 shrink-0">
                                                                        <ChevronDown size={14} className="text-gray-400 group-open/details:rotate-180 transition-transform" />
                                                                        <button
                                                                            onClick={async (e) => {
                                                                                e.preventDefault(); // Stop summary toggle
                                                                                await supabase.from('business_info').delete().eq('id', item.id);
                                                                                setKnowledgeItems(prev => prev.filter(k => k.id !== item.id));
                                                                                syncAssistant();
                                                                            }}
                                                                            className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                                                                        >
                                                                            <X size={14} />
                                                                        </button>
                                                                    </div>
                                                                </summary>
                                                                <div className="px-4 pb-4 pt-0">
                                                                    <div className="p-3 bg-slate-50 rounded-lg text-xs font-mono text-slate-600 overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap border border-slate-100 leading-relaxed">
                                                                        {item.content.text}
                                                                    </div>
                                                                    <div className="mt-2 text-[10px] text-center text-gray-400 italic">
                                                                        This content is automatically added to the AI's system prompt.
                                                                    </div>
                                                                </div>
                                                            </details>
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div key={item.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex justify-between items-center group hover:border-gray-200 transition-colors">
                                                        <span className="text-sm font-medium text-gray-900">{item.content.text}</span>
                                                        <button
                                                            onClick={async () => {
                                                                await supabase.from('business_info').delete().eq('id', item.id);
                                                                setKnowledgeItems(prev => prev.filter(k => k.id !== item.id));
                                                                syncAssistant();
                                                            }}
                                                            className="text-gray-300 hover:text-red-500 transition-colors bg-transparent p-1 hover:bg-red-50 rounded-md"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                );
                                            })}

                                            {/* Add Instruction Input */}
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={newInstruction}
                                                    onChange={(e) => setNewInstruction(e.target.value)}
                                                    placeholder="eg..Never offer refunds"
                                                    className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-400/20 outline-none"
                                                    onKeyDown={async (e) => {
                                                        if (e.key === 'Enter' && newInstruction.trim()) {
                                                            const text = newInstruction.trim();
                                                            setNewInstruction(""); // Clear UI immediately

                                                            try {
                                                                const { data, error } = await supabase
                                                                    .from('business_info')
                                                                    .insert([{
                                                                        owner_user_id: session.user.id,
                                                                        type: 'instruction',
                                                                        content: { text: text }
                                                                    }])
                                                                    .select()
                                                                    .single();

                                                                if (error) throw error;
                                                                setKnowledgeItems(prev => [...prev, data]);
                                                                syncAssistant();
                                                            } catch (err) {
                                                                console.error("Error saving instruction:", err);
                                                                showToast("Failed to save instruction");
                                                            }
                                                        }
                                                    }}
                                                />
                                                <button
                                                    onClick={async () => {
                                                        if (newInstruction.trim()) {
                                                            const text = newInstruction.trim();
                                                            setNewInstruction("");

                                                            try {
                                                                const { data, error } = await supabase
                                                                    .from('business_info')
                                                                    .insert([{
                                                                        owner_user_id: session.user.id,
                                                                        type: 'instruction',
                                                                        content: { text: text }
                                                                    }])
                                                                    .select()
                                                                    .single();

                                                                if (error) throw error;
                                                                setKnowledgeItems(prev => [...prev, data]);
                                                                syncAssistant();
                                                            } catch (err) {
                                                                console.error("Error saving instruction:", err);
                                                                showToast("Failed to save instruction");
                                                            }
                                                        }
                                                    }}
                                                    className="bg-[#2563EB] text-white rounded-xl w-12 flex items-center justify-center shadow-lg shadow-blue-200 hover:bg-blue-600 active:scale-95 transition-all"
                                                >
                                                    <Plus size={20} />
                                                </button>
                                            </div>
                                        </div>
                                    </section>

                                    {/* Google Calendar Connect */}
                                    <section>
                                        <h3 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
                                            <Calendar size={18} className="text-[#2563EB]" /> Calendar Integration
                                        </h3>
                                        <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                                            Connect your Google Calendar to allow the receptionist to check availability and book appointments.
                                        </p>

                                        {userInfo.google_access_token ? (
                                            <div className="w-full bg-blue-50 border border-blue-100 text-blue-700 py-3 rounded-xl font-bold flex items-center justify-between px-5 shadow-sm">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                                    <span className="text-sm">Calendar Connected</span>
                                                </div>
                                                <button
                                                    onClick={async () => {
                                                        await supabase.from('business_profiles').update({ google_access_token: null, google_refresh_token: null }).eq('owner_user_id', session.user.id);
                                                        setUserInfo({ ...userInfo, google_access_token: null });
                                                        showToast("Calendar disconnected");
                                                    }}
                                                    className="text-xs text-blue-500 hover:text-blue-800 font-bold"
                                                >
                                                    Disconnect
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={async () => {
                                                    showToast("Redirecting to Google Sign In...");
                                                    try {
                                                        const res = await fetch('http://localhost:3000/api/auth/google-url', {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ userId: session.user.id })
                                                        });
                                                        const { url } = await res.json();
                                                        window.location.href = url;
                                                    } catch (e) {
                                                        console.error("Auth Error", e);
                                                        showToast("Failed to initiate Google Login");
                                                    }
                                                }}
                                                className="w-full bg-white border border-gray-200 text-gray-900 py-3 rounded-xl font-bold hover:bg-gray-50 active:scale-[0.98] transition-all flex items-center justify-center shadow-sm text-sm gap-2"
                                            >
                                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                                </svg>
                                                Connect Google Calendar
                                            </button>
                                        )}
                                    </section>

                                    {/* Spacer */}
                                    <div className="h-48"></div>
                                </div>
                            )}

                            {activeReceptionistTab === 'knowledge' && (
                                <div className="space-y-6 animate-in fade-in duration-300 relative pb-32">
                                    <div className="space-y-8 animate-in fade-in duration-300">
                                        {/* Company Basic Info */}
                                        <div>
                                            <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Business Name</label>
                                            <input
                                                type="text"
                                                value={userInfo.company}
                                                onChange={(e) => setUserInfo({ ...userInfo, company: e.target.value })}
                                                onBlur={(e) => saveProfileField('company_name', e.target.value)}
                                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-base font-bold text-gray-900 shadow-sm focus:ring-2 focus:ring-blue-400/20 outline-none transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Industry</label>
                                            <input
                                                type="text"
                                                value={userInfo.businessType}
                                                onChange={(e) => setUserInfo({ ...userInfo, businessType: e.target.value })}
                                                onBlur={(e) => saveProfileField('industry', e.target.value)}
                                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-base font-medium text-gray-900 shadow-sm focus:ring-2 focus:ring-blue-400/20 outline-none transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Support Email</label>
                                            <input
                                                type="text"
                                                value={userInfo.email}
                                                onChange={(e) => setUserInfo({ ...userInfo, email: e.target.value })}
                                                onBlur={(e) => saveProfileField('support_email', e.target.value)}
                                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-base font-medium text-gray-900 shadow-sm focus:ring-2 focus:ring-blue-400/20 outline-none transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Address</label>
                                            <input
                                                type="text"
                                                value={userInfo.address}
                                                onChange={(e) => setUserInfo({ ...userInfo, address: e.target.value })}
                                                onBlur={(e) => saveProfileField('address', e.target.value)}
                                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-base font-medium text-gray-900 shadow-sm focus:ring-2 focus:ring-blue-400/20 outline-none transition-all"
                                            />
                                        </div>

                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <h3 className="text-base font-bold text-gray-900">Website Training</h3>
                                            </div>
                                            <p className="text-[10px] text-gray-400 mb-3 leading-tight">
                                                We will scan this site to answer questions. Click Sync to update.
                                            </p>
                                            <div className="w-full bg-white border border-gray-200 rounded-xl p-2 flex items-center shadow-sm focus-within:ring-2 focus-within:ring-blue-400/20 transition-all">
                                                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 ml-1">
                                                    <Globe size={16} className="text-gray-500" />
                                                </div>
                                                <input
                                                    type="text"
                                                    value={userInfo.website}
                                                    onChange={(e) => setUserInfo({ ...userInfo, website: e.target.value })}
                                                    onBlur={(e) => {
                                                        let val = e.target.value.trim();
                                                        if (val && !val.startsWith('http://') && !val.startsWith('https://')) {
                                                            val = 'https://' + val;
                                                            setUserInfo(prev => ({ ...prev, website: val }));
                                                        }
                                                        saveProfileField('website', val);
                                                    }}
                                                    placeholder="https://example.com"
                                                    disabled={isScraping}
                                                    className="w-full bg-transparent border-none text-base font-medium text-gray-900 focus:ring-0 px-3 placeholder:text-gray-300"
                                                />
                                                <button
                                                    disabled={!userInfo.website || isScraping}
                                                    onClick={async () => {
                                                        if (!userInfo.website) return;
                                                        setIsScraping(true);
                                                        setToast("Scanning website... (this may take a moment)");

                                                        try {
                                                            // 1. Scrape
                                                            const res = await fetch('/api/scrape-website', {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({ url: userInfo.website })
                                                            });
                                                            const data = await res.json();
                                                            if (!res.ok) throw new Error(data.error || "Scrape failed");

                                                            // 2. Save Knowledge
                                                            // Clear old website content (stored as instruction with source tag)
                                                            const { error: deleteError } = await supabase
                                                                .from('business_info')
                                                                .delete()
                                                                .eq('owner_user_id', session.user.id)
                                                                .eq('type', 'instruction')
                                                                .contains('content', { source: 'website_scrape' });

                                                            if (deleteError) console.error("Delete warning:", deleteError);

                                                            const { error: insertError, data: newItem } = await supabase.from('business_info').insert({
                                                                owner_user_id: session.user.id,
                                                                type: 'instruction',
                                                                content: {
                                                                    text: `WEBSITE KNOWLEDGE (${data.title}):\n${data.text}`,
                                                                    source: 'website_scrape',
                                                                    url: userInfo.website
                                                                }
                                                            }).select().single();

                                                            if (insertError) throw insertError;

                                                            // Add to local state so dropdown appears immediately
                                                            if (newItem) {
                                                                setKnowledgeItems(prev => [...prev, newItem]);
                                                            }

                                                            showToast("Website Synced Successfully!");
                                                            syncAssistant();
                                                        } catch (err) {
                                                            console.error("Sync Failure:", err);
                                                            showToast("Failed to sync: " + (err.message || err.details || "Unknown DB Error"));
                                                        } finally {
                                                            setIsScraping(false);
                                                        }
                                                    }}
                                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-2 ${!userInfo.website ? 'bg-gray-100 text-gray-400 cursor-not-allowed' :
                                                        isScraping ? 'bg-blue-100 text-blue-500 cursor-wait' : 'bg-[#2563EB] text-white hover:bg-blue-600 active:scale-95'
                                                        }`}
                                                >
                                                    {isScraping ? (
                                                        <>
                                                            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                                            Scanning
                                                        </>
                                                    ) : (
                                                        <>
                                                            <RefreshCw size={14} className={isScraping ? "animate-spin" : ""} />
                                                            Sync
                                                        </>
                                                    )}
                                                </button>
                                            </div>

                                        </div>

                                        {/* Synced Website Content */}
                                        <div className="space-y-3 mt-4">
                                            {knowledgeItems.filter(i => i.type === 'instruction' && (i.content.text.startsWith('WEBSITE KNOWLEDGE') || i.content.source === 'website_scrape')).map((item) => {
                                                const titleMatch = item.content.text.match(/WEBSITE KNOWLEDGE \((.*?)\):/);
                                                const title = titleMatch ? titleMatch[1] : (item.content.url ? new URL(item.content.url).hostname : "Website Content");

                                                return (
                                                    <div key={item.id} className="bg-white border border-gray-100 rounded-xl shadow-sm group overflow-hidden transition-all hover:border-blue-100">
                                                        <details className="group/details">
                                                            <summary className="p-4 flex justify-between items-center cursor-pointer list-none hover:bg-gray-50 transition-colors">
                                                                <div className="flex items-center gap-3 overflow-hidden">
                                                                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                                                                        <Globe size={16} />
                                                                    </div>
                                                                    <div className="flex flex-col overflow-hidden">
                                                                        <span className="text-sm font-bold text-gray-900 truncate pr-2">{title}</span>
                                                                        <span className="text-[10px] text-gray-400 font-medium">Synced Knowledge Base</span>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-3 shrink-0">
                                                                    <ChevronDown size={14} className="text-gray-400 group-open/details:rotate-180 transition-transform" />
                                                                    <button
                                                                        onClick={async (e) => {
                                                                            e.preventDefault(); // Stop summary toggle
                                                                            if (!confirm("Remove this website content?")) return;
                                                                            await supabase.from('business_info').delete().eq('id', item.id);
                                                                            setKnowledgeItems(prev => prev.filter(k => k.id !== item.id));
                                                                            syncAssistant();
                                                                        }}
                                                                        className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                                                                    >
                                                                        <X size={14} />
                                                                    </button>
                                                                </div>
                                                            </summary>
                                                            <div className="px-4 pb-4 pt-0">
                                                                <div className="p-3 bg-slate-50 rounded-lg text-xs font-mono text-slate-600 overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap border border-slate-100 leading-relaxed">
                                                                    {item.content.text}
                                                                </div>
                                                                <div className="mt-2 text-[10px] text-center text-gray-400 italic">
                                                                    This content is synced with your AI assistant.
                                                                </div>
                                                            </div>
                                                        </details>
                                                    </div>
                                                );
                                            })}
                                        </div>



                                        {/* Service Description */}
                                        <section>
                                            <h3 className="text-base font-bold text-gray-900 mb-1">Service Description</h3>
                                            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                                                Describe what your company does in detail for the best receptionist performance.
                                            </p>
                                            <textarea
                                                value={userInfo.businessDetails}
                                                onChange={(e) => setUserInfo({ ...userInfo, businessDetails: e.target.value })}
                                                onBlur={(e) => saveProfileField('business_description', e.target.value)}
                                                rows={4}
                                                className="w-full bg-white border border-gray-200 rounded-xl p-4 text-base font-medium text-gray-900 shadow-sm focus:ring-2 focus:ring-blue-400/20 outline-none resize-none transition-all leading-relaxed placeholder-gray-400"
                                                placeholder="Describe what your company does..."
                                            />
                                        </section>

                                        {/* Common Questions */}
                                        <section>
                                            <h3 className="text-base font-bold text-gray-900 mb-1">Common Questions</h3>
                                            <p className="text-xs text-gray-500 mb-4">Provide questions that your receptionist should know the answer to</p>

                                            <div className="space-y-3">
                                                {knowledgeItems.filter(i => i.type === 'qa').map((item) => (
                                                    <div key={item.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors group relative">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <h4 className="font-bold text-gray-900 text-sm">{item.content.question}</h4>
                                                            <button
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    await supabase.from('business_info').delete().eq('id', item.id);
                                                                    setKnowledgeItems(prev => prev.filter(k => k.id !== item.id));
                                                                    syncAssistant();
                                                                }}
                                                                className="text-gray-300 hover:text-red-500 transition-colors pointer-events-auto"
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        </div>
                                                        <p className="text-xs text-gray-400">{item.content.answer}</p>
                                                    </div>
                                                ))}

                                                <button
                                                    onClick={() => setActiveModal('add-question')}
                                                    className="w-full bg-white border border-gray-200 text-gray-900 py-3.5 rounded-xl font-bold hover:bg-gray-50 active:scale-[0.98] transition-all flex items-center justify-center shadow-sm text-sm tracking-wide"
                                                >
                                                    <Plus size={18} className="mr-2" />
                                                    Add Question
                                                </button>
                                            </div>
                                        </section>

                                        {/* Additional Info (Facts) */}
                                        <section>
                                            <h3 className="text-base font-bold text-gray-900 mb-1">Additional Information</h3>
                                            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                                                Specific facts about your business (e.g. Parking, Wifi, Specials).
                                            </p>

                                            <div className="space-y-3">
                                                {knowledgeItems.filter(i => i.type === 'fact').map((item) => (
                                                    <div key={item.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex justify-between items-center group">
                                                        <span className="text-sm font-medium text-gray-900">{item.content.text}</span>
                                                        <button
                                                            onClick={async () => {
                                                                await supabase.from('business_info').delete().eq('id', item.id);
                                                                setKnowledgeItems(prev => prev.filter(k => k.id !== item.id));
                                                                syncAssistant();
                                                            }}
                                                            className="text-gray-300 hover:text-red-500 transition-colors"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                ))}

                                                {/* Add Fact Input */}
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={newFact}
                                                        onChange={(e) => setNewFact(e.target.value)}
                                                        placeholder="Add a new fact..."
                                                        className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-400/20 outline-none"
                                                        onKeyDown={async (e) => {
                                                            if (e.key === 'Enter' && newFact.trim()) {
                                                                const text = newFact.trim();
                                                                setNewFact(""); // Clear UI immediately

                                                                try {
                                                                    const { data, error } = await supabase
                                                                        .from('business_info')
                                                                        .insert([{
                                                                            owner_user_id: session.user.id,
                                                                            type: 'fact',
                                                                            content: { text: text }
                                                                        }])
                                                                        .select()
                                                                        .single();

                                                                    if (error) throw error;
                                                                    setKnowledgeItems(prev => [...prev, data]);
                                                                } catch (err) {
                                                                    console.error("Error saving fact:", err);
                                                                    showToast("Failed to save fact");
                                                                }

                                                            }
                                                        }}
                                                    />
                                                    <button
                                                        onClick={async () => {
                                                            if (newFact.trim()) {
                                                                const text = newFact.trim();
                                                                setNewFact("");

                                                                try {
                                                                    const { data, error } = await supabase
                                                                        .from('business_info')
                                                                        .insert([{
                                                                            owner_user_id: session.user.id,
                                                                            type: 'fact',
                                                                            content: { text: text }
                                                                        }])
                                                                        .select()
                                                                        .single();

                                                                    if (error) throw error;
                                                                    setKnowledgeItems(prev => [...prev, data]);
                                                                } catch (err) {
                                                                    console.error("Error saving fact:", err);
                                                                    showToast("Failed to save fact");
                                                                }
                                                            }
                                                        }}
                                                        className="bg-[#2563EB] text-white rounded-xl w-12 flex items-center justify-center shadow-lg shadow-blue-200 hover:bg-blue-600 active:scale-95 transition-all"
                                                    >
                                                        <Plus size={20} />
                                                    </button>
                                                </div>
                                            </div>
                                        </section>

                                        <div className="h-48"></div>
                                    </div>
                                </div>
                            )}

                            {activeReceptionistTab === 'phone' && (
                                <div className="pb-32">
                                    {!isForwardingSetupOpen ? (
                                        <div className="space-y-6 animate-in fade-in duration-300">

                                            {/* 1. Phone number & Demo */}
                                            <section className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
                                                <div className="flex justify-between items-center mb-4">
                                                    <div>
                                                        <h3 className="text-base font-bold text-gray-900">{personality.name}'s Number</h3>
                                                        <p className="text-xs text-gray-500 mt-0.5">Call to test your assistant</p>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            if (userInfo.vapiPhoneNumber) {
                                                                window.location.href = `tel:${userInfo.vapiPhoneNumber}`;
                                                            } else {
                                                                showToast("No number yet");
                                                            }
                                                        }}
                                                        className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full text-[11px] font-bold flex items-center gap-1 hover:bg-blue-100 transition-colors"
                                                    >
                                                        <Phone size={12} className="fill-current" /> Test Call
                                                    </button>
                                                </div>

                                                {userInfo.vapiPhoneNumber ? (
                                                    <div className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-lg font-black tracking-tight flex items-center justify-center space-x-3 text-gray-900">
                                                        <span>{userInfo.vapiPhoneNumber}</span>
                                                        <button
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(userInfo.vapiPhoneNumber);
                                                                showToast("Number copied");
                                                            }}
                                                            className="text-gray-300 hover:text-blue-500 transition-colors ml-2"
                                                        >
                                                            <Copy size={16} />
                                                        </button>
                                                    </div>
                                                ) : provisioning ? (
                                                    <div className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 font-bold flex items-center justify-center space-x-2 text-gray-400 animate-pulse">
                                                        <RefreshCw size={16} className="animate-spin" />
                                                        <span>Generating...</span>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={handleProvision}
                                                        className="w-full bg-red-50 border border-red-100 rounded-2xl px-4 py-3 font-bold flex items-center justify-center space-x-2 text-red-600 hover:bg-red-100 transition-colors"
                                                    >
                                                        <RefreshCw size={16} />
                                                        <span>Retry Number Generation</span>
                                                    </button>
                                                )}
                                            </section>

                                            {/* 2. Forwarding Status */}
                                            <section className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${forwardingMode === 'enable' && activationStep > 1 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                                                            <ArrowUpRight size={16} />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-base font-bold text-gray-900">Call Forwarding</h3>
                                                            <p className="text-xs text-gray-500 mt-0.5">Link your personal number</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {forwardingMode === 'enable' && activationStep > 1 ? (
                                                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                                                        <div className="flex items-center gap-2 text-blue-800 font-bold text-sm mb-2">
                                                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                                            Forwarding Active
                                                        </div>
                                                        <p className="text-xs text-blue-600/80 mb-3 leading-relaxed">
                                                            Your personal calls are being forwarded to your AI receptionist.
                                                        </p>
                                                        <button
                                                            onClick={() => { setForwardingMode('disable'); setIsForwardingSetupOpen(true); }}
                                                            className="text-xs font-bold text-blue-600 hover:text-blue-800 underline decoration-blue-300 underline-offset-2"
                                                        >
                                                            Disconnect / Disable Forwarding
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-3">
                                                        <button
                                                            onClick={() => {
                                                                setForwardingMode('enable');
                                                                setActivationStep(1);
                                                                setIsForwardingSetupOpen(true);
                                                            }}
                                                            className="w-full bg-blue-600 text-white py-3 rounded-2xl font-bold hover:bg-blue-700 active:scale-[0.98] transition-all shadow-md shadow-blue-200 flex items-center justify-center gap-2"
                                                        >
                                                            Setup Forwarding
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setForwardingMode('disable');
                                                                setIsForwardingSetupOpen(true);
                                                            }}
                                                            className="w-full text-red-500 py-2 rounded-xl font-bold text-xs hover:bg-red-50 transition-colors"
                                                        >
                                                            Deactivate Receptionist
                                                        </button>
                                                    </div>
                                                )}
                                            </section>

                                            {/* 4. Voicemail Toggle (Simplified) */}
                                            <section className="flex items-center justify-between bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
                                                <div>
                                                    <h3 className="text-base font-bold text-gray-900">Contact Voicemail</h3>
                                                    <p className="text-xs text-gray-500 mt-0.5">Allow contacts to bypass AI</p>
                                                </div>
                                                <div className="w-11 h-6 bg-gray-200 rounded-full relative cursor-pointer transition-colors duration-200 hover:bg-gray-300">
                                                    <div className="absolute left-[2px] top-[2px] w-5 h-5 bg-white rounded-full shadow-sm"></div>
                                                </div>
                                            </section>

                                            {/* 5. Connected Phone Number (New) */}
                                            <section>
                                                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 ml-4 mt-8">Account Phone Number</h3>
                                                <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
                                                    <div className="flex items-center gap-3 mb-4">
                                                        <PhoneCall size={20} className="text-[#2563EB] fill-current" />
                                                        <h3 className="text-base font-bold text-gray-900">Connected Phone Number</h3>
                                                    </div>

                                                    <div className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-lg font-medium text-gray-900 tracking-tight flex items-center justify-center mb-4">
                                                        {userInfo.userPhoneNumber || 'No phone number saved'}
                                                    </div>

                                                    <div className="flex items-start gap-2">
                                                        <HelpCircle size={14} className="text-[#2563EB] mt-0.5 shrink-0" />
                                                        <p className="text-xs font-bold text-[#2563EB] leading-snug cursor-pointer hover:underline">
                                                            Need to change your number or add a line? Speak to support
                                                        </p>
                                                    </div>
                                                </div>
                                            </section>

                                            <div className="h-12"></div>
                                        </div>
                                    ) : (
                                        <div className="animate-in slide-in-from-right duration-300 bg-white z-30 -mx-6 -mt-8 px-6 pt-8 pb-40">
                                            {/* Header */}
                                            <div className="flex items-center mb-6">
                                                <button
                                                    onClick={() => {
                                                        if (forwardingMode === 'enable' && activationStep > 1) {
                                                            setActivationStep(prev => prev - 1);
                                                        } else {
                                                            setIsForwardingSetupOpen(false);
                                                        }
                                                    }}
                                                    className="flex items-center text-gray-900 font-bold -ml-2 hover:bg-gray-50 px-2 py-1 rounded-lg transition-colors"
                                                >
                                                    <ChevronLeft size={22} className="mr-0.5" />
                                                    Back
                                                </button>
                                            </div>

                                            {forwardingMode === 'enable' && (
                                                <div className="space-y-6">
                                                    {activationStep === 1 && (
                                                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                                            <h2 className="text-2xl font-extrabold text-gray-900 mb-4">Turn off Live Voicemail</h2>
                                                            <p className="text-sm text-gray-500 leading-relaxed mb-6">
                                                                Turn off Live Voicemail in Apple's Settings in order to use NuPhone's AI receptionist. <span className="text-blue-500 font-bold">Learn more</span>
                                                            </p>

                                                            {/* Visual Guide */}
                                                            <div className="bg-black rounded-2xl p-5 mb-8 text-white shadow-lg">
                                                                <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-800">
                                                                    <div className="flex items-center space-x-2 text-blue-400">
                                                                        <ChevronLeft size={18} />
                                                                        <span className="font-semibold">Phone</span>
                                                                    </div>
                                                                    <span className="font-bold">Live Voicemail</span>
                                                                </div>
                                                                <div className="flex items-center justify-between bg-gray-900 rounded-xl p-4">
                                                                    <span className="font-medium">Live Voicemail</span>
                                                                    <div className="w-12 h-7 bg-[#34C759] rounded-full relative shadow-inner">
                                                                        <div className="absolute right-0.5 top-0.5 w-6 h-6 bg-white rounded-full shadow-md"></div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="bg-gray-50 rounded-2xl p-6 mb-6">
                                                                <ol className="text-sm text-gray-600 space-y-3 font-medium list-decimal list-outside ml-4">
                                                                    <li>Open the <span className="font-bold text-gray-900">Settings</span> app, then tap <span className="font-bold text-gray-900">Apps</span>.</li>
                                                                    <li>Tap <span className="font-bold text-gray-900">Phone</span>.</li>
                                                                    <li>Tap <span className="font-bold text-gray-900">Live Voicemail</span>.</li>
                                                                    <li>Turn Live Voicemail <span className="font-bold text-gray-900">off</span>.</li>
                                                                </ol>
                                                            </div>

                                                            <button className="w-full bg-white border border-gray-200 text-gray-900 py-4 rounded-2xl font-bold hover:bg-gray-50 active:scale-[0.98] transition-all shadow-sm flex items-center justify-center mb-4">
                                                                <Settings size={18} className="mr-2" />
                                                                Open Settings
                                                            </button>

                                                            <button
                                                                onClick={() => setActivationStep(2)}
                                                                className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold hover:bg-black active:scale-[0.98] transition-all shadow-lg"
                                                            >
                                                                Continue
                                                                <ArrowRight size={18} className="ml-2 inline" />
                                                            </button>
                                                        </div>
                                                    )}

                                                    {activationStep === 2 && (
                                                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                                            <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Select Carrier</h2>
                                                            <p className="text-sm text-gray-500 leading-relaxed mb-6">
                                                                Call forwarding instructions vary depending on your phone carrier
                                                            </p>

                                                            <div className="space-y-3 mb-8">
                                                                {carriers.map((carrier) => (
                                                                    <div
                                                                        key={carrier.name}
                                                                        onClick={() => setSelectedCarrier(carrier.name)}
                                                                        className={`p-4 rounded-2xl border-2 cursor-pointer flex items-center justify-between transition-all ${selectedCarrier === carrier.name ? 'border-blue-500 bg-blue-50/50' : 'border-gray-100 hover:border-gray-200'}`}
                                                                    >
                                                                        <div className="flex items-center space-x-3 font-bold text-gray-900">
                                                                            {/* Simple Icon Placeholders */}
                                                                            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-500">
                                                                                {carrier.name[0]}
                                                                            </div>
                                                                            <span>{carrier.name}</span>
                                                                        </div>
                                                                        {selectedCarrier === carrier.name && <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center"><Check size={12} className="text-white" /></div>}
                                                                    </div>
                                                                ))}
                                                            </div>

                                                            <button
                                                                onClick={() => setActivationStep(3)}
                                                                className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold hover:bg-black active:scale-[0.98] transition-all shadow-lg"
                                                            >
                                                                Continue
                                                                <ArrowRight size={18} className="ml-2 inline" />
                                                            </button>
                                                        </div>
                                                    )}

                                                    {activationStep === 3 && (
                                                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                                            <h2 className="text-xl font-extrabold text-gray-900 mb-2">Enable Call Forwarding</h2>
                                                            <p className="text-xs text-gray-500 leading-relaxed mb-6">
                                                                Call forwarding instructions vary depending on your phone carrier.
                                                            </p>

                                                            {/* Selected Carrier */}
                                                            <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center justify-between shadow-sm mb-6">
                                                                <div className="flex items-center space-x-3 text-gray-900 font-bold">
                                                                    <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center text-[10px] text-gray-500">{selectedCarrier[0]}</div>
                                                                    <span>{selectedCarrier}</span>
                                                                </div>
                                                                <button onClick={() => setActivationStep(2)} className="text-xs text-blue-500 font-bold">Change</button>
                                                            </div>

                                                            {/* Code Block */}
                                                            <div className="mb-6">
                                                                <p className="text-xs text-gray-500 mb-2">
                                                                    Dial the number below to activate call forwarding and have your receptionist handle calls instead of voicemail
                                                                </p>
                                                                <div className="flex items-center space-x-3 font-bold text-gray-900 text-lg mb-4 pl-1">
                                                                    <Copy size={20} className="text-gray-400" />
                                                                    <span>{currentCarrierConfig.code}</span>
                                                                </div>
                                                                <button className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold hover:bg-black active:scale-[0.98] transition-all flex items-center justify-center shadow-lg shadow-gray-200">
                                                                    <Phone size={20} className="mr-2 fill-current" />
                                                                    Call to Enable
                                                                </button>
                                                            </div>

                                                            {/* Warning Box */}
                                                            <div className="bg-yellow-50 border border-yellow-100 rounded-3xl p-5 mb-8">
                                                                <div className="flex items-start mb-4">
                                                                    <Info size={16} className="text-gray-500 mt-0.5 mr-2 shrink-0" />
                                                                    <div className="text-xs text-gray-600 leading-relaxed">
                                                                        <span className="font-bold text-gray-900">Warning:</span> Turn off Live Voicemail in Apple's Settings in order to use NuPhone's AI receptionist. <span className="text-blue-600 font-bold underline">Learn more</span>
                                                                    </div>
                                                                </div>

                                                                {/* Live Voicemail Preview */}
                                                                <div className="bg-black rounded-2xl p-4 shadow-lg">
                                                                    <div className="flex justify-between items-center mb-4 text-white text-xs font-medium px-1">
                                                                        <div className="flex items-center text-blue-500">
                                                                            <ChevronLeft size={16} className="mr-0.5" /> Phone
                                                                        </div>
                                                                        <span className="font-bold">Live Voicemail</span>
                                                                    </div>
                                                                    <div className="bg-[#1C1C1E] rounded-xl p-3 flex justify-between items-center">
                                                                        <span className="text-white font-medium text-sm">Live Voicemail</span>
                                                                        {/* Fake Toggle Off */}
                                                                        <div className="w-10 h-6 bg-[#39393D] rounded-full relative">
                                                                            <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-sm"></div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Verify Activation */}
                                                            <div>
                                                                <h3 className="font-bold text-gray-900 text-sm mb-1">Verify Activation</h3>
                                                                <p className="text-xs text-gray-500 mb-4">Test if your calls are being forwarded to your receptionist.</p>
                                                                <button
                                                                    onClick={() => {
                                                                        setIsReceptionistActive(true);
                                                                        setIsForwardingSetupOpen(false);
                                                                        setToast("AI Receptionist Activated");
                                                                        setTimeout(() => setToast(null), 3000);
                                                                    }}
                                                                    className="w-full bg-white border border-gray-200 text-gray-900 py-3.5 rounded-2xl font-bold hover:bg-gray-50 active:scale-[0.98] transition-all shadow-sm"
                                                                >
                                                                    Verify
                                                                </button>
                                                            </div>
                                                            <div className="h-24"></div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {forwardingMode === 'disable' && (
                                                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                                    <h2 className="text-xl font-extrabold text-gray-900 mb-2">Disable Call Forwarding</h2>
                                                    <p className="text-xs text-gray-500 leading-relaxed mb-6">
                                                        Deactivation instructions vary depending on your phone carrier.
                                                    </p>

                                                    {/* Selected Carrier */}
                                                    {/* Carrier Dropdown */}
                                                    <div className="relative mb-6">
                                                        <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                                                            <div className="flex items-center space-x-3 text-gray-900 font-bold">
                                                                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-500 font-bold">
                                                                    {selectedCarrier[0]}
                                                                </div>
                                                                <span>{selectedCarrier}</span>
                                                            </div>
                                                            <ChevronDown size={20} className="text-gray-400" />
                                                        </div>
                                                        <select
                                                            value={selectedCarrier}
                                                            onChange={(e) => setSelectedCarrier(e.target.value)}
                                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                        >
                                                            {carriers.map(c => (
                                                                <option key={c.name} value={c.name}>{c.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    {/* Code Block */}
                                                    <div className="mb-8">
                                                        <p className="text-xs text-gray-500 mb-2">
                                                            Dial the number below to remove call forwarding.
                                                        </p>
                                                        <div className="flex items-center space-x-3 font-bold text-gray-900 text-lg mb-4 pl-1">
                                                            <Copy size={20} className="text-gray-400" />
                                                            <span>{currentCarrierConfig.disableCode}</span>
                                                        </div>
                                                        <button className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold hover:bg-black active:scale-[0.98] transition-all flex items-center justify-center shadow-lg shadow-gray-200">
                                                            <Phone size={20} className="mr-2 fill-current" />
                                                            Call to Disable
                                                        </button>
                                                    </div>

                                                    {/* Verify Deactivation */}
                                                    <div>
                                                        <h3 className="font-bold text-gray-900 text-sm mb-1">Verify Deactivation</h3>
                                                        <p className="text-xs text-gray-500 mb-4">Test if your calls are being sent to voicemail.</p>
                                                        <button
                                                            onClick={() => {
                                                                setIsReceptionistActive(false);
                                                                setIsForwardingSetupOpen(false);
                                                                setToast("AI Receptionist Deactivated");
                                                                setTimeout(() => setToast(null), 3000);
                                                            }}
                                                            className="w-full bg-white border border-gray-200 text-gray-900 py-3.5 rounded-2xl font-bold hover:bg-gray-50 active:scale-[0.98] transition-all shadow-sm"
                                                        >
                                                            Verify
                                                        </button>
                                                    </div>
                                                    <div className="h-24"></div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )
            }

            {/* =========================================
               CALL DETAIL (Overlay)
               ========================================= */}
            {
                view === 'call-detail' && selectedCall && (
                    <div className="absolute inset-0 z-[60] bg-[#F9FAFB] flex flex-col h-full animate-in slide-in-from-right duration-300">
                        {/* Header */}
                        <div className="px-6 pt-12 pb-4 flex justify-between items-center z-20 bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0">
                            <button onClick={() => setView('inbox')} className="w-10 h-10 -ml-2 rounded-full items-center justify-center flex hover:bg-gray-100 transition-colors text-gray-900">
                                <ChevronLeft size={28} />
                            </button>
                            <h1 className="text-base font-bold text-gray-900">Call Details</h1>
                            <button
                                onClick={() => showToast('Shared transcript')}
                                className="w-10 h-10 -mr-2 rounded-full items-center justify-center flex hover:bg-gray-100 transition-colors text-gray-900"
                            >
                                <Share2 size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 pb-48 space-y-4">
                            {/* Contact Card */}
                            <div className="bg-white rounded-[2rem] p-6 border border-gray-200 shadow-sm text-center relative overflow-hidden">
                                <div className="w-24 h-24 bg-gray-50 rounded-full mx-auto flex items-center justify-center mb-4 text-3xl font-bold text-gray-300 border border-gray-100 shadow-inner">
                                    {selectedCall.name.charAt(0)}
                                </div>
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight">{selectedCall.name}</h2>
                                <p className="text-gray-500 font-medium mt-1 mb-4">{selectedCall.number}</p>

                                <button
                                    onClick={() => showToast("Added to Contacts")}
                                    className="text-xs font-bold text-gray-600 bg-gray-50 border border-gray-200 px-4 py-2 rounded-full hover:bg-gray-100 transition-colors flex items-center mx-auto"
                                >
                                    <UserPlus size={14} className="mr-1.5" />
                                    Add to Contacts
                                </button>

                                <div className="grid grid-cols-2 gap-3 mt-8">
                                    <button className="bg-[#2563EB] text-white py-3.5 rounded-2xl font-bold shadow-lg shadow-blue-200 flex items-center justify-center active:scale-95 transition-all hover:bg-blue-600">
                                        <Phone size={18} className="mr-2" /> Call
                                    </button>
                                    <button className="bg-white border border-gray-200 text-gray-900 py-3.5 rounded-2xl font-bold flex items-center justify-center active:scale-95 transition-all hover:bg-gray-50 shadow-sm">
                                        <MessageSquare size={18} className="mr-2" /> Text
                                    </button>
                                </div>
                            </div>

                            {/* Summary & Actions */}
                            <div className="bg-white rounded-[2rem] p-6 border border-gray-200 shadow-sm">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <div className="w-1 h-1 rounded-full bg-gray-300"></div> Summary
                                </h3>
                                <p className="text-gray-900 leading-relaxed font-medium">
                                    {selectedCall.summary}
                                </p>

                                {/* Action Item Card */}
                                {selectedCall.actionItem && (
                                    <div className="mt-6 bg-blue-50 border border-blue-100 rounded-2xl p-5 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-16 h-16 bg-blue-100 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none"></div>
                                        <div className="flex items-center gap-4 mb-4 relative z-10">
                                            <div className="w-12 h-12 bg-white text-blue-600 rounded-xl border border-blue-100 shadow-sm flex items-center justify-center shrink-0">
                                                <Calendar size={22} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900 text-sm">{selectedCall.actionItem.label}</h4>
                                                <p className="text-blue-600 text-xs font-bold mt-0.5">
                                                    {selectedCall.actionItem.summary || "Appointment confirmed"}
                                                </p>
                                                <p className="text-gray-400 text-[10px] font-medium mt-0.5">
                                                    {selectedCall.actionItem.displayTime}
                                                </p>
                                            </div>
                                        </div>
                                        {selectedCall.actionItem.link && (
                                            <a
                                                href={selectedCall.actionItem.link}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="block w-full text-center bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-bold py-3 rounded-xl transition-all shadow-md shadow-blue-100 relative z-10"
                                            >
                                                View on Calendar
                                            </a>
                                        )}
                                    </div>
                                )}

                                {/* Audio Player */}
                                {selectedCall.recordingUrl && (
                                    <div className="mt-8 pt-6 border-t border-gray-100">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <div className="w-1 h-1 rounded-full bg-gray-300"></div> Recording
                                        </h4>
                                        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex items-center gap-4">
                                            <button
                                                onClick={() => {
                                                    const audio = new Audio(selectedCall.recordingUrl);
                                                    audio.play();
                                                }}
                                                className="w-12 h-12 bg-white rounded-full shadow-sm border border-gray-100 flex items-center justify-center text-gray-900 hover:scale-105 active:scale-95 transition-all text-[#2563EB]">
                                                <Play size={20} className="ml-1 fill-current" />
                                            </button>
                                            <div className="flex-1 h-10 flex items-center gap-1 opacity-50">
                                                {/* Mock Waveform */}
                                                {Array.from({ length: 24 }).map((_, i) => (
                                                    <div key={i} className={`w-1 rounded-full bg-gray-400 ${i % 3 === 0 ? 'h-6' : 'h-3'}`} style={{ height: `${Math.max(20, Math.random() * 100)}%` }}></div>
                                                ))}
                                            </div>
                                            <a href={selectedCall.recordingUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-gray-500 hover:text-gray-900 bg-white border border-gray-200 px-3 py-1.5 rounded-lg transition-colors">Download</a>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Transcript */}
                            <div className="bg-white rounded-[2rem] p-6 border border-gray-200 shadow-sm">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <div className="w-1 h-1 rounded-full bg-gray-300"></div> Transcript
                                </h3>
                                <div className="space-y-4">
                                    {selectedCall.transcript ? (
                                        <div className="text-sm font-medium leading-relaxed text-gray-700 whitespace-pre-wrap font-mono text-[13px] bg-gray-50 p-4 rounded-xl border border-gray-100">
                                            {selectedCall.transcript}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-400 italic">No transcript available.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* =========================================
               ONBOARDING VIEW (Premium Wizard)
               ========================================= */}
            {
                view === 'onboarding' && (
                    <div className="fixed inset-0 z-[9999] flex flex-col bg-gradient-to-b from-[#F5F6FA] via-[#EEF2FF] to-[#E6ECFF]">
                        {/* Navigation: Back or Sign Out */}
                        <div className="absolute top-6 left-6 z-50">
                            {onboardingStep > 0 && onboardingStep < 10 && (
                                <button
                                    onClick={() => {
                                        if (onboardingStep === 1) {
                                            setView('auth');
                                        } else {
                                            setOnboardingStep(s => s - 1);
                                        }
                                    }}
                                    className="px-4 py-2 bg-white/50 backdrop-blur-sm border border-gray-200 rounded-full text-gray-600 font-semibold text-sm hover:bg-white hover:text-gray-900 transition-all flex items-center gap-1 shadow-sm"
                                >
                                    <ChevronLeft size={16} />
                                    Back
                                </button>
                            )}
                        </div>

                        {/* Progress Bar (Visible from Step 1 to 9) */}
                        {onboardingStep > 0 && onboardingStep < 10 && (
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-gray-100">
                                <div
                                    className="h-full bg-blue-600 transition-all duration-500 ease-out"
                                    style={{ width: `${(onboardingStep / 10) * 100}%` }}
                                ></div>
                            </div>
                        )}

                        <div className="absolute top-6 right-6 z-50">
                            {/* Sign Out Removed */}
                        </div>

                        {/* Step 0: Landing */}
                        {/* Step 0: Landing (REMOVED - Consolidated with Auth View) */}

                        {/* Container for Wizard Steps */}
                        {onboardingStep > 0 && (
                            <div className="h-full flex flex-col p-6 max-w-md mx-auto w-full justify-center animate-in slide-in-from-right duration-500">

                                {/* Step 1: Phone Vewrification */}
                                {/* ##### Step 1 - Enter Number ##### */}
                                {onboardingStep === 1 && (
                                    <>
                                        <h2 className="text-3xl font-black text-gray-900 mb-4 leading-tight">What's your number?</h2>
                                        <p className="text-gray-500 font-medium mb-8">We'll use this to create your account.</p>

                                        <div className="space-y-6">
                                            <div>
                                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Mobile Number</label>
                                                <input
                                                    autoFocus
                                                    type="tel"
                                                    className="w-full bg-transparent border-b-2 border-gray-200 text-3xl font-bold text-black focus:outline-none focus:border-blue-600 pb-2 placeholder-gray-300 transition-colors"
                                                    placeholder="(555) 123-4567"
                                                    value={authPhone}
                                                    onChange={e => setAuthPhone(e.target.value)}
                                                />
                                            </div>

                                            {authError && (
                                                <div className="p-3 bg-red-50 text-red-600 font-medium text-sm rounded-xl flex items-center gap-2">
                                                    <ShieldAlert size={16} /> {authError}
                                                </div>
                                            )}

                                            <button
                                                onClick={async () => {
                                                    setAuthLoading(true);
                                                    setAuthError(null);
                                                    try {
                                                        // Create real Supabase user via backend (bypasses SMS)
                                                        const res = await fetch('/api/dev-signup', {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ phone: authPhone })
                                                        });
                                                        const result = await res.json();

                                                        if (!res.ok || result.error) {
                                                            throw new Error(result.error || 'Signup failed');
                                                        }

                                                        // Set real Supabase session
                                                        await supabase.auth.setSession({
                                                            access_token: result.accessToken,
                                                            refresh_token: result.refreshToken
                                                        });

                                                        const { data: { session: newSession } } = await supabase.auth.getSession();
                                                        setSession(newSession);
                                                        console.log('✅ Real session established for:', result.userId);
                                                        showToast('Account created!');
                                                        setOnboardingStep(2);
                                                    } catch (err) {
                                                        console.error('Signup error:', err);
                                                        setAuthError(err.message);
                                                    } finally {
                                                        setAuthLoading(false);
                                                    }
                                                }}
                                                disabled={authLoading || authPhone.length < 10}
                                                className="w-full bg-white text-blue-600 border border-gray-100 py-4 rounded-full font-bold text-lg shadow-[0_4px_20px_rgba(0,0,0,0.08)] disabled:opacity-50 mt-8 hover:shadow-[0_4px_25px_rgba(37,99,235,0.15)] transition-all"
                                            >
                                                {authLoading ? 'Creating Account...' : 'Continue'}
                                            </button>
                                        </div>
                                    </>
                                )}

                                {/* Step 2: OTP Verification */}
                                {/* ##### Step 2 - Verification ##### */}
                                {onboardingStep === 2 && (
                                    <>
                                        <h2 className="text-3xl font-black text-gray-900 mb-4 leading-tight">Enter the code</h2>
                                        <p className="text-gray-500 font-medium mb-8">We sent a text to {authPhone}.</p>

                                        <div className="space-y-6">
                                            <div>
                                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">6-Digit Code</label>
                                                <input
                                                    autoFocus
                                                    type="text"
                                                    maxLength={6}
                                                    className="w-full bg-transparent border-b-2 border-gray-200 text-3xl font-bold text-black focus:outline-none focus:border-blue-600 pb-2 placeholder-gray-300 transition-colors tracking-widest"
                                                    placeholder="123456"
                                                    value={otpCode}
                                                    onChange={e => setOtpCode(e.target.value)}
                                                />
                                            </div>

                                            {authError && (
                                                <div className="p-3 bg-red-50 text-red-600 font-medium text-sm rounded-xl flex items-center gap-2">
                                                    <ShieldAlert size={16} /> {authError}
                                                </div>
                                            )}

                                            <button
                                                onClick={() => {
                                                    // Skip OTP verification for now (SMS not active)
                                                    console.log('⏭️ Skipping OTP verification');
                                                    setOnboardingStep(3);
                                                }}
                                                className="w-full bg-white text-blue-600 border border-gray-100 py-4 rounded-full font-bold text-lg shadow-[0_4px_20px_rgba(0,0,0,0.08)] mt-8 hover:shadow-[0_4px_25px_rgba(37,99,235,0.15)] transition-all"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </>
                                )}

                                {/* Step 3: Secure Account (Password) */}
                                {/* ##### Step 3 - Secure Account ##### */}
                                {onboardingStep === 3 && (
                                    <>
                                        <h2 className="text-3xl font-black text-gray-900 mb-4 leading-tight">Secure your account</h2>
                                        <p className="text-gray-500 font-medium mb-8">Create a password for web access.</p>

                                        <div className="space-y-6">
                                            <div>
                                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Password</label>
                                                <input
                                                    autoFocus
                                                    type="password"
                                                    className="w-full bg-transparent border-b-2 border-gray-200 text-2xl font-bold text-black focus:outline-none focus:border-blue-600 pb-2 placeholder-gray-300 transition-colors"
                                                    placeholder="Minimum 8 characters"
                                                    value={onboardingData.password}
                                                    onChange={e => setOnboardingData({ ...onboardingData, password: e.target.value })}
                                                />
                                            </div>

                                            <button
                                                onClick={async () => {
                                                    if (onboardingData.password.length < 8) {
                                                        showToast("Password too short");
                                                        return;
                                                    }
                                                    setAuthLoading(true);
                                                    try {
                                                        await supabase.auth.updateUser({ password: onboardingData.password });
                                                    } catch (e) {
                                                        console.warn("Dev Bypass: Password Set Failed", e);
                                                    } finally {
                                                        setAuthLoading(false);
                                                        // Always move forward for Dev Bypass
                                                        setOnboardingStep(4);
                                                    }
                                                }}
                                                disabled={authLoading || onboardingData.password.length < 8}
                                                className="w-full bg-white text-blue-600 border border-gray-100 py-4 rounded-full font-bold text-lg shadow-[0_4px_20px_rgba(0,0,0,0.08)] disabled:opacity-50 mt-8 hover:shadow-[0_4px_25px_rgba(37,99,235,0.15)] transition-all"
                                            >
                                                Create Account
                                            </button>
                                        </div>
                                    </>
                                )}

                                {/* Step 4: Trial / Pricing */}
                                {/* ##### Step 4 - Trial/Pricing ##### */}
                                {onboardingStep === 4 && (
                                    <>
                                        <div className="text-center mb-6">
                                            <div className="inline-block px-3 py-1 bg-blue-100 text-blue-700 font-bold text-xs rounded-full uppercase tracking-wider mb-4">
                                                7 Day Free Trial
                                            </div>
                                            <h2 className="text-3xl font-black text-gray-900 mb-2 leading-tight">Try JunoDesk Free</h2>
                                            <p className="text-gray-500 font-medium">Cancel anytime. No commitment.</p>
                                        </div>

                                        {/* Plan Toggle */}
                                        <div className="bg-gray-100 p-1 rounded-xl flex mb-6">
                                            <button
                                                onClick={() => setPlanCycle('monthly')}
                                                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${planCycle === 'monthly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                            >
                                                Monthly
                                            </button>
                                            <button
                                                onClick={() => setPlanCycle('annual')}
                                                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${planCycle === 'annual' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                            >
                                                Annual <span className="text-[10px] text-green-600 ml-1">SAVE 30%</span>
                                            </button>
                                        </div>

                                        <div className="border-2 border-gray-100 bg-white p-6 rounded-3xl relative mb-6 shadow-sm">
                                            <div className="flex justify-between items-center mb-4">
                                                <div>
                                                    <div className="text-xl font-bold text-gray-900">Professional</div>
                                                    <div className="text-sm text-gray-500">Everything included</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-3xl font-black text-gray-900">
                                                        {planCycle === 'annual' ? '$14' : '$19'}
                                                        <span className="text-sm font-medium text-gray-500">/mo</span>
                                                    </div>
                                                    {planCycle === 'annual' && <div className="text-[10px] text-gray-400 font-medium">Billed $168 yearly</div>}
                                                </div>
                                            </div>
                                            <ul className="space-y-3">
                                                {['24/7 AI Receptionist', 'Unlimited Call Minutes', 'Instant Transcripts', 'Spam Blocking'].map(i => (
                                                    <li key={i} className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                                        <div className="bg-green-100 p-1 rounded-full"><Check size={10} className="text-green-700" /></div>
                                                        {i}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <button
                                            onClick={async () => {
                                                setAuthLoading(true);
                                                try {
                                                    // Save subscription type to profile
                                                    const { error: subError } = await supabase
                                                        .from('business_profiles')
                                                        .update({ subscription_type: planCycle })
                                                        .eq('owner_user_id', session.user.id);

                                                    if (subError) {
                                                        console.warn('Failed to save subscription type:', subError);
                                                    } else {
                                                        console.log('✅ Subscription type saved:', planCycle);
                                                    }

                                                    // Trigger provisioning (assistant + phone number)
                                                    console.log('🚀 Triggering provisioning after subscription...');
                                                    const provisionRes = await fetch('/api/provision', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({
                                                            userId: session.user.id,
                                                            subscriptionType: planCycle
                                                        })
                                                    });

                                                    const provisionData = await provisionRes.json();

                                                    if (provisionRes.ok && provisionData.success) {
                                                        console.log('✅ Provisioning complete:', provisionData);
                                                        setUserInfo(prev => ({
                                                            ...prev,
                                                            vapiPhoneNumber: provisionData.phoneNumber,
                                                            vapiAssistantId: provisionData.assistantId,
                                                            profileId: provisionData.profileId
                                                        }));

                                                        // Re-fetch profile to get any existing data
                                                        const { data: refreshedProfile } = await supabase
                                                            .from('business_profiles')
                                                            .select('*')
                                                            .eq('owner_user_id', session.user.id)
                                                            .maybeSingle();

                                                        if (refreshedProfile) {
                                                            setUserInfo(prev => ({
                                                                ...prev,
                                                                company: refreshedProfile.company_name || prev.company,
                                                                businessType: refreshedProfile.industry || prev.businessType,
                                                                profileId: refreshedProfile.id || prev.profileId
                                                            }));
                                                        }
                                                        showToast('Phone number assigned!');
                                                    } else {
                                                        console.warn('⚠️ Provisioning warning:', provisionData.error);
                                                        showToast('Continue setup to get your number');
                                                    }

                                                    setOnboardingStep(5);
                                                } catch (err) {
                                                    console.error('Step 4 error:', err);
                                                    // Continue even if provisioning fails - they can retry later
                                                    setOnboardingStep(5);
                                                } finally {
                                                    setAuthLoading(false);
                                                }
                                            }}
                                            disabled={authLoading}
                                            className="w-full bg-white text-blue-600 border border-gray-100 py-4 rounded-full font-bold text-lg shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_25px_rgba(37,99,235,0.15)] transition-all disabled:opacity-50"
                                        >
                                            {authLoading ? 'Setting up...' : 'Start Free Trial'}
                                        </button>
                                        <p className="text-center text-xs text-gray-400 font-medium mt-4">No charge until trial ends.</p>
                                    </>
                                )}

                                {/* Step 5: Capabilities */}
                                {/* ##### Step 5 - Capabilities ##### */}
                                {onboardingStep === 5 && (
                                    <>
                                        <h2 className="text-3xl font-black text-gray-900 mb-4 leading-tight">What should your receptionist do?</h2>
                                        <p className="text-gray-500 font-medium mb-8">Customize its capabilities.</p>

                                        <div className="space-y-4">
                                            {[
                                                { id: 'takeMessages', label: 'Take Detailed Messages', desc: 'Capture name, number, and reason.' },
                                                { id: 'scheduleAppointments', label: 'Schedule Appointments', desc: 'Book meetings directly on your calendar.' },
                                                { id: 'handleBilling', label: 'Handle Billing Inquiries', desc: 'Answer basic questions about invoices.' }
                                            ].map(cap => (
                                                <div
                                                    key={cap.id}
                                                    onClick={() => setOnboardingData({
                                                        ...onboardingData,
                                                        capabilities: {
                                                            ...onboardingData.capabilities,
                                                            [cap.id]: !onboardingData.capabilities[cap.id]
                                                        }
                                                    })}
                                                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${onboardingData.capabilities[cap.id] ? 'border-blue-600 bg-blue-50' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                                                >
                                                    <div className={`mt-1 w-5 h-5 rounded border flex items-center justify-center transition-colors ${onboardingData.capabilities[cap.id] ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}>
                                                        {onboardingData.capabilities[cap.id] && <Check size={14} className="text-white" />}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-900 text-sm">{cap.label}</div>
                                                        <div className="text-xs text-gray-500 font-medium mt-1">{cap.desc}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <button
                                            onClick={() => {
                                                setOnboardingStep(6);
                                            }}
                                            className="w-full bg-white text-blue-600 border border-gray-100 py-4 rounded-full font-bold text-lg shadow-[0_4px_20px_rgba(0,0,0,0.08)] mt-8 hover:shadow-[0_4px_25px_rgba(37,99,235,0.15)] transition-all"
                                        >
                                            Continue
                                        </button>
                                    </>
                                )}

                                {/* Step 6: Business Info */}
                                {/* ##### Step 6 - Business Info ##### */}
                                {onboardingStep === 6 && (
                                    <>
                                        <h2 className="text-3xl font-black text-gray-900 mb-2 leading-tight">Tell us about your business</h2>
                                        <p className="text-gray-500 font-medium mb-8">We'll scan your website to learn.</p>

                                        <div className="space-y-6">
                                            <div>
                                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Business Name</label>
                                                <input
                                                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold text-black focus:outline-none focus:border-blue-600 transition-colors"
                                                    placeholder="Acme Corp"
                                                    value={onboardingData.companyName}
                                                    onChange={e => setOnboardingData({ ...onboardingData, companyName: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Industry</label>
                                                <select
                                                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold text-black focus:outline-none focus:border-blue-600 transition-colors appearance-none"
                                                    value={userInfo.businessType}
                                                    onChange={e => setUserInfo({ ...userInfo, businessType: e.target.value })}
                                                >
                                                    <option value="">Select Industry...</option>
                                                    <option value="Health">Medical / Dental</option>
                                                    <option value="Home Services">Home Services (Plumbing, HVAC)</option>
                                                    <option value="Legal">Legal</option>
                                                    <option value="Tech">Technology / Agency</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Website URL (Optional)</label>
                                                <input
                                                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold text-black focus:outline-none focus:border-blue-600 transition-colors"
                                                    placeholder="example.com"
                                                    value={onboardingData.website}
                                                    onChange={e => setOnboardingData({ ...onboardingData, website: e.target.value })}
                                                    onBlur={e => {
                                                        let val = e.target.value.trim();
                                                        if (val && !val.startsWith('http://') && !val.startsWith('https://')) {
                                                            val = 'https://' + val;
                                                            setOnboardingData(prev => ({ ...prev, website: val }));
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <button
                                            disabled={!onboardingData.companyName}
                                            onClick={async () => {
                                                // Save business info to profile using id (profile exists from provisioning)
                                                const { error: profileError } = await supabase
                                                    .from('business_profiles')
                                                    .update({
                                                        company_name: onboardingData.companyName,
                                                        industry: userInfo.businessType,
                                                        website: onboardingData.website
                                                    })
                                                    .eq('id', userInfo.profileId);

                                                if (profileError) {
                                                    console.warn('Failed to save business info:', profileError);
                                                } else {
                                                    console.log('✅ Business info saved:', {
                                                        company: onboardingData.companyName,
                                                        industry: userInfo.businessType,
                                                        website: onboardingData.website
                                                    });
                                                }

                                                setOnboardingStep(7);
                                            }}
                                            className="w-full bg-white text-blue-600 border border-gray-100 py-4 rounded-full font-bold text-lg shadow-[0_4px_20px_rgba(0,0,0,0.08)] disabled:opacity-50 mt-8 hover:shadow-[0_4px_25px_rgba(37,99,235,0.15)] transition-all"
                                        >
                                            Continue
                                        </button>
                                    </>
                                )}

                                {/* Step 7: Persona */}
                                {/* ##### Step 7 - Voice Selection ##### */}
                                {onboardingStep === 7 && (
                                    <>
                                        <h2 className="text-3xl font-black text-gray-900 mb-4 leading-tight">Choose a Voice</h2>

                                        <div className="grid grid-cols-3 gap-3 mb-6">
                                            {FALLBACK_VOICES.map(voice => {
                                                const isSelected = onboardingData.voiceId === voice.id;
                                                const isPlaying = playingVoiceId === voice.id;
                                                return (
                                                    <button
                                                        key={voice.id}
                                                        onClick={async () => {
                                                            setOnboardingData({ ...onboardingData, voiceId: voice.id });
                                                            // Play Local Preview
                                                            setPlayingVoiceId(voice.id);
                                                            try {
                                                                const audio = new Audio(voice.preview);
                                                                audio.onended = () => setPlayingVoiceId(null);
                                                                audio.onerror = () => setPlayingVoiceId(null);
                                                                await audio.play();
                                                            } catch (e) {
                                                                console.error("Preview play failed", e);
                                                                setPlayingVoiceId(null);
                                                            }
                                                        }}
                                                        className={`relative flex flex-col items-center justify-center p-2 transition-all ${isSelected ? 'scale-110' : 'hover:scale-105'}`}
                                                    >
                                                        <div className={`w-20 h-20 rounded-full overflow-hidden relative transition-all ${isSelected ? 'ring-4 ring-blue-500 ring-offset-2 ring-offset-white shadow-[0_0_20px_rgba(37,99,235,0.5)]' : 'ring-2 ring-gray-200'}`}>
                                                            <img src={voice.avatar} alt={voice.name} className="w-full h-full object-cover" />
                                                            {isPlaying && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><AudioWaveform size={20} className="text-white animate-pulse" /></div>}
                                                        </div>
                                                        <span className={`text-xs font-bold mt-3 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`}>{voice.name}</span>
                                                        {isSelected && <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-lg"><div className="w-2 h-2 bg-white rounded-full"></div></div>}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        <div className="mb-6">
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Initial Greeting</label>
                                            <textarea
                                                className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl p-4 font-medium text-gray-900 focus:outline-none focus:border-blue-600 resize-none h-24"
                                                value={onboardingData.greeting}
                                                onChange={e => setOnboardingData({ ...onboardingData, greeting: e.target.value })}
                                            />
                                        </div>

                                        <button
                                            onClick={async () => {
                                                // Save voice_id to profile
                                                const { error: voiceError } = await supabase
                                                    .from('business_profiles')
                                                    .update({ voice_id: onboardingData.voiceId })
                                                    .eq('owner_user_id', session.user.id);

                                                if (voiceError) {
                                                    console.warn('Failed to save voice:', voiceError);
                                                } else {
                                                    console.log('✅ Voice saved:', onboardingData.voiceId);
                                                }

                                                // Save greeting to business_info
                                                if (onboardingData.greeting) {
                                                    console.log('💾 Saving greeting:', onboardingData.greeting);
                                                    const { data: existingGreeting, error: checkErr } = await supabase
                                                        .from('business_info')
                                                        .select('id')
                                                        .eq('owner_user_id', session.user.id)
                                                        .eq('type', 'greeting')
                                                        .maybeSingle();

                                                    if (checkErr) console.error('❌ Greeting check error:', checkErr);

                                                    if (existingGreeting) {
                                                        const { error: updErr } = await supabase
                                                            .from('business_info')
                                                            .update({ content: { text: onboardingData.greeting } })
                                                            .eq('id', existingGreeting.id);
                                                        if (updErr) console.error('❌ Greeting update error:', updErr);
                                                        else console.log('✅ Greeting updated');
                                                    } else {
                                                        const { error: insErr } = await supabase
                                                            .from('business_info')
                                                            .insert({
                                                                owner_user_id: session.user.id,
                                                                type: 'greeting',
                                                                content: { text: onboardingData.greeting }
                                                            });
                                                        if (insErr) console.error('❌ Greeting insert error:', insErr);
                                                        else console.log('✅ Greeting inserted');
                                                    }
                                                } else {
                                                    console.log('⚠️ No greeting to save');
                                                }

                                                // Update local state immediately so instructions tab shows data
                                                setGreeting(onboardingData.greeting || '');
                                                const voiceMatch = FALLBACK_VOICES.find(v => v.id === onboardingData.voiceId);
                                                setPersonality(prev => ({
                                                    ...prev,
                                                    voiceId: onboardingData.voiceId,
                                                    name: voiceMatch?.name || prev.name
                                                }));

                                                // Trigger website scraping if website exists
                                                if (onboardingData.website) {
                                                    const url = onboardingData.website.startsWith('http') ? onboardingData.website : `https://${onboardingData.website}`;
                                                    fetch('/api/scrape-website', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ url, userId: session.user.id })
                                                    }).catch(err => console.warn('Scrape trigger failed', err));
                                                }

                                                setOnboardingStep(8);
                                            }}
                                            className="w-full bg-white text-blue-600 border border-gray-100 py-4 rounded-full font-bold text-lg shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_25px_rgba(37,99,235,0.15)] transition-all"
                                        >
                                            Finish Setup
                                        </button>
                                    </>
                                )}

                                {/* Step 8: Configure iPhone (Live Voicemail) - Updated Design */}
                                {/* ##### Step 8 - Configure iPhone ##### */}
                                {onboardingStep === 8 && (
                                    <>
                                        <div className="flex items-center mb-6">
                                            <button
                                                onClick={() => setOnboardingStep(7)}
                                                className="flex items-center text-gray-500 font-bold -ml-2 hover:bg-gray-50 px-2 py-1 rounded-lg transition-colors text-sm"
                                            >
                                                <ChevronLeft size={20} className="mr-0.5" />
                                                Back
                                            </button>
                                        </div>

                                        <div className="flex justify-center mb-6">
                                            <div className="w-16 h-16 bg-gray-900 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-gray-200">
                                                <Settings size={32} />
                                            </div>
                                        </div>

                                        <h2 className="text-2xl font-black text-gray-900 mb-2 text-center leading-tight">Configure iPhone</h2>
                                        <p className="text-gray-500 font-medium text-center mb-8">For optimal call forwarding.</p>


                                        {/* Visual Guide (Black Box from Settings Tab) */}
                                        <div className="bg-black rounded-3xl p-5 mb-8 text-white shadow-xl shadow-gray-200/50">
                                            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-800">
                                                <div className="flex items-center space-x-2 text-blue-500">
                                                    <ChevronLeft size={18} />
                                                    <span className="font-semibold">Phone</span>
                                                </div>
                                                <span className="font-bold">Live Voicemail</span>
                                            </div>
                                            <div className="flex items-center justify-between bg-gray-900 rounded-2xl p-4">
                                                <span className="font-medium">Live Voicemail</span>
                                                <div className="w-12 h-7 bg-[#34C759] rounded-full relative shadow-inner">
                                                    <div className="absolute right-0.5 top-0.5 w-6 h-6 bg-white rounded-full shadow-md"></div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 rounded-3xl p-6 mb-8 border border-gray-100">
                                            <ol className="text-sm text-gray-600 space-y-4 font-bold list-decimal list-outside ml-4">
                                                <li>Open <span className="text-gray-900">Settings</span> application.</li>
                                                <li>Tap <span className="text-gray-900">Phone</span>.</li>
                                                <li>Tap <span className="text-gray-900">Live Voicemail</span>.</li>
                                                <li>Turn Live Voicemail <span className="text-gray-900">off</span>.</li>
                                            </ol>
                                        </div>

                                        <button className="w-full bg-white border border-gray-200 text-gray-900 py-4 rounded-full font-bold hover:bg-gray-50 active:scale-[0.98] transition-all shadow-sm flex items-center justify-center mb-4">
                                            <Settings size={18} className="mr-2" />
                                            Open Settings
                                        </button>

                                        <button
                                            onClick={() => setOnboardingStep(9)}
                                            className="w-full bg-white text-blue-600 border border-gray-100 py-4 rounded-full font-bold text-lg shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_25px_rgba(37,99,235,0.15)] transition-all"
                                        >
                                            Done, it's off
                                        </button>
                                    </>
                                )}

                                {/* Step 9: Carrier & Activation Code */}
                                {/* ##### Step 9 - Activation ##### */}
                                {onboardingStep === 9 && (
                                    <>
                                        <h2 className="text-3xl font-black text-gray-900 mb-4 leading-tight">Activate Call Forwarding</h2>
                                        <p className="text-gray-500 font-medium mb-6">Select your carrier to get the code.</p>

                                        <div className="mb-8">
                                            <div className="relative">
                                                <select
                                                    className="w-full text-left bg-white border-2 border-gray-100 rounded-2xl px-6 py-4 font-bold text-gray-900 appearance-none focus:outline-none focus:border-blue-600 transition-all shadow-sm"
                                                    value={selectedCarrier}
                                                    onChange={e => setSelectedCarrier(e.target.value)}
                                                >
                                                    {[...carriers, { name: 'Other', code: '*72' }].map(c => (
                                                        <option key={c.name} value={c.name}>{c.name}</option>
                                                    ))}
                                                </select>
                                                <div className="absolute top-1/2 right-6 -translate-y-1/2 pointer-events-none text-gray-500">
                                                    <ChevronDown size={20} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-gray-100 p-6 rounded-3xl mb-8 text-center relative border border-gray-200">
                                            <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">Dial this code</div>
                                            <div className="text-2xl font-mono font-bold text-gray-900 mb-2 select-all">
                                                {(selectedCarrier === 'Other' ? '*72' : (currentCarrierConfig?.code || "")).replace('(513) 327-7680', userInfo.vapiPhoneNumber || '...')}
                                            </div>
                                            <div className="text-xs text-blue-600 font-semibold cursor-pointer active:scale-95" onClick={() => showToast("Copied!")}>Tap to copy</div>
                                        </div>

                                        <button
                                            onClick={async () => {
                                                showToast("Finishing setup...");

                                                try {
                                                    // 1. Save Profile using id (profile exists from provisioning)
                                                    const phoneWithPlus = authPhone.startsWith('+') ? authPhone : `+1${authPhone}`;
                                                    const { error: profileSaveErr } = await supabase
                                                        .from('business_profiles')
                                                        .update({
                                                            company_name: onboardingData.companyName,
                                                            industry: userInfo.businessType,
                                                            business_description: userInfo.businessDetails,
                                                            website: onboardingData.website,
                                                            voice_id: onboardingData.voiceId,
                                                            user_phone_number: phoneWithPlus
                                                        })
                                                        .eq('id', userInfo.profileId);

                                                    if (profileSaveErr) console.warn("Profile save warning:", profileSaveErr);
                                                    else console.log("✅ Profile saved");

                                                    // 2. Greeting (Save to business_info for assistant knowledge)
                                                    if (onboardingData.greeting) {
                                                        // Check for existing greeting
                                                        const { data: existingGreeting } = await supabase
                                                            .from('business_info')
                                                            .select('id')
                                                            .eq('owner_user_id', session.user.id)
                                                            .eq('type', 'greeting')
                                                            .maybeSingle();

                                                        if (existingGreeting) {
                                                            // Update existing
                                                            const { error: greetErr } = await supabase
                                                                .from('business_info')
                                                                .update({ content: { text: onboardingData.greeting } })
                                                                .eq('id', existingGreeting.id);
                                                            if (greetErr) console.warn("Greeting update warning:", greetErr);
                                                        } else {
                                                            // Insert new
                                                            const { error: greetErr } = await supabase
                                                                .from('business_info')
                                                                .insert({
                                                                    owner_user_id: session.user.id,
                                                                    type: 'greeting',
                                                                    content: { text: onboardingData.greeting }
                                                                });
                                                            if (greetErr) console.warn("Greeting insert warning:", greetErr);
                                                        }
                                                    }

                                                    // 2b. Business Description as instruction
                                                    if (userInfo.businessDetails) {
                                                        const { data: existingDesc } = await supabase
                                                            .from('business_info')
                                                            .select('id')
                                                            .eq('owner_user_id', session.user.id)
                                                            .eq('type', 'instruction')
                                                            .eq('content->>source', 'onboarding')
                                                            .maybeSingle();

                                                        if (existingDesc) {
                                                            const { error: descErr } = await supabase
                                                                .from('business_info')
                                                                .update({ content: { text: `Business Details: ${userInfo.businessDetails}`, source: 'onboarding' } })
                                                                .eq('id', existingDesc.id);
                                                            if (descErr) console.warn("Business details update warning:", descErr);
                                                        } else {
                                                            const { error: descErr } = await supabase
                                                                .from('business_info')
                                                                .insert({
                                                                    owner_user_id: session.user.id,
                                                                    type: 'instruction',
                                                                    content: { text: `Business Details: ${userInfo.businessDetails}`, source: 'onboarding' }
                                                                });
                                                            if (descErr) console.warn("Business details insert warning:", descErr);
                                                        }
                                                    }

                                                    // Update local state immediately so instructions tab shows data
                                                    setGreeting(onboardingData.greeting || '');
                                                    const voiceMatch2 = FALLBACK_VOICES.find(v => v.id === onboardingData.voiceId);
                                                    setPersonality(prev => ({
                                                        ...prev,
                                                        voiceId: onboardingData.voiceId,
                                                        name: voiceMatch2?.name || prev.name
                                                    }));

                                                    if (onboardingData.website) {
                                                        const url = onboardingData.website.startsWith('http') ? onboardingData.website : `https://${onboardingData.website}`;
                                                        fetch('/api/scrape-website', {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ url, userId: session.user.id })
                                                        }).catch(err => console.warn("Scrape trigger failed", err));
                                                    }

                                                    // 3. Provision Number (Attempt or Mock)
                                                    if (!userInfo.vapiPhoneNumber) {
                                                        try {
                                                            const res = await fetch('/api/provision', {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({ userId: session.user.id })
                                                            });
                                                            const d = await res.json();
                                                            if (d.phoneNumber) {
                                                                setUserInfo(prev => ({ ...prev, vapiPhoneNumber: d.phoneNumber }));
                                                            } else {
                                                                throw new Error("Provision failed");
                                                            }
                                                        } catch (provErr) {
                                                            console.warn("Dev Bypass: Mocking Number");
                                                            setUserInfo(prev => ({ ...prev, vapiPhoneNumber: '+1 (555) 123-4567' }));
                                                        }
                                                    }
                                                } catch (e) {
                                                    console.error("Non-fatal setup error", e);
                                                } finally {
                                                    // Always proceed to Test Call
                                                    setOnboardingStep(10);
                                                }
                                            }}
                                            className="w-full bg-white text-blue-600 border border-gray-100 py-4 rounded-full font-bold text-lg shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_25px_rgba(37,99,235,0.15)] transition-all"
                                        >
                                            I've Dialed the Code
                                        </button>
                                    </>
                                )}

                                {/* Step 10: Test Call */}
                                {/* ##### Step 10 - Success ##### */}
                                {onboardingStep === 10 && (
                                    <>
                                        <div className="text-center pt-8 animate-in zoom-in duration-500">
                                            <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                                <PhoneCall size={40} className="animate-pulse" />
                                            </div>
                                            <h2 className="text-3xl font-black text-gray-900 mb-4 leading-tight">Let's test it.</h2>
                                            <p className="text-gray-500 font-medium mb-8 max-w-xs mx-auto">
                                                We'll call your number. <br />
                                                <span className="text-gray-900 font-bold">Press DECLINE to forward the call.</span>
                                            </p>

                                            <div className="bg-white border-2 border-gray-100 p-6 rounded-3xl mb-8 text-left shadow-sm">
                                                <div className="flex items-center gap-4 mb-4">
                                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500">1</div>
                                                    <div className="text-sm font-medium text-gray-900">Wait for your phone to ring.</div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center font-bold text-red-500">2</div>
                                                    <div className="text-sm font-medium text-gray-900">Decline the call.</div>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => {
                                                    // Trigger Mock Test Call
                                                    showToast("Calling you now...");
                                                    // Here we would ideally trigger the API
                                                    // fetch('/api/test-call', ...)

                                                    // For now, simulate success after 2.5s (faster for testing)
                                                    setTimeout(() => {
                                                        showToast("Call forwarded successfully! 🎉");
                                                        setView('receptionist');
                                                    }, 2500);
                                                }}
                                                className="w-full bg-white text-blue-600 border border-gray-100 py-4 rounded-full font-bold text-lg shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_25px_rgba(37,99,235,0.15)] mb-4 transition-all"
                                            >
                                                Call Me Now
                                            </button>

                                            <button
                                                onClick={() => setView('receptionist')}
                                                className="text-gray-400 font-bold text-sm hover:text-gray-600"
                                            >
                                                Skip Test
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )
            }

            {/* =========================================
               SETTINGS VIEW
               ========================================= */}
            {
                view === 'settings' && (
                    <div className="flex flex-col h-full bg-transparent relative animate-in slide-in-from-right duration-300">

                        <div className="pt-14 pb-6 px-6 flex justify-center items-center shrink-0 z-20">
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-black tracking-tighter">
                                    <span className="text-gray-900">Juno</span><span className="text-blue-600">Desk</span>
                                </h1>
                                <div className="h-6 w-px bg-gray-200"></div>
                                <span className="px-2 py-1 rounded-md bg-gray-50 border border-gray-200 text-[10px] font-bold text-gray-500 tracking-widest uppercase">
                                    AI Receptionist
                                </span>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 pb-48">




                            {/* --- FEATURES --- */}
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 ml-4 mt-4">Features</h3>
                            <div className="bg-white rounded-[1.5rem] border border-gray-100 shadow-sm overflow-hidden">

                                {/* Contacts */}
                                <div className="flex items-center justify-between p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => showToast('Opening Contacts Settings...')}>
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0 border border-blue-100">
                                            <Users size={18} className="stroke-[2.5px]" />
                                        </div>
                                        <div>
                                            <h4 className="text-base font-bold text-gray-900">Contacts</h4>
                                            <p className="text-sm font-medium text-rose-500 mt-0.5">Enable in Settings to sync contacts</p>
                                        </div>
                                    </div>
                                    <div className="text-xs font-bold text-[#2563EB] flex items-center">
                                        Settings <ChevronRight size={14} className="ml-0.5" />
                                    </div>
                                </div>

                                {/* Notifications */}
                                <div className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer">
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0 border border-blue-100">
                                            <Bell size={18} className="stroke-[2.5px]" />
                                        </div>
                                        <div>
                                            <h4 className="text-base font-bold text-gray-900">Notifications</h4>
                                            <p className="text-sm font-medium text-rose-500 mt-0.5">Enable in Settings to receive alerts</p>
                                        </div>
                                    </div>
                                    {/* Mock Toggle */}
                                    <div className="w-12 h-7 bg-[#2563EB] rounded-full relative transition-colors">
                                        <div className="absolute right-0.5 top-0.5 w-6 h-6 bg-white rounded-full shadow-sm"></div>
                                    </div>
                                </div>


                            </div>

                            {/* --- ACCOUNT --- */}
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 ml-4 mt-8">Account</h3>
                            <div className="bg-white rounded-[1.5rem] border border-gray-100 shadow-sm overflow-hidden">

                                {/* Manage Plan */}
                                <div className="flex items-center justify-between p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setView('manage-plan')}>
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0 border border-blue-100">
                                            <CreditCard size={18} className="stroke-[2.5px]" />
                                        </div>
                                        <div>
                                            <h4 className="text-base font-bold text-gray-900">Manage Plan</h4>
                                            <p className="text-sm font-medium text-gray-500 mt-0.5">Manage subscription</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={20} className="text-gray-300" />
                                </div>

                                {/* Support */}
                                <div className="flex items-center justify-between p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => window.open('https://calendly.com/aayushsethi37/30min', '_blank')}>
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0 border border-blue-100">
                                            <MessageSquare size={18} className="stroke-[2.5px]" />
                                        </div>
                                        <div>
                                            <h4 className="text-base font-bold text-gray-900">Contact Us</h4>
                                            <p className="text-sm font-medium text-gray-500 mt-0.5">Get help or share your ideas!</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={20} className="text-gray-300" />
                                </div>

                                {/* Privacy Policy */}
                                <div className="flex items-center justify-between p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => showToast('Opening Privacy Policy...')}>
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0 border border-blue-100">
                                            <Lock size={18} className="stroke-[2.5px]" />
                                        </div>
                                        <div>
                                            <h4 className="text-base font-bold text-gray-900">Privacy Policy</h4>
                                            <p className="text-sm font-medium text-gray-500 mt-0.5">Review privacy practices</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={20} className="text-gray-300" />
                                </div>

                                {/* Sign Out */}
                                <div className="flex items-center justify-between p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer" onClick={async () => {
                                    try {
                                        await supabase.auth.signOut();
                                    } catch (e) {
                                        console.error('Sign out error:', e);
                                    } finally {
                                        setSession(null);
                                        setView('auth');
                                    }
                                }}>
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0 border border-blue-100">
                                            <LogOut size={18} className="stroke-[2.5px]" />
                                        </div>
                                        <div>
                                            <h4 className="text-base font-bold text-gray-900">Sign Out</h4>
                                            <p className="text-sm font-medium text-gray-500 mt-0.5">Log out of your account</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={20} className="text-gray-300" />
                                </div>

                                {/* Delete Account */}
                                <div className="flex items-center justify-between p-4 hover:bg-red-50/50 transition-colors cursor-pointer" onClick={() => showToast('Delete Account Flow')}>
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center shrink-0 border border-red-100">
                                            <Trash2 size={18} className="stroke-[2.5px]" />
                                        </div>
                                        <div>
                                            <h4 className="text-base font-bold text-red-500">Delete Account</h4>
                                            <p className="text-sm font-medium text-gray-400 mt-0.5">Remove your data</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={20} className="text-gray-300" />
                                </div>
                            </div>


                        </div>
                    </div>
                )
            }



            {/* =========================================
               ACCOUNT VIEW
               ========================================= */}
            {
                view === 'account' && (
                    <div className="absolute inset-0 z-50 bg-transparent flex flex-col h-full animate-in slide-in-from-right duration-300">
                        {/* Header */}
                        <div className="px-6 pt-12 pb-4 flex items-center z-20">
                            <button onClick={() => setView('settings')} className="flex items-center text-gray-900 font-bold -ml-2 hover:bg-gray-50 px-2 py-1 rounded-lg transition-colors big-click-area">
                                <ChevronLeft size={24} className="mr-0.5" />
                                Back
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <h1 className="text-2xl font-black text-gray-900">Account</h1>

                            {/* Inputs */}
                            <div className="bg-white rounded-[1.5rem] p-6 shadow-sm border border-gray-100 space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Full Name</label>
                                    <input
                                        type="text"
                                        defaultValue="Aayush"
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base font-bold text-gray-900 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Mobile Number</label>
                                    <input
                                        type="tel"
                                        defaultValue="+1 (555) 000-0000"
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base font-bold text-gray-900 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <button className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-200 active:scale-[0.98] transition-all">
                                Save Changes
                            </button>
                        </div>
                    </div>
                )
            }


            {/* =========================================
               MANAGE PLAN (View)
               ========================================= */}
            {
                view === 'manage-plan' && (
                    <div className="absolute inset-0 z-50 bg-transparent flex flex-col h-full animate-in slide-in-from-right duration-300">
                        {/* Header */}
                        <div className="px-6 pt-12 pb-4 flex items-center z-20">
                            <button onClick={() => setView('settings')} className="flex items-center text-gray-900 font-bold -ml-2 hover:bg-gray-50 px-2 py-1 rounded-lg transition-colors big-click-area">
                                <ChevronLeft size={24} className="mr-0.5" />
                                Back
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-hide pb-32">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Subscriptions</h2>

                            {/* Plans Card */}
                            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-2 mb-8">
                                {/* Monthly */}
                                <div
                                    onClick={() => setActivePlan('monthly')}
                                    className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all ${activePlan === 'monthly' ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
                                >
                                    <div>
                                        <div className="font-bold text-gray-900 text-lg">Monthly Plan</div>
                                        <div className="text-gray-500 font-medium">$29.99</div>
                                    </div>
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${activePlan === 'monthly' ? 'bg-black border-black' : 'border-gray-200'}`}>
                                        {activePlan === 'monthly' && <Check size={14} className="text-white" />}
                                    </div>
                                </div>

                                {/* Annual */}
                                <div
                                    onClick={() => setActivePlan('annual')}
                                    className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all ${activePlan === 'annual' ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
                                >
                                    <div>
                                        <div className="font-bold text-gray-900 text-lg">Annual Plan</div>
                                        <div className="text-gray-500 font-medium">$249.99</div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-blue-400 font-bold text-sm">Save 31%</span>
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${activePlan === 'annual' ? 'bg-black border-black' : 'border-gray-200'}`}>
                                            {activePlan === 'annual' && <Check size={14} className="text-white" />}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <h3 className="text-xl font-bold text-gray-900 mb-4">Benefits</h3>
                            <div className="space-y-4 pl-1">
                                {[
                                    'AI receptionist available 24/7',
                                    'Customizable hyper-realistic voices',
                                    'Realtime task automation',
                                    'Detailed AI call summaries & reports',
                                    'Live call monitoring',
                                    'Unlimited call recordings'
                                ].map((benefit) => (
                                    <div key={benefit} className="flex items-start gap-3">
                                        <Check size={18} className="text-blue-400 mt-0.5 shrink-0" />
                                        <span className="text-gray-500 font-bold text-sm leading-tight">{benefit}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-12 text-center text-xs text-gray-400 font-medium">
                                Terms | Privacy.
                            </div>
                        </div>
                    </div>
                )
            }

            {/* =========================================
               EDIT RECEPTIONIST MODAL
               ========================================= */}
            {
                isEditingReceptionist && (
                    <div className="absolute inset-0 z-[70] flex items-end justify-center">
                        {/* Backdrop */}
                        <div
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
                            onClick={() => setIsEditingReceptionist(false)}
                        ></div>

                        {/* Modal Content */}
                        <div className="bg-white w-full h-[92%] rounded-t-[2.5rem] relative z-10 animate-in slide-in-from-bottom duration-300 flex flex-col p-6 shadow-2xl overflow-y-auto">
                            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6 shrink-0"></div>

                            {/* Title */}
                            <h2 className="text-xl font-black text-gray-900 text-center mb-8">Receptionist Profile</h2>

                            {/* Avatar */}
                            <div className="flex justify-center mb-8">
                                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-xl bg-blue-50">
                                    <img
                                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${personality.name}&backgroundColor=b6e3f4`}
                                        alt={personality.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            </div>

                            {/* Form */}
                            <div className="space-y-6">
                                {/* Name Input */}
                                <div>
                                    <label className="block text-base font-bold text-gray-900 mb-2">Name</label>
                                    <input
                                        type="text"
                                        value={personality.name === "Assistant" ? "" : personality.name}
                                        placeholder="Assistant Name"
                                        onChange={(e) => setPersonality({ ...personality, name: e.target.value })}
                                        onBlur={async () => {
                                            await supabase.from('business_profiles')
                                                .update({ assistant_name: personality.name })
                                                .eq('owner_user_id', session.user.id);
                                            syncAssistant();
                                        }}
                                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-4 text-base font-medium text-gray-900 outline-none focus:ring-2 focus:ring-blue-400/20 active:scale-[0.99] transition-all"
                                    />
                                </div>

                                {/* Voice Selection */}
                                <div>
                                    <label className="block text-base font-bold text-gray-900 mb-2">Voice</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {voiceOptions.map(v => (
                                            <button
                                                key={v.id}
                                                onClick={async () => {
                                                    // 1. Update (Optimistic) UI
                                                    setPersonality(prev => ({ ...prev, voiceId: v.id }));

                                                    // 2. Play Preview
                                                    try {
                                                        const res = await fetch('http://localhost:3000/api/voice-preview', {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ voiceId: v.id, text: "Hello! I am your new receptionist." })
                                                        });
                                                        if (res.ok) {
                                                            const blob = await res.blob();
                                                            const audio = new Audio(URL.createObjectURL(blob));
                                                            audio.play();
                                                        }
                                                    } catch (e) {
                                                        console.error("Preview failed", e);
                                                    }

                                                    // 3. PERSIST via Server (Trusted)
                                                    console.log("Saving voice_id via Backend API...", v.id);
                                                    try {
                                                        const persistRes = await fetch('http://localhost:3000/api/save-voice', {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ userId: session.user.id, voiceId: v.id })
                                                        });
                                                        const pData = await persistRes.json();
                                                        if (!persistRes.ok) console.error("Persist API Failed:", pData);
                                                        else console.log("✅ DB Persisted via Server");
                                                    } catch (persistErr) {
                                                        console.error("Persist Network Error:", persistErr);
                                                    }

                                                    // 4. SYNC to Vapi
                                                    // Now that DB is updated, tell server to push to Vapi
                                                    syncAssistant(v.id);
                                                }}
                                                className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden ${personality.voiceId === v.id ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                                            >
                                                <div className="font-bold text-gray-900 text-sm mb-0.5 relative z-10">{v.name}</div>
                                                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider relative z-10">
                                                    {v.provider === '11labs' ? 'Standard' : 'Premium'}
                                                </div>
                                                {personality.voiceId === v.id && (
                                                    <div className="absolute top-2 right-2 text-blue-500 z-10">
                                                        <div className="w-2 h-2 rounded-full bg-current shadow-sm animate-pulse" />
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Demo Section */}
                                <div>
                                    <label className="block text-base font-bold text-gray-900 mb-2">Demo</label>
                                    <button className="w-full bg-white border border-gray-200 rounded-xl px-4 py-4 flex items-center justify-center gap-3 text-base font-bold text-gray-900 hover:bg-gray-50 active:scale-[0.99] transition-all shadow-sm">
                                        <PhoneCall size={20} className="text-gray-400 fill-current" />
                                        Call {personality.name}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* =========================================
               BOTTOM NAV
               ========================================= */}


            {/* =========================================
               GLOBAL NAVIGATION
               ========================================= */}
            {
                view !== 'auth' && view !== 'login' && view !== 'onboarding' && view !== 'intro' && (
                    <div className="fixed bottom-0 left-0 w-full bg-white/80 backdrop-blur-xl border-t border-gray-200/50 flex justify-around items-center py-4 px-6 z-[999] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">

                        {/* Inbox Tab */}
                        <button
                            onClick={() => setView('inbox')}
                            className="flex flex-col items-center justify-center w-20 transition-all active:scale-95 group"
                        >
                            <div className={`w-12 h-12 flex items-center justify-center rounded-[1.2rem] mb-1 transition-all duration-300 ${view === 'inbox' || view === 'call-detail' ? 'bg-blue-50 text-blue-600 shadow-inner' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}>
                                <img src="/pics/bot.png" alt="Inbox" className="w-8 h-8 object-contain drop-shadow-sm" />
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${view === 'inbox' || view === 'call-detail' ? 'text-gray-900' : 'text-gray-400 group-hover:text-gray-600'}`}>Inbox</span>
                        </button>

                        {/* Receptionist Tab */}
                        <button
                            onClick={() => setView('receptionist')}
                            className="flex flex-col items-center justify-center w-20 transition-all active:scale-95 group"
                        >
                            <div className={`w-12 h-12 flex items-center justify-center rounded-[1.2rem] mb-1 transition-all duration-300 ${view === 'receptionist' ? 'bg-blue-50 text-blue-600 shadow-inner' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}>
                                <img src="/pics/man-user.png" alt="Assistant" className="w-6 h-6 object-contain drop-shadow-sm" />
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${view === 'receptionist' ? 'text-gray-900' : 'text-gray-400 group-hover:text-gray-600'}`}>Assistant</span>
                        </button>

                        {/* Settings Tab */}
                        <button
                            onClick={() => setView('settings')}
                            className="flex flex-col items-center justify-center w-20 transition-all active:scale-95 group"
                        >
                            <div className={`w-12 h-12 flex items-center justify-center rounded-[1.2rem] mb-1 transition-all duration-300 ${view === 'settings' ? 'bg-blue-50 text-blue-600 shadow-inner' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}>
                                <img src="/pics/gear.png" alt="Settings" className="w-6 h-6 object-contain drop-shadow-sm" />
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${view === 'settings' ? 'text-gray-900' : 'text-gray-400 group-hover:text-gray-600'}`}>Settings</span>
                        </button>

                    </div>
                )
            }

            {
                toast && (
                    <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-gray-900 text-white pl-6 pr-4 py-3 rounded-full shadow-xl z-[100] animate-in fade-in slide-in-from-top-4 duration-300 flex items-center gap-4">
                        <span className="text-sm font-bold">{toast}</span>
                        {toastAction && (
                            <button
                                onClick={() => {
                                    toastAction.run();
                                    setToast(null);
                                    setToastAction(null);
                                }}
                                className="text-blue-400 font-bold text-xs uppercase tracking-wider hover:text-blue-300 transition-colors"
                            >
                                {toastAction.label}
                            </button>
                        )}
                    </div>
                )
            }

            {/* =========================================
               ADD QUESTION MODAL
               ========================================= */}
            {
                activeModal === 'add-question' && (
                    <div className="absolute inset-0 z-[80] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setActiveModal(null)} />
                        <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 relative z-10 animate-in zoom-in-95 duration-200 shadow-2xl">
                            <h3 className="text-xl font-bold text-gray-900 mb-4">New Question</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Question</label>
                                    <input
                                        autoFocus
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400/20 focus:bg-white transition-all"
                                        placeholder="e.g. Do you have WiFi?"
                                        value={tempQuestion.q}
                                        onChange={e => setTempQuestion(prev => ({ ...prev, q: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Answer</label>
                                    <textarea
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400/20 focus:bg-white transition-all resize-none"
                                        placeholder="e.g. Yes, the password is..."
                                        rows={3}
                                        value={tempQuestion.a}
                                        onChange={e => setTempQuestion(prev => ({ ...prev, a: e.target.value }))}
                                    />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={() => setActiveModal(null)}
                                        className="flex-1 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (tempQuestion.q && tempQuestion.a) {
                                                try {
                                                    const { data, error } = await supabase
                                                        .from('business_info')
                                                        .insert([{
                                                            owner_user_id: session.user.id,
                                                            type: 'qa',
                                                            content: {
                                                                question: tempQuestion.q,
                                                                answer: tempQuestion.a
                                                            }
                                                        }])
                                                        .select()
                                                        .single();

                                                    if (error) throw error;

                                                    setKnowledgeItems(prev => [...prev, data]);
                                                    setTempQuestion({ q: "", a: "" });
                                                    setActiveModal(null);
                                                    showToast("Question saved");
                                                    syncAssistant();
                                                } catch (err) {
                                                    console.error("Error saving question:", err);
                                                    showToast("Failed to save question");
                                                }
                                            }
                                        }}
                                        className="flex-1 py-3 rounded-xl font-bold text-white bg-blue-500 hover:bg-blue-600 transition-colors shadow-lg shadow-blue-200"
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                showLanguageModal && (
                    <div className="fixed inset-0 z-[2000] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
                        <div className="bg-white w-full max-w-sm rounded-[1.5rem] p-5 shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[80vh]">
                            <div className="flex justify-between items-center mb-4 shrink-0">
                                <button onClick={() => setShowLanguageModal(false)} className="text-gray-400 font-bold text-sm hover:text-gray-600 transition-colors">Cancel</button>
                                <h3 className="text-lg font-black text-gray-900">Languages</h3>
                                <button
                                    onClick={async () => {
                                        await supabase.from('business_info').delete().eq('owner_user_id', session.user.id).eq('type', 'languages');
                                        await supabase.from('business_info').insert({
                                            owner_user_id: session.user.id,
                                            type: 'languages',
                                            content: { languages }
                                        });
                                        syncAssistant();
                                        setShowLanguageModal(false);
                                    }}
                                    className="text-[#2563EB] font-bold text-sm hover:text-blue-700 transition-colors"
                                >
                                    Save
                                </button>
                            </div>

                            <p className="text-xs text-gray-500 font-medium mb-4 leading-relaxed shrink-0">
                                Select supported languages.
                            </p>

                            <div className="grid grid-cols-3 gap-2 overflow-y-auto pr-1 pb-1">
                                {LANGUAGES.map(l => {
                                    const isSelected = languages.includes(l.name);
                                    return (
                                        <button
                                            key={l.name}
                                            onClick={() => {
                                                if (isSelected) {
                                                    setLanguages(prev => prev.filter(x => x !== l.name));
                                                } else {
                                                    setLanguages(prev => [...prev, l.name]);
                                                }
                                            }}
                                            className={`flex flex-col items-center justify-center py-2 px-2 rounded-xl border transition-all active:scale-95 ${isSelected ? 'border-[#2563EB] bg-blue-50/50 shadow-inner' : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'}`}
                                        >
                                            <div className="relative mb-1">
                                                <span className="text-2xl drop-shadow-sm filter grayscale-[0.2] transition-all duration-300 transform group-hover:scale-110">{l.flag}</span>
                                                {isSelected && (
                                                    <div className="absolute -top-1 -right-2 bg-[#2563EB] text-white rounded-full p-[2px] shadow-sm animate-in zoom-in duration-200">
                                                        <Check size={8} strokeWidth={4} />
                                                    </div>
                                                )}
                                            </div>
                                            <span className={`text-[10px] font-bold ${isSelected ? 'text-[#2563EB]' : 'text-gray-600'}`}>{l.name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
