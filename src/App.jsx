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

import Hope from './assets/avatars/Voices/Hope.mp3';
import Jessica from './assets/avatars/Voices/Jessica.mp3';
import Lily from './assets/avatars/Voices/Lily.mp3';
import Bill from './assets/avatars/Voices/Bill.mp3';
import Jeff from './assets/avatars/Voices/Jeff.mp3';
import Mark from './assets/avatars/Voices/Mark.mp3';

const VOICE_PREVIEWS = {
    'cgSgspJ2msm6clMCkdW9': Hope,
    'flHkNRp1BlvT73UL6gyz': Jessica,
    'qBDvhofpxp92JgXJxDjB': Lily,
    'iiidtqDt9FBdT1vfBluA': Bill,
    '94zOad0g7T7K4oa7zhDq': Jeff,
    'UgBBYS2sOqTuMpoF3BR0': Mark
};

// Views
import LandingView from './components/views/LandingView';
import LoginView from './components/views/LoginView';
import InboxView from './components/views/InboxView';
import ReceptionistView from './components/views/ReceptionistView';
import OnboardingView from './components/views/OnboardingView';
import SettingsView from './components/views/SettingsView';
import CallDetailView from './components/views/CallDetailView';
import AccountDetailsView from './components/views/AccountDetailsView';
import ManagePlanView from './components/views/ManagePlanView';

// Layout & UI
import BottomNav from './components/layout/BottomNav';
import Toast from './components/ui/Toast';

// Modals


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
    const [endingMessage, setEndingMessage] = useState("");
    const [activeReceptionistTab, setActiveReceptionistTab] = useState('instructions'); // 'instructions', 'knowledge', 'phone'

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
                await supabase.from('calls').update({ is_deleted: 'FALSE' }).eq('id', callId);
            }
        }, "Undo");

        try {
            const { error } = await supabase
                .from('calls')
                .update({ is_deleted: 'TRUE' })
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
                        userPhoneNumber: profile.user_phone_number || '',
                        voicemailEnabled: profile.voicemail_enabled || false
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

                    // Extract Ending Message
                    const endingItem = info.find(i => i.type === 'ending_message');
                    if (endingItem?.content?.text) {
                        setEndingMessage(endingItem.content.text);
                        console.log("✅ Ending message loaded:", endingItem.content.text);
                    }

                    // Extract Languages
                    const languagesItem = info.find(i => i.type === 'languages');
                    if (languagesItem?.content?.languages) {
                        setLanguages(languagesItem.content.languages);
                        console.log("✅ Languages loaded:", languagesItem.content.languages);
                    }

                    // Extract Knowledge Items (QA, Fact, Instruction, Common Words)
                    const items = info.filter(i => ['qa', 'fact', 'instruction', 'common_words', 'website_content'].includes(i.type));
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
    const [newCommonWord, setNewCommonWord] = useState("");


    // --- UI State for Interactions ---

    const [expandedCallId, setExpandedCallId] = useState(null);
    const [showTranscript, setShowTranscript] = useState(false);

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
                    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ""}/api/dev-signup`, {
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
                // Fix: Explicitly allow NULL or FALSE (neq TRUE excludes NULLs in SQL)
                .or('is_deleted.is.null,is_deleted.neq.TRUE')
                .order('started_at', { ascending: false });

            if (callsError) {
                // Only log non-abort errors
                if (callsError.message && !callsError.message.includes('AbortError')) {
                    console.error("❌ Supabase calls fetch error:", callsError);
                }
                isFetchingCallsRef.current = false;
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
            fetch(`${import.meta.env.VITE_API_BASE_URL || ""}/api/sync-calls?userId=${session.user.id}`)
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
            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ""}/api/provision`, {
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
                await fetch(`${import.meta.env.VITE_API_BASE_URL || ""}/api/sync-assistant`, {
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

    const saveVoice = async (v) => {
        // 1. Update (Optimistic) UI
        setPersonality(prev => ({ ...prev, voiceId: v.id }));

        // 2. Play Preview
        try {
            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ""}/api/voice-preview`, {
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

        // 3. PERSIST via Server
        try {
            await fetch(`${import.meta.env.VITE_API_BASE_URL || ""}/api/save-voice`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: session.user.id, voiceId: v.id })
            });
        } catch (persistErr) {
            console.error("Persist Network Error:", persistErr);
        }

        // 4. SYNC to Vapi
        syncAssistant(v.id);
    };

    return (
        <div className="flex flex-col h-screen bg-[#F2F4F8] font-sans relative text-gray-900 overflow-hidden">


            {/* --- Auth View (Landing Page) --- */}
            {view === 'auth' && (
                <LandingView
                    setView={setView}
                    setOnboardingStep={setOnboardingStep}
                    session={session}
                    supabase={supabase}
                />
            )}

            {/* --- Login View (Separate from Signup) --- */}
            {view === 'login' && (
                <LoginView
                    showOtpInput={showOtpInput}
                    setShowOtpInput={setShowOtpInput}
                    authPhone={authPhone}
                    setAuthPhone={setAuthPhone}
                    authPassword={authPassword}
                    setAuthPassword={setAuthPassword}
                    otpCode={otpCode}
                    setOtpCode={setOtpCode}
                    authError={authError}
                    setAuthError={setAuthError}
                    authLoading={authLoading}
                    loginMethod={loginMethod}
                    setLoginMethod={setLoginMethod}
                    handleVerifyOtp={handleVerifyOtp}
                    handlePasswordLogin={handlePasswordLogin}
                    handleSendOtp={handleSendOtp}
                    setView={setView}
                />
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
            {view === 'inbox' && (
                <InboxView
                    view={view}
                    calls={calls}
                    setCalls={setCalls}
                    activeInboxTab={activeInboxTab}
                    setActiveInboxTab={setActiveInboxTab}
                    authLoading={authLoading}
                    personality={personality}
                    voiceOptions={voiceOptions}
                    isReceptionistActive={isReceptionistActive}
                    handleArchiveCall={handleArchiveCall}
                    handleUnarchiveCall={handleUnarchiveCall}
                    handleDeleteCall={handleDeleteCall}
                    playingVoiceId={playingVoiceId}
                    setPlayingVoiceId={setPlayingVoiceId}
                    audioProgress={audioProgress}
                    setAudioProgress={setAudioProgress}
                    showToast={showToast}
                    fetchCalls={fetchCalls}
                    session={session}
                    supabase={supabase}
                    expandedCallId={expandedCallId}
                    setExpandedCallId={setExpandedCallId}
                    showTranscript={showTranscript}
                    setShowTranscript={setShowTranscript}
                    userInfo={userInfo}
                />
            )}







            {view === 'receptionist' && (
                <ReceptionistView
                    activeReceptionistTab={activeReceptionistTab}
                    setActiveReceptionistTab={setActiveReceptionistTab}
                    personality={personality}
                    setPersonality={setPersonality}
                    voiceOptions={voiceOptions}
                    playingVoiceId={playingVoiceId}
                    setPlayingVoiceId={setPlayingVoiceId}
                    greeting={greeting}
                    setGreeting={setGreeting}
                    endingMessage={endingMessage}
                    setEndingMessage={setEndingMessage}
                    knowledgeItems={knowledgeItems}
                    setKnowledgeItems={setKnowledgeItems}
                    newInstruction={newInstruction}
                    setNewInstruction={setNewInstruction}
                    userInfo={userInfo}
                    setUserInfo={setUserInfo}
                    isScraping={isScraping}
                    setIsScraping={setIsScraping}
                    newFact={newFact}
                    setNewFact={setNewFact}
                    newCommonWord={newCommonWord}
                    setNewCommonWord={setNewCommonWord}
                    isForwardingSetupOpen={isForwardingSetupOpen}
                    setIsForwardingSetupOpen={setIsForwardingSetupOpen}
                    forwardingMode={forwardingMode}
                    setForwardingMode={setForwardingMode}
                    activationStep={activationStep}
                    setActivationStep={setActivationStep}
                    selectedCarrier={selectedCarrier}
                    setSelectedCarrier={setSelectedCarrier}
                    isReceptionistActive={isReceptionistActive}
                    setIsReceptionistActive={setIsReceptionistActive}
                    carriers={carriers}
                    currentCarrierConfig={currentCarrierConfig}
                    showToast={showToast}
                    syncAssistant={syncAssistant}
                    saveProfileField={saveProfileField}
                    handleProvision={handleProvision}
                    session={session}
                    supabase={supabase}
                    languages={languages}
                    LANGUAGES={LANGUAGES}
                    provisioning={provisioning}
                />
            )}

            {/* =========================================
               CALL DETAIL (Overlay)
               ========================================= */}
            {
                view === 'call-detail' && selectedCall && (
                    <CallDetailView
                        selectedCall={selectedCall}
                        setView={setView}
                        showToast={showToast}
                    />
                )
            }

            {/* =========================================
               ONBOARDING VIEW (Premium Wizard)
               ========================================= */}
            {
                view === 'onboarding' && (
                    <OnboardingView
                        onboardingStep={onboardingStep}
                        setOnboardingStep={setOnboardingStep}
                        onboardingData={onboardingData}
                        setOnboardingData={setOnboardingData}
                        authPhone={authPhone}
                        setAuthPhone={setAuthPhone}
                        otpCode={otpCode}
                        setOtpCode={setOtpCode}
                        authLoading={authLoading}
                        setAuthLoading={setAuthLoading}
                        authError={authError}
                        setAuthError={setAuthError}
                        planCycle={planCycle}
                        setPlanCycle={setPlanCycle}
                        userInfo={userInfo}
                        setUserInfo={setUserInfo}
                        playingVoiceId={playingVoiceId}
                        setPlayingVoiceId={setPlayingVoiceId}
                        selectedCarrier={selectedCarrier}
                        setSelectedCarrier={setSelectedCarrier}
                        currentCarrierConfig={currentCarrierConfig}
                        carriers={carriers}
                        FALLBACK_VOICES={FALLBACK_VOICES}
                        showToast={showToast}
                        setView={setView}
                        setGreeting={setGreeting}
                        setPersonality={setPersonality}
                        session={session}
                        supabase={supabase}
                    />
                )
            }

            {/* =========================================
               SETTINGS VIEW (Encapsulated)
               ========================================= */}
            <SettingsView
                view={view}
                setView={setView}
                showToast={showToast}
                supabase={supabase}
                setSession={setSession}
                session={session}
            />



            {/* =========================================
               BOTTOM NAV
               ========================================= */}


            {/* =========================================
               GLOBAL NAVIGATION (iOS Style)
               ========================================= */}
            {
                view !== 'auth' && view !== 'login' && view !== 'onboarding' && view !== 'intro' && (
                    <BottomNav view={view} setView={setView} />
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

        </div>
    );
}
