import React, { useState, useEffect } from 'react';
import {
    Phone, MessageSquare, Menu, RefreshCw, ChevronRight, User,
    ChevronLeft, Settings, HelpCircle, PhoneCall,
    Calendar, Bell, Edit2, MapPin, Clock, Briefcase, Globe, Plus, X,
    ArrowRight, Check, Share2, Search, Mic, Play, Pause, Copy, Info, ChevronDown,
    CreditCard, UserPlus, Star, ArrowUpRight, XCircle, MessageCircle, LifeBuoy, AudioWaveform, LogOut,
    ShieldAlert, Archive, Trash2, Activity, Inbox, Users, PhoneOff, Lock
} from 'lucide-react';
import { supabase } from './supabase';

import woman1 from './assets/avatars/uifaces-human-avatar.jpg';
import woman2 from './assets/avatars/uifaces-human-avatar (1).jpg';
import woman3 from './assets/avatars/uifaces-human-avatar (2).jpg';
import man1 from './assets/avatars/uifaces-human-avatar (3).jpg';
import man2 from './assets/avatars/uifaces-human-avatar (4).jpg';
import man3 from './assets/avatars/uifaces-human-avatar (5).jpg';

const FALLBACK_VOICES = [
    { id: 'JAATlCsz6GCH2vUjFcLg', name: 'Woman 1', provider: '11labs', avatar: woman1 },
    { id: 'OYTbf65OHHFELVut7v2H', name: 'Woman 2', provider: '11labs', avatar: woman2 },
    { id: 'EST9Ui6982FZPSi7gCHi', name: 'Woman 3', provider: '11labs', avatar: woman3 },
    { id: 'fVVjLtJgnQI61CoImgHU', name: 'Man 1', provider: '11labs', avatar: man1 },
    { id: 'EOVAuWqgSZN2Oel78Psj', name: 'Man 2', provider: '11labs', avatar: man2 },
    { id: 'wevlkhfRsG0ND2D2pQHq', name: 'Man 3', provider: '11labs', avatar: man3 }
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
    const [authLoading, setAuthLoading] = useState(true);
    const [calls, setCalls] = useState([]);


    // --- Navigation State ---
    const [view, setView] = useState('auth'); // auth, onboarding, intro, inbox, receptionist, settings, call-detail, manage-plan, account
    const [selectedCall, setSelectedCall] = useState(null);
    const [playingVoiceId, setPlayingVoiceId] = useState(null); // Used for voice preview AND call recording playback
    const [audioProgress, setAudioProgress] = useState(0); // 0 to 100 for call recording progress
    // --- Auth Effect ---
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) setView('receptionist');
            setAuthLoading(false);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) setView('receptionist');
            if (!session) setView('auth');
        });

        return () => subscription.unsubscribe();
    }, []);

    // --- Intro Effect ---
    useEffect(() => {
        if (view === 'intro') {
            const timer = setTimeout(() => {
                setView('receptionist');
            }, 3000); // Show intro for 3 seconds
            return () => clearTimeout(timer);
        }
    }, [view]);

    // --- Receptionist Settings State ---
    const [greeting, setGreeting] = useState("");
    const [activeReceptionistTab, setActiveReceptionistTab] = useState('instructions'); // 'instructions', 'knowledge', 'phone'
    const [isEditingReceptionist, setIsEditingReceptionist] = useState(false);
    const [toast, setToast] = useState(null);
    const [isForwardingSetupOpen, setIsForwardingSetupOpen] = useState(false);
    const [isReceptionistActive, setIsReceptionistActive] = useState(true);

    // Forwarding Flow State
    const [forwardingMode, setForwardingMode] = useState('enable'); // 'enable' | 'disable'
    const [activationStep, setActivationStep] = useState(1); // 1: LiveVM, 2: Carrier, 3: Code
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
        websiteTraining: false,
        emergencyNumber: "",
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
        const newArchivedIds = [...archivedIds, callId];
        setArchivedIds(newArchivedIds);
        showToast("Call archived");

        try {
            // Delete existing (simplest way to update list for this user) - actually Upsert is better but structure is unique per user/type
            // We'll just upsert based on owner_user_id + type. But Supabase upsert needs a uniqueconstraint.
            // We will delete and insert for simplicity or assuming we have unique index.
            // Actually, we can just fetch the ID if it exists and update, or Insert.

            // First check if row exists
            const { data: existing } = await supabase
                .from('business_info')
                .select('id')
                .eq('owner_user_id', session.user.id)
                .eq('type', 'archived_calls')
                .maybeSingle();

            if (existing) {
                await supabase
                    .from('business_info')
                    .update({ content: { ids: newArchivedIds } })
                    .eq('id', existing.id);
            } else {
                await supabase
                    .from('business_info')
                    .insert({
                        owner_user_id: session.user.id,
                        type: 'archived_calls',
                        content: { ids: newArchivedIds }
                    });
            }
        } catch (err) {
            console.error("Failed to save archive state", err);
            showToast("Failed to save archive state");
        }
    };

    const handleUnarchiveCall = async (callId) => {
        // Optimistic Update
        const newArchivedIds = archivedIds.filter(id => id !== callId);
        setArchivedIds(newArchivedIds);
        showToast("Call moved to inbox");

        try {
            const { data: existing } = await supabase
                .from('business_info')
                .select('id')
                .eq('owner_user_id', session.user.id)
                .eq('type', 'archived_calls')
                .maybeSingle();

            if (existing) {
                await supabase
                    .from('business_info')
                    .update({ content: { ids: newArchivedIds } })
                    .eq('id', existing.id);
            }
        } catch (err) {
            console.error("Failed to save unarchive state", err);
            showToast("Failed to update archive state");
        }
    };


    // --- Data Fetching ---
    useEffect(() => {
        const loadUserData = async () => {
            if (!session?.user) return;

            try {
                // 1. Fetch Business Profile
                const { data: profile, error: profileError } = await supabase
                    .from('business_profiles')
                    .select('*')
                    .eq('owner_user_id', session.user.id)
                    .maybeSingle();

                if (profileError) throw profileError;

                if (profile) {
                    if (!profile.company_name) setView('onboarding');

                    setUserInfo(prev => ({
                        ...prev,
                        company: profile.company_name || '',
                        businessType: profile.industry || '',
                        email: profile.support_email || session.user.email || '',
                        address: profile.address || '',
                        website: profile.website || '',
                        websiteTraining: profile.website_training_enabled || false,
                        emergencyNumber: profile.emergency_phone || '',
                        useEmergencyNumber: profile.emergency_transfer_enabled || false,
                        businessDetails: profile.business_description || '',
                        instructions: profile.instructions || '',
                        vapiPhoneNumber: profile.vapi_phone_number || '' // Added Vapi Number
                    }));
                }

                // 2. Fetch Business Info (Knowledge, Greeting, Ending)
                const { data: info, error: infoError } = await supabase
                    .from('business_info')
                    .select('*')
                    .eq('owner_user_id', session.user.id);

                if (infoError) throw infoError;

                if (info) {
                    // Extract Personality (Prioritize Profile for Voice)
                    // Extract Personality (Prioritize Profile for Voice)
                    const personalityItem = info.find(i => i.type === 'personality');

                    const savedVoiceId = profile?.voice_id || personalityItem?.content?.voiceId;
                    let savedName = profile?.assistant_name || personalityItem?.content?.name || "Assistant";

                    // If name is generic but we have a valid voice ID, try to resolve the correct name
                    if (savedName === "Assistant" && savedVoiceId) {
                        const matchedVoice = FALLBACK_VOICES.find(v => v.id === savedVoiceId);
                        if (matchedVoice) savedName = matchedVoice.name;
                    }

                    setPersonality({
                        name: savedName,
                        description: "Professional, formal, and polite.",
                        voiceId: savedVoiceId // Prioritize profile voice_id
                    });

                    // Extract Greeting
                    const greetingItem = info.find(i => i.type === 'greeting');
                    if (greetingItem?.content?.text) setGreeting(greetingItem.content.text);

                    // Extract Knowledge Items (QA, Fact, Instruction)
                    const items = info.filter(i => ['qa', 'fact', 'instruction'].includes(i.type));
                    setKnowledgeItems(items);

                    // Extract Languages
                    const langItem = info.find(i => i.type === 'languages');
                    if (langItem?.content?.languages) setLanguages(langItem.content.languages);

                    // Extract Archived Calls
                    const archiveItem = info.find(i => i.type === 'archived_calls');
                    if (archiveItem?.content?.ids) setArchivedIds(archiveItem.content.ids);
                }

            } catch (err) {
                console.error("Error loading user data:", err);
            }
        };

        loadUserData();
    }, [session]);









    // Input States
    const [newFact, setNewFact] = useState("");
    const [newInstruction, setNewInstruction] = useState("");


    // --- UI State for Interactions ---
    const [activeModal, setActiveModal] = useState(null); // 'add-question', 'add-appointment', etc.
    const [expandedCallId, setExpandedCallId] = useState(null);
    const [showLanguageModal, setShowLanguageModal] = useState(false);

    const [knowledgeKeywords, setKnowledgeKeywords] = useState([]);
    const [voiceOptions] = useState(FALLBACK_VOICES);
    const [languages, setLanguages] = useState(['English']);
    // const [playingVoiceId, setPlayingVoiceId] = useState(null); // Moved to top

    // Input States
    const [tempQuestion, setTempQuestion] = useState({ q: "", a: "" });

    // --- Auth UI State ---
    const [authMode, setAuthMode] = useState('signin'); // 'signin' | 'signup'
    const [authEmail, setAuthEmail] = useState('');
    const [authPassword, setAuthPassword] = useState('');
    const [authError, setAuthError] = useState(null);

    const handleAuth = async () => {
        setAuthLoading(true);
        setAuthError(null);

        if (!authEmail.includes('@') || !authEmail.includes('.')) {
            setAuthError("Please enter a valid email address");
            setAuthLoading(false);
            return;
        }

        if (authMode === 'signup') {
            // Generate a new Business ID for this user
            const businessId = crypto.randomUUID();

            const { data, error } = await supabase.auth.signUp({
                email: authEmail,
                password: authPassword,
                options: {
                    data: {
                        business_id: businessId,
                        role: 'admin' // Default first user to admin
                    }
                }
            });

            if (error) {
                setAuthError(error.message);
            } else if (data?.user && !data?.session) {
                // If account created but no session, it usually means email confirmation is ON.
                // We'll tell the user to check the 'fake' email, but in a real app we'd need them to disable confirm.
                setAuthError("Project requires email verification. Please disable 'Confirm Email' in Supabase > Auth > Providers.");
                // SUCCESS: Upsert business profile (Handle triggers or manual creation)
                if (data.user) {
                    // Upsert Profile
                    await supabase.from('business_profiles').upsert(
                        {
                            owner_user_id: data.user.id,
                            business_id: businessId,
                            subscription_tier: 'free'
                        },
                        { onConflict: 'owner_user_id' }
                    );

                    // Upsert Default Greeting/Ending (ignore if exists)
                    // We can't simple upsert array with different types easily without looping or smarter query
                    // For now, let's just try insert and ignore error, or check first.
                    // Actually, let's just do nothing if it already exists, or upsert individual rows.
                    // Simplest: Just Insert. If conflict, it means Trigger handled it (Good).
                    const { error: infoError } = await supabase.from('business_info').insert([
                        { owner_user_id: data.user.id, type: 'greeting', content: { text: "Hello! How can I help?" } }
                    ]);
                    // Ignore duplicate key error for info
                    if (infoError && infoError.code !== '23505') console.error(infoError);
                }
                showToast("Account created!");
            }
        } else {
            const { error } = await supabase.auth.signInWithPassword({
                email: authEmail,
                password: authPassword,
            });
            if (error) setAuthError(error.message);
        }
        setAuthLoading(false);
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
    const fetchCalls = async () => {
        if (!session?.user) return;
        try {
            const res = await fetch(`http://localhost:3000/api/calls?userId=${session.user.id}`);
            const data = await res.json();

            if (Array.isArray(data)) {
                // Map Vapi data manually if needed, or use as is.
                // Vapi returns: { id, startedAt, summary, transcript, recordingUrl, customer: { number } }
                const formatted = data.map(c => ({
                    id: c.id,
                    name: "Unknown Caller", // Vapi doesn't usually give names unless enriched
                    number: c.customer?.number || "Unknown Number",
                    time: new Date(c.startedAt).toLocaleString(), // Simple format for now
                    rawTime: c.startedAt,
                    preview: c.analysis?.summary || c.summary || "No summary available",
                    summary: c.analysis?.summary || c.summary || "Processing summary...",
                    transcript: c.analysis?.transcript || c.transcript || "No transcript available",
                    recordingUrl: c.recordingUrl || c.artifact?.recordingUrl,
                    status: c.status
                }));
                setCalls(formatted);
            }
        } catch (e) {
            console.error("Failed to fetch calls", e);
        }
    };

    useEffect(() => {
        if (session && view === 'inbox') {
            fetchCalls();
        }
    }, [session, view]);




    const openCallDetail = (call) => {
        setSelectedCall(call);
        setView('call-detail');
    };

    const showToast = (message) => {
        setToast(message);
        setTimeout(() => setToast(null), 3000);
    };

    // --- Styles ---
    const headerGradient = "bg-gradient-to-b from-blue-300 via-blue-500 to-blue-800";

    const [provisioning, setProvisioning] = useState(false);

    const handleProvision = async () => {
        if (!session?.user) return;
        setProvisioning(true);
        try {
            const res = await fetch('http://localhost:3000/api/provision', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: session.user.id })
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
                await fetch('http://localhost:3000/api/sync-assistant', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: session.user.id, languages, voiceId: overrideVoiceId })
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

    if (authLoading && !session) return <div className="flex h-screen w-full items-center justify-center bg-[#F2F4F8] text-blue-500 font-bold">Loading NuPhone...</div>;

    return (
        <div className="flex flex-col h-screen bg-[#F2F4F8] font-sans relative text-gray-900 overflow-hidden">


            {/* --- Auth View --- */}
            {view === 'auth' && (
                <div className="flex flex-col h-full items-center justify-center p-6 animate-in fade-in duration-500">
                    <div className="bg-white p-8 rounded-[2rem] shadow-xl w-full max-w-sm">
                        <div className="flex justify-center mb-6">
                            <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                                <PhoneCall size={32} />
                            </div>
                        </div>
                        <h1 className="text-2xl font-black text-center text-gray-900 mb-2">Welcome to LCE</h1>
                        <p className="text-center text-gray-600 text-sm mb-8 font-medium">Your AI Receptionist awaits.</p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Email Address</label>
                                <input
                                    type="email"
                                    value={authEmail}
                                    onChange={e => setAuthEmail(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base font-bold text-gray-900 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                    placeholder="you@company.com"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Password</label>
                                <input
                                    type="password"
                                    value={authPassword}
                                    onChange={e => setAuthPassword(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base font-bold text-gray-900 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                    placeholder="••••••••"
                                />
                            </div>

                            {authError && <p className="text-red-500 text-xs font-bold text-center">{authError}</p>}

                            <button
                                onClick={handleAuth}
                                disabled={authLoading}
                                className="w-full bg-blue-500 text-white py-4 rounded-2xl font-bold hover:bg-blue-600 active:scale-[0.98] transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {authLoading ? "Please wait..." : (authMode === 'signin' ? "Sign In" : "Create Account")}
                            </button>

                            <div className="text-center mt-4">
                                <button
                                    onClick={() => { setAuthMode(authMode === 'signin' ? 'signup' : 'signin'); setAuthError(null); }}
                                    className="text-xs font-bold text-gray-600 hover:text-blue-500 transition-colors"
                                >
                                    {authMode === 'signin' ? "New here? Create Account" : "Already have an account? Sign In"}
                                </button>
                            </div>
                        </div>
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

            {/* --- Status Bar Area (Mock) --- */}
            {view !== 'auth' && (
                <div className={`h-11 w-full absolute top-0 left-0 z-50 flex justify-between items-center px-6 ${view === 'intro' || view === 'settings' ? 'text-gray-900' : 'text-white'} text-xs font-bold pointer-events-none`}>
                    <span>2:39</span>
                    <div className="flex items-center space-x-1.5">
                        {/* Circle indicators removed */}
                    </div>
                </div>
            )}

            {/* =========================================
               INTRO VIEW
               ========================================= */}
            {view === 'intro' && (
                <div
                    onClick={() => setView('receptionist')}
                    className="absolute inset-0 z-[100] bg-white flex flex-col items-center justify-between pb-12 cursor-pointer animate-in fade-in duration-700"
                >
                    <div className="flex-1 flex flex-col justify-center items-center">
                        <h1 className="text-[2.5rem] leading-tight font-black text-gray-900 tracking-tight text-center">
                            Never Miss<br />Another Call
                        </h1>
                    </div>
                    <div className="text-gray-600 font-bold text-xs uppercase tracking-widest">
                        Powered by <span className="text-gray-900">NuPhone</span>
                    </div>
                </div>
            )}

            {/* =========================================
               INBOX VIEW
               ========================================= */}
            {view === 'inbox' && (
                <div className="flex flex-col h-full relative animate-in fade-in duration-500 bg-transparent">
                    {/* Header */}
                    <div className="pt-14 pb-2 px-6 flex justify-center items-center shrink-0 z-20">
                        <h1 className="text-2xl font-black tracking-tight">
                            <span className="text-gray-900">clear</span><span className="text-blue-600">wise.</span>
                        </h1>
                    </div>

                    <div className="flex-1 overflow-y-auto pb-48 px-4 scrollbar-hide">
                        {/* Dashboard Stats */}
                        <div className="space-y-3 mb-6">
                            {/* Assistant Status Card */}
                            <div className="bg-white border border-gray-100 rounded-3xl p-4 shadow-sm flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-full overflow-hidden bg-blue-50 border-4 border-white shadow-md">
                                        <img
                                            src={voiceOptions.find(v => v.id === personality.voiceId || v.name === personality.name)?.avatar || voiceOptions[0].avatar}
                                            alt="Assistant"
                                            className="w-full h-full object-cover scale-110 translate-y-1"
                                        />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-lg">{personality.name}</h3>
                                        <div className="flex items-center gap-1.5">
                                            <div className={`w-2 h-2 rounded-full ${isReceptionistActive ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                                            <span className={`text-xs font-bold uppercase tracking-wider ${isReceptionistActive ? 'text-[#2563EB]' : 'text-gray-600'}`}>
                                                {isReceptionistActive ? "Active 24/7" : "Offline"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <Info size={20} className="text-gray-300" />
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white rounded-3xl p-5 flex flex-col items-center justify-center text-center">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-2">
                                        <Phone size={16} className="fill-current" />
                                    </div>
                                    <span className="text-3xl font-black text-gray-900 leading-none mb-1">{calls.length}</span>
                                    <span className="text-sm font-bold text-gray-600">calls handled</span>
                                </div>
                                <div className="bg-white rounded-3xl p-5 flex flex-col items-center justify-center text-center">
                                    <div className="w-8 h-8 rounded-full bg-red-100 text-red-500 flex items-center justify-center mb-2">
                                        <ShieldAlert size={16} className="fill-current" />
                                    </div>
                                    <span className="text-3xl font-black text-gray-900 leading-none mb-1">0</span>
                                    <span className="text-sm font-bold text-gray-600">spam blocked</span>
                                </div>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-2 mb-6">
                            <button
                                onClick={() => setActiveInboxTab('inbox')}
                                className={`px-6 py-2.5 rounded-full text-xs font-bold transition-all ${activeInboxTab === 'inbox' ? 'bg-[#2563EB] text-white shadow-lg shadow-blue-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                                Inbox <span className="ml-1 opacity-80">{calls.filter(c => c.status === 'unread' && !archivedIds.includes(c.id)).length}</span>
                            </button>
                            <button
                                onClick={() => setActiveInboxTab('archived')}
                                className={`px-6 py-2.5 rounded-full text-xs font-bold transition-all ${activeInboxTab === 'archived' ? 'bg-[#2563EB] text-white shadow-lg shadow-blue-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                                Archived
                            </button>
                        </div>

                        {/* Grouped Calls List */}
                        <div className="space-y-6">
                            {(() => {
                                const visibleCalls = calls.filter(c => activeInboxTab === 'archived' ? archivedIds.includes(c.id) : !archivedIds.includes(c.id));
                                const grouped = visibleCalls.reduce((acc, call) => {
                                    const date = new Date(call.rawTime);
                                    const now = new Date();
                                    const diffTime = Math.abs(now - date);
                                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                                    let label = "Older";
                                    if (diffDays === 0 && now.getDate() === date.getDate()) label = "Today";
                                    else if (diffDays === 1) label = "Yesterday";
                                    else if (diffDays <= 7) label = "Previous 7 Days";
                                    else if (diffDays <= 30) label = "Last 30 Days";

                                    if (!acc[label]) acc[label] = [];
                                    acc[label].push(call);
                                    return acc;
                                }, {});

                                const order = ["Today", "Yesterday", "Previous 7 Days", "Last 30 Days", "Older"];

                                return order.map(label => {
                                    if (!grouped[label] || grouped[label].length === 0) return null;
                                    return (
                                        <div key={label}>
                                            <h3 className="text-[#2563EB] font-bold text-sm mb-3 pl-1">{label}</h3>
                                            <div className="space-y-4">
                                                {grouped[label].map(call => {

                                                    const isExpanded = expandedCallId === call.id;

                                                    return (
                                                        <div
                                                            key={call.id}
                                                            onClick={() => setExpandedCallId(isExpanded ? null : call.id)}
                                                            className={`bg-white rounded-[1.5rem] p-5 shadow-sm border border-gray-100 transition-all duration-300 overflow-hidden ${isExpanded ? 'ring-2 ring-[#2563EB]/50 shadow-md transform scale-[1.01]' : 'active:scale-[0.98]'}`}
                                                        >
                                                            <div className="flex justify-between items-start mb-2">
                                                                <div>
                                                                    <h4 className="font-bold text-gray-900 text-lg">{call.number}</h4>
                                                                    <div className="text-xs font-bold text-gray-600 mt-0.5 max-w-[200px] truncate">
                                                                        {call.name === "Unknown Caller" ? "Unknown" : call.name}
                                                                    </div>
                                                                </div>
                                                                <span className="text-xs font-bold text-gray-600">
                                                                    {/* Time Format: 4:10 PM */}
                                                                    {new Date(call.rawTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                                                </span>
                                                            </div>

                                                            {/* Summary / Preview */}
                                                            {!isExpanded && (
                                                                <p className="text-gray-600 text-xs truncate font-medium mt-1">
                                                                    {call.summary}
                                                                </p>
                                                            )}

                                                            {/* Expanded View Content */}
                                                            {isExpanded && (
                                                                <div className="animate-in fade-in slide-in-from-top-2 duration-300 pt-2">
                                                                    <p className="text-gray-700 text-sm font-medium leading-relaxed mb-6">
                                                                        {call.summary}
                                                                    </p>

                                                                    {/* Actions */}
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
                                                                            {!archivedIds.includes(call.id) && (
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
                                                                            {archivedIds.includes(call.id) && (
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
                                                                            <button className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
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

                                                                    {/* Transcript Chat */}
                                                                    <div className="space-y-3">
                                                                        {/* Parse Transcript */}
                                                                        {call.transcript ? (
                                                                            call.transcript.split(/(?=AI:|User:)/g).map((msg, i) => {
                                                                                const isAI = msg.trim().startsWith("AI:");
                                                                                const cleanMsg = msg.replace(/^(AI:|User:)/i, '').trim();
                                                                                if (!cleanMsg) return null;

                                                                                return (
                                                                                    <div key={i} className={`p-3 rounded-2xl text-sm font-medium leading-relaxed max-w-[90%] shadow-sm ${isAI ? 'bg-[#2563EB] text-white rounded-tl-sm mr-auto' : 'bg-gray-100 text-gray-800 rounded-tr-sm ml-auto'}`}>
                                                                                        <span className={`text-[10px] uppercase font-bold block mb-1 ${isAI ? 'text-blue-200' : 'text-gray-400'}`}>
                                                                                            {isAI ? 'Assistant' : 'Caller'}
                                                                                        </span>
                                                                                        {cleanMsg}
                                                                                    </div>
                                                                                );
                                                                            })
                                                                        ) : (
                                                                            <div className="bg-[#2563EB] text-white p-3 rounded-2xl rounded-tl-sm text-sm font-medium leading-relaxed max-w-[90%] shadow-sm">
                                                                                <span className="text-[10px] uppercase font-bold text-blue-200 block mb-1">Assistant</span>
                                                                                Hello. You've reached {userInfo.company || "us"}. I'm {personality.name}. How can I help you?
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                </div>
                                                            )}
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
            )}


            {/* =========================================
               ONBOARDING VIEW
               ========================================= */}
            {
                view === 'onboarding' && (
                    <div className="flex flex-col h-full items-center justify-center p-6 bg-[#F2F4F8] animate-in fade-in duration-500">
                        <div className="bg-white p-8 rounded-[2rem] shadow-xl w-full max-w-lg overflow-y-auto max-h-[90vh]">
                            <div className="text-center mb-8">
                                <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200 mx-auto mb-4">
                                    <Settings size={32} />
                                </div>
                                <h2 className="text-2xl font-black text-gray-900 mb-2">Setup Your Receptionist</h2>
                                <p className="text-gray-400 text-sm font-medium">Tell us a bit about your business to get started.</p>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Company Name <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={userInfo.company}
                                        onChange={e => setUserInfo({ ...userInfo, company: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base font-bold text-gray-900 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                        placeholder="e.g. Acme Corp"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Industry / Business Type <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={userInfo.businessType}
                                        onChange={e => setUserInfo({ ...userInfo, businessType: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base font-medium text-gray-900 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                        placeholder="e.g. Dental Clinic"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Business Description <span className="text-red-500">*</span></label>
                                    <textarea
                                        value={userInfo.businessDetails}
                                        onChange={e => setUserInfo({ ...userInfo, businessDetails: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base font-medium text-gray-900 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none"
                                        rows={4}
                                        placeholder="Briefly describe what your business does..."
                                    />
                                </div>

                                <button
                                    onClick={handleOnboardingSubmit}
                                    className="w-full bg-blue-500 text-white py-4 rounded-2xl font-bold hover:bg-blue-600 active:scale-[0.98] transition-all shadow-lg shadow-blue-200 mt-4"
                                >
                                    Save & Continue
                                </button>
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
                        <div className="pt-14 pb-2 px-6 flex justify-center items-center shrink-0 z-20">
                            <h1 className="text-2xl font-black tracking-tight">
                                <span className="text-gray-900">Juno</span><span className="text-blue-600">Desk</span>
                            </h1>
                        </div>

                        {/* Tabs (Pill Style) */}
                        <div className="flex justify-center gap-2 mb-6 px-4">
                            {['Instructions', 'Knowledge', 'Phone'].map((tab) => {
                                const isActive = activeReceptionistTab === tab.toLowerCase();
                                return (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveReceptionistTab(tab.toLowerCase())}
                                        className={`px-6 py-2.5 rounded-full text-xs font-bold transition-all ${isActive
                                            ? 'bg-[#2563EB] text-white shadow-lg shadow-blue-200'
                                            : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
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

                                    {/* Languages Section */}
                                    <section>
                                        <div className="flex justify-between items-center mb-4">
                                            <div className="flex items-center gap-2">
                                                <Globe size={18} className="text-[#2563EB]" />
                                                <h3 className="text-base font-bold text-gray-900">Languages</h3>
                                            </div>
                                            <button
                                                onClick={() => setShowLanguageModal(true)}
                                                className="text-xs font-bold text-gray-400 hover:text-[#2563EB] transition-colors flex items-center gap-1"
                                            >
                                                <Edit2 size={12} /> Edit
                                            </button>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {languages.map(lang => (
                                                <span key={lang} className="px-4 py-2 bg-blue-50 text-[#2563EB] rounded-full text-xs font-bold border border-blue-100">
                                                    {lang}
                                                </span>
                                            ))}
                                        </div>
                                    </section>

                                    {/* Voice & Personality Grid */}
                                    <section>
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                                <AudioWaveform size={18} className="text-[#2563EB]" /> Voice & Personality
                                            </h3>
                                            <span className="text-[10px] uppercase tracking-wide font-bold text-gray-600">
                                                Voice changes apply to future calls
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3">
                                            {voiceOptions.length > 0 ? voiceOptions.map((p) => {
                                                const isSelected = personality.voiceId === p.id;
                                                const isPlaying = playingVoiceId === p.id;

                                                return (
                                                    <button
                                                        key={p.id}
                                                        onClick={async () => {
                                                            // Secure Preview using Backend Proxy
                                                            setPlayingVoiceId(p.id);
                                                            try {
                                                                const res = await fetch("http://localhost:3000/api/voice-preview", {
                                                                    method: "POST",
                                                                    headers: { "Content-Type": "application/json" },
                                                                    body: JSON.stringify({ voiceId: p.id })
                                                                });

                                                                if (!res.ok) throw new Error("Preview failed");

                                                                const blob = await res.blob();
                                                                const audio = new Audio(URL.createObjectURL(blob));


                                                                audio.onended = () => setPlayingVoiceId(null);
                                                                audio.onerror = () => setPlayingVoiceId(null);

                                                                await audio.play();

                                                            } catch (e) {
                                                                console.error("Preview play error", e);
                                                                setPlayingVoiceId(null);
                                                            }

                                                            setPersonality(prev => ({ ...prev, name: p.name, voiceId: p.id }));

                                                            // Sync to DB (business_profiles is source of truth for voice)
                                                            try {
                                                                await supabase
                                                                    .from('business_profiles')
                                                                    .update({
                                                                        voice_id: p.id,
                                                                        assistant_name: p.name
                                                                    })
                                                                    .eq('owner_user_id', session.user.id);

                                                                // Also update personality name in business_profiles if needed, or keep using business_info for non-core stuff?
                                                                // For now, only voice_id is mandated to move. 
                                                                // But we might want to update the name in profile too if that's where we want it.
                                                                // The user prompt only specified voice_id.

                                                                // Legacy cleanup: Remove voiceId from business_info if it exists there to avoid confusion?
                                                                // User said: "Remove any writes of voiceId to business_info". 
                                                                // We won't delete the whole personality item because it might store the Name.

                                                                syncAssistant(p.id);
                                                            } catch (err) {
                                                                console.error("Failed to save personality", err);
                                                                showToast("Failed to save voice");
                                                            }
                                                        }}
                                                        className={`relative flex flex-col items-center p-3 rounded-2xl border-2 transition-all duration-300 ${isSelected ? 'border-[#2563EB] bg-[#EFF6FF]' : 'border-gray-100 bg-white hover:border-gray-200'} active:scale-95`}
                                                    >
                                                        <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gray-100 mb-3 ring-4 ring-gray-50 shadow-inner">
                                                            <img src={p.avatar} alt={p.name} className="w-full h-full object-cover scale-125 translate-y-1" />
                                                            {isPlaying && (
                                                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                                                    <AudioWaveform size={20} className="text-white animate-pulse" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <span className={`text-xs font-bold truncate w-full text-center ${isSelected ? 'text-[#2563EB]' : 'text-gray-900'}`}>{p.name}</span>
                                                        <span className="text-[10px] font-medium text-gray-400 capitalize">{p.provider || 'AI'}</span>
                                                    </button>
                                                )
                                            }) : (
                                                <div className="col-span-3 text-center py-8 text-gray-400 text-sm font-medium">
                                                    Loading voices...
                                                </div>
                                            )}
                                        </div>
                                    </section>

                                    {/* Greeting Message */}
                                    <section>
                                        <h3 className="text-base font-bold text-gray-900 mb-1">Greeting Message</h3>
                                        <p className="text-xs text-gray-500 mb-4">The first message your receptionist says upon accepting a call</p>

                                        <div className="border border-gray-100 rounded-xl p-4 shadow-sm bg-white">
                                            <input
                                                type="text"
                                                value={greeting}
                                                onChange={(e) => setGreeting(e.target.value)}
                                                onBlur={async () => {
                                                    await supabase.from('business_info')
                                                        .update({ content: { text: greeting } })
                                                        .eq('owner_user_id', session.user.id)
                                                        .eq('type', 'greeting');
                                                    showToast("Greeting saved");
                                                    syncAssistant();
                                                }}
                                                className="w-full text-sm text-gray-900 font-medium outline-none bg-transparent placeholder-gray-400"
                                                placeholder="Hey, thank you for calling LCE. How may I help you?"
                                            />
                                        </div>
                                    </section>



                                    {/* Instructions */}
                                    <section>
                                        <h3 className="text-base font-bold text-gray-900 mb-1">Instructions</h3>
                                        <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                                            Specific instructions for how your receptionist should handle calls.
                                        </p>

                                        <div className="space-y-3">
                                            {knowledgeItems.filter(i => i.type === 'instruction').map((item) => (
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
                                                    className="bg-gray-900 text-white rounded-xl w-12 flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
                                                >
                                                    <Plus size={20} />
                                                </button>
                                            </div>
                                        </div>
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
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Business Name</label>
                                            <input
                                                type="text"
                                                value={userInfo.company}
                                                onChange={(e) => setUserInfo({ ...userInfo, company: e.target.value })}
                                                onBlur={(e) => saveProfileField('company_name', e.target.value)}
                                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-base font-bold text-gray-900 shadow-sm focus:ring-2 focus:ring-blue-400/20 outline-none transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Industry</label>
                                            <input
                                                type="text"
                                                value={userInfo.businessType}
                                                onChange={(e) => setUserInfo({ ...userInfo, businessType: e.target.value })}
                                                onBlur={(e) => saveProfileField('industry', e.target.value)}
                                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-base font-medium text-gray-900 shadow-sm focus:ring-2 focus:ring-blue-400/20 outline-none transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Support Email</label>
                                            <input
                                                type="text"
                                                value={userInfo.email}
                                                onChange={(e) => setUserInfo({ ...userInfo, email: e.target.value })}
                                                onBlur={(e) => saveProfileField('support_email', e.target.value)}
                                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-base font-medium text-gray-900 shadow-sm focus:ring-2 focus:ring-blue-400/20 outline-none transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Address</label>
                                            <input
                                                type="text"
                                                value={userInfo.address}
                                                onChange={(e) => setUserInfo({ ...userInfo, address: e.target.value })}
                                                onBlur={(e) => saveProfileField('address', e.target.value)}
                                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-base font-medium text-gray-900 shadow-sm focus:ring-2 focus:ring-blue-400/20 outline-none transition-all"
                                            />
                                        </div>

                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Website</label>
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Train from Website</span>
                                                    <button
                                                        onClick={() => {
                                                            const newVal = !userInfo.websiteTraining;
                                                            setUserInfo({ ...userInfo, websiteTraining: newVal });
                                                            saveProfileField('website_training_enabled', newVal);
                                                        }}
                                                        className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none ${userInfo.websiteTraining ? 'bg-blue-500' : 'bg-gray-200'}`}
                                                    >
                                                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${userInfo.websiteTraining ? 'translate-x-4' : 'translate-x-0'}`} />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={userInfo.website}
                                                    onChange={(e) => setUserInfo({ ...userInfo, website: e.target.value })}
                                                    onBlur={(e) => saveProfileField('website', e.target.value)}
                                                    placeholder="https://example.com"
                                                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-base font-medium text-gray-900 shadow-sm focus:ring-2 focus:ring-blue-400/20 outline-none transition-all placeholder:text-gray-300"
                                                />
                                            </div>
                                            <p className="text-[10px] text-gray-400 mt-2 ml-1">
                                                We will use your website to add knowledge info.
                                            </p>
                                        </div>

                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Emergency Number</label>
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Emergency Transfer</span>
                                                    <button
                                                        onClick={() => {
                                                            const newVal = !userInfo.useEmergencyNumber;
                                                            setUserInfo({ ...userInfo, useEmergencyNumber: newVal });
                                                            saveProfileField('emergency_transfer_enabled', newVal);
                                                        }}
                                                        className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none ${userInfo.useEmergencyNumber ? 'bg-blue-500' : 'bg-gray-200'}`}
                                                    >
                                                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${userInfo.useEmergencyNumber ? 'translate-x-4' : 'translate-x-0'}`} />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={userInfo.emergencyNumber}
                                                    onChange={(e) => setUserInfo({ ...userInfo, emergencyNumber: e.target.value })}
                                                    onBlur={(e) => saveProfileField('emergency_phone', e.target.value)}
                                                    placeholder="+1 (555) 000-0000"
                                                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-base font-medium text-gray-900 shadow-sm focus:ring-2 focus:ring-blue-400/20 outline-none transition-all placeholder:text-gray-300"
                                                />
                                            </div>
                                            <p className="text-[10px] text-gray-400 mt-2 ml-1">
                                                Should we use a number in case of a customer emergency?
                                            </p>
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



                                        <div className="w-full h-px bg-gray-200/60 my-2"></div>

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
                                                        className="bg-gray-900 text-white rounded-xl w-12 flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
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
                                                        <p className="text-xs text-gray-400 mt-0.5">Call to test your assistant</p>
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
                                                            <p className="text-xs text-gray-400 mt-0.5">Link your personal number</p>
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
                                                    <p className="text-xs text-gray-400 mt-0.5">Allow contacts to bypass AI</p>
                                                </div>
                                                <div className="w-11 h-6 bg-gray-200 rounded-full relative cursor-pointer transition-colors duration-200 hover:bg-gray-300">
                                                    <div className="absolute left-[2px] top-[2px] w-5 h-5 bg-white rounded-full shadow-sm"></div>
                                                </div>
                                            </section>

                                            {/* 5. Connected Phone Number (New) */}
                                            <section>
                                                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 ml-4 mt-8">Account Phone Number</h3>
                                                <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
                                                    <div className="flex items-center gap-3 mb-4">
                                                        <PhoneCall size={20} className="text-[#2563EB] fill-current" />
                                                        <h3 className="text-base font-bold text-gray-900">Connected Phone Number</h3>
                                                    </div>

                                                    <div className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-lg font-medium text-gray-900 tracking-tight flex items-center justify-center mb-4">
                                                        +1 (281) 650-5521
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
                    <div className="absolute inset-0 z-[60] bg-transparent flex flex-col h-full animate-in slide-in-from-right duration-300">
                        {/* Header */}
                        <div className="px-6 pt-12 pb-4 flex justify-between items-center z-20">
                            <button onClick={() => setView('inbox')} className="w-10 h-10 -ml-2 rounded-full items-center justify-center flex hover:bg-gray-50 transition-colors text-gray-900">
                                <ChevronLeft size={28} />
                            </button>
                            <h1 className="text-lg font-bold text-gray-900">Call Details</h1>
                            <button
                                onClick={() => showToast('Shared transcript')}
                                className="w-10 h-10 -mr-2 rounded-full items-center justify-center flex hover:bg-gray-50 transition-colors text-gray-900"
                            >
                                <Share2 size={22} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 pb-48 space-y-4">
                            <div className="bg-white rounded-[2rem] p-6 shadow-sm text-center">
                                <div className="w-20 h-20 bg-gray-100 rounded-full mx-auto flex items-center justify-center mb-4 text-2xl font-bold text-gray-400">
                                    {selectedCall.name.charAt(0)}
                                </div>
                                <h2 className="text-2xl font-black text-gray-900">{selectedCall.name}</h2>
                                <p className="text-gray-500 font-medium mt-1 mb-2">{selectedCall.number}</p>

                                <button
                                    onClick={() => showToast("Added to Contacts")}
                                    className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors flex items-center mx-auto"
                                >
                                    <UserPlus size={14} className="mr-1.5" />
                                    Add to Contacts
                                </button>

                                <div className="grid grid-cols-2 gap-3 mt-8">
                                    <button className="bg-blue-500 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-200 flex items-center justify-center active:scale-95 transition-all">
                                        <Phone size={18} className="mr-2" /> Call
                                    </button>
                                    <button className="bg-gray-100 text-gray-900 py-3.5 rounded-xl font-bold flex items-center justify-center active:scale-95 transition-all hover:bg-gray-200">
                                        <MessageSquare size={18} className="mr-2" /> Text
                                    </button>
                                </div>
                            </div>

                            <div className="bg-white rounded-[2rem] p-6 shadow-sm">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Summary</h3>
                                <p className="text-gray-700 leading-relaxed font-medium">
                                    {selectedCall.summary}
                                </p>

                                {/* Action Item Card */}
                                {selectedCall.actionItem && (
                                    <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center gap-4">
                                        <div className="w-10 h-10 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center shrink-0">
                                            <Calendar size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 text-sm">{selectedCall.actionItem.label}</h4>
                                            <p className="text-blue-500 text-xs font-bold mt-0.5">{selectedCall.actionItem.details}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Audio Player */}
                                {selectedCall.recordingUrl && (
                                    <div className="mt-6 pt-6 border-t border-gray-100">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Recording</h4>
                                        <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
                                            <button
                                                onClick={() => {
                                                    const audio = new Audio(selectedCall.recordingUrl);
                                                    audio.play();
                                                }}
                                                className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center text-gray-900 hover:scale-105 active:scale-95 transition-all">
                                                <Play size={18} className="ml-1 fill-current" />
                                            </button>
                                            <div className="flex-1 h-8 flex items-center gap-1">
                                                {/* Mock Waveform */}
                                                {Array.from({ length: 24 }).map((_, i) => (
                                                    <div key={i} className={`w-1 rounded-full bg-blue-200 ${i % 3 === 0 ? 'h-6 bg-blue-300' : 'h-3'}`} style={{ height: `${Math.max(20, Math.random() * 100)}%` }}></div>
                                                ))}
                                            </div>
                                            <a href={selectedCall.recordingUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-500 hover:underline">Download</a>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Transcript - Handle Vapi String vs Array */}
                            <div className="bg-white rounded-[2rem] p-6 shadow-sm">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Transcript</h3>
                                <div className="space-y-4">
                                    {selectedCall.transcript ? (
                                        <p className="text-sm font-medium leading-relaxed text-gray-700 whitespace-pre-wrap">
                                            {selectedCall.transcript}
                                        </p>
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
               SETTINGS VIEW
               ========================================= */}
            {
                view === 'settings' && (
                    <div className="flex flex-col h-full bg-transparent relative animate-in slide-in-from-right duration-300">
                        {/* Header */}
                        {/* Header */}
                        <div className="pt-14 pb-2 px-6 flex justify-center items-center shrink-0 z-20">
                            <h1 className="text-2xl font-black tracking-tight">
                                <span className="text-gray-900">Juno</span><span className="text-blue-600">Desk</span>
                            </h1>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 pb-48">

                            {/* --- FEATURES --- */}
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 ml-4 mt-4">Features</h3>
                            <div className="bg-white rounded-[1.5rem] border border-gray-100 shadow-sm overflow-hidden">

                                {/* Contacts */}
                                <div className="flex items-center justify-between p-5 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => showToast('Opening Contacts Settings...')}>
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0">
                                            <Users size={20} className="stroke-[2.5px]" />
                                        </div>
                                        <div>
                                            <h4 className="text-base font-bold text-gray-900">Contacts</h4>
                                            <p className="text-sm font-medium text-red-500 mt-0.5">Enable in Settings to sync contacts</p>
                                        </div>
                                    </div>
                                    <div className="text-xs font-bold text-[#2563EB] flex items-center">
                                        Settings <ChevronRight size={14} className="ml-0.5" />
                                    </div>
                                </div>

                                {/* Notifications */}
                                <div className="flex items-center justify-between p-5 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0">
                                            <Bell size={20} className="stroke-[2.5px]" />
                                        </div>
                                        <div>
                                            <h4 className="text-base font-bold text-gray-900">Notifications</h4>
                                            <p className="text-sm font-medium text-red-500 mt-0.5">Enable in Settings to receive alerts</p>
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

                                {/* Support */}
                                <div className="flex items-center justify-between p-5 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => showToast('Opening Support...')}>
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0">
                                            <MessageSquare size={20} className="stroke-[2.5px]" />
                                        </div>
                                        <div>
                                            <h4 className="text-base font-bold text-gray-900">Speak with support</h4>
                                            <p className="text-sm font-medium text-gray-600 mt-0.5">Get help or share your ideas!</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={20} className="text-gray-300" />
                                </div>

                                {/* Privacy Policy */}
                                <div className="flex items-center justify-between p-5 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => showToast('Opening Privacy Policy...')}>
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0">
                                            <Lock size={20} className="stroke-[2.5px]" />
                                        </div>
                                        <div>
                                            <h4 className="text-base font-bold text-gray-900">Privacy Policy</h4>
                                            <p className="text-sm font-medium text-gray-600 mt-0.5">Review privacy practices</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={20} className="text-gray-300" />
                                </div>

                                {/* Sign Out */}
                                <div className="flex items-center justify-between p-5 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer" onClick={async () => { await supabase.auth.signOut(); setView('auth'); }}>
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0">
                                            <LogOut size={20} className="stroke-[2.5px]" />
                                        </div>
                                        <div>
                                            <h4 className="text-base font-bold text-gray-900">Sign Out</h4>
                                            <p className="text-sm font-medium text-gray-600 mt-0.5">Log out of your account</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={20} className="text-gray-300" />
                                </div>

                                {/* Delete Account */}
                                <div className="flex items-center justify-between p-5 hover:bg-red-50/50 transition-colors cursor-pointer" onClick={() => showToast('Delete Account Flow')}>
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                                            <Trash2 size={20} className="stroke-[2.5px]" />
                                        </div>
                                        <div>
                                            <h4 className="text-base font-bold text-red-500">Delete Account</h4>
                                            <p className="text-sm font-medium text-gray-400 mt-0.5">Remove your data</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={20} className="text-gray-300" />
                                </div>
                            </div>

                            {/* --- BUSINESS --- */}
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 ml-4 mt-8">Business</h3>
                            <div className="bg-white rounded-[1.5rem] border border-gray-100 shadow-sm overflow-hidden mb-8">
                                <div className="flex items-center justify-between p-5 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setView('manage-plan')}>
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0">
                                            <Briefcase size={20} className="stroke-[2.5px]" />
                                        </div>
                                        <div>
                                            <h4 className="text-base font-bold text-gray-900">Need more from your receptionist?</h4>
                                            <p className="text-sm font-medium text-gray-600 mt-0.5">Talk to us about our Business plan →</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={20} className="text-gray-300" />
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex flex-col items-center justify-center pb-8 text-gray-400 gap-1.5 opacity-60">
                                <span className="text-sm font-bold tracking-widest uppercase">Made with <span className="text-red-500">♥</span> in the USA 🇺🇸</span>
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
                view !== 'auth' && view !== 'onboarding' && view !== 'intro' && (
                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-[24rem] bg-white flex justify-between items-center py-4 px-8 z-[999] rounded-[2.5rem] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.1)]">

                        {/* Inbox Tab */}
                        <button
                            onClick={() => setView('inbox')}
                            className="flex flex-col items-center justify-center w-20 transition-all active:scale-95"
                        >
                            <div className={`w-12 h-12 flex items-center justify-center rounded-[1.2rem] mb-1 transition-all duration-300 ${view === 'inbox' || view === 'call-detail' ? 'bg-blue-50 text-blue-600 shadow-sm shadow-blue-100' : 'text-gray-400 hover:text-gray-600'}`}>
                                <img src="/pics/bot.png" alt="Inbox" className="w-6 h-6 object-contain" />
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${view === 'inbox' || view === 'call-detail' ? 'text-gray-900' : 'text-gray-400'}`}>Inbox</span>
                        </button>

                        {/* Receptionist Tab */}
                        <button
                            onClick={() => setView('receptionist')}
                            className="flex flex-col items-center justify-center w-20 transition-all active:scale-95"
                        >
                            <div className={`w-12 h-12 flex items-center justify-center rounded-[1.2rem] mb-1 transition-all duration-300 ${view === 'receptionist' ? 'bg-blue-50 text-blue-600 shadow-sm shadow-blue-100' : 'text-gray-400 hover:text-gray-600'}`}>
                                <img src="/pics/man-user.png" alt="Assistant" className="w-6 h-6 object-contain" />
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${view === 'receptionist' ? 'text-gray-900' : 'text-gray-400'}`}>Assistant</span>
                        </button>

                        {/* Settings Tab */}
                        <button
                            onClick={() => setView('settings')}
                            className="flex flex-col items-center justify-center w-20 transition-all active:scale-95"
                        >
                            <div className={`w-12 h-12 flex items-center justify-center rounded-[1.2rem] mb-1 transition-all duration-300 ${view === 'settings' ? 'bg-blue-50 text-blue-600 shadow-sm shadow-blue-100' : 'text-gray-400 hover:text-gray-600'}`}>
                                <img src="/pics/gear.png" alt="Settings" className="w-6 h-6 object-contain" />
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${view === 'settings' ? 'text-gray-900' : 'text-gray-400'}`}>Settings</span>
                        </button>

                    </div>
                )
            }

            {
                toast && (
                    <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-xl z-[100] animate-in fade-in slide-in-from-top-4 duration-300 flex items-center gap-2 pointer-events-none">
                        <span className="text-sm font-bold">{toast}</span>
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
                    <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-300">
                        <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-500">
                            <div className="flex justify-between items-center mb-6">
                                <button onClick={() => setShowLanguageModal(false)} className="text-gray-400 font-bold hover:text-gray-600">Cancel</button>
                                <h3 className="text-lg font-black text-gray-900">Languages</h3>
                                <button
                                    onClick={async () => {
                                        // Save Languages
                                        // We'll update the 'languages' state locally immediately for UI snappiness
                                        // The parent component should have a proper save handler if we want robust persistence logic here
                                        // But since we are editing in place, we can just save to DB.

                                        // Note: In a real React app, 'tempLanguages' should be used.
                                        // But for simplicity in this one-file setup, I'll access the 'languages' state directly?
                                        // NO, I need a temp state for the modal.
                                        // Since I can't easily add new state variables outside this block without re-rendering everything or adding complex logic,
                                        // I'll assume the user modifies `languages` directly? No that's bad UX (live update).
                                        // I will use a ref or just persist on toggle (a bit aggressive but works).
                                        // actually, let's just Close. The toggles already updated the state?
                                        // Wait, the toggles below need to update SOMETHING.
                                        // I will make the toggles update the main state directly for now to ensure it works without complex temp state injection.

                                        await supabase.from('business_info').delete().eq('owner_user_id', session.user.id).eq('type', 'languages');
                                        await supabase.from('business_info').insert({
                                            owner_user_id: session.user.id,
                                            type: 'languages',
                                            content: { languages }
                                        });
                                        syncAssistant();
                                        setShowLanguageModal(false);
                                    }}
                                    className="text-[#2563EB] font-bold hover:text-blue-700"
                                >
                                    Save
                                </button>
                            </div>

                            <p className="text-sm text-gray-500 font-medium mb-6 leading-relaxed">
                                Choose which languages your assistant can communicate in with callers.
                            </p>

                            <div className="grid grid-cols-3 gap-3">
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
                                            className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${isSelected ? 'border-[#2563EB] bg-blue-50/50' : 'border-gray-100 bg-white hover:bg-gray-50'}`}
                                        >
                                            <span className="text-2xl mb-2">{l.flag}</span>
                                            <span className="text-xs font-bold text-gray-900 mb-1">{l.name}</span>
                                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-[#2563EB] bg-[#2563EB]' : 'border-gray-200'}`}>
                                                {isSelected && <Check size={10} className="text-white" strokeWidth={4} />}
                                            </div>
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
