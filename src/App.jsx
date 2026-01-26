import React, { useState, useEffect } from 'react';
import {
    Phone, MessageSquare, Menu, RefreshCw, ChevronRight, User,
    ChevronLeft, Settings, HelpCircle, PhoneCall,
    Calendar, Bell, Edit2, MapPin, Clock, Briefcase, Globe, Plus, X,
    ArrowRight, Check, Share2, Search, Mic, Play, Pause, Copy, Info, ChevronDown,
    CreditCard, UserPlus, Star, ArrowUpRight, XCircle, MessageCircle, LifeBuoy, AudioWaveform, LogOut
} from 'lucide-react';
import { supabase } from './supabase';

export default function App() {
    // --- State ---
    // --- State ---
    const [session, setSession] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [calls, setCalls] = useState([]);
    const [simulating, setSimulating] = useState(false);

    // --- Navigation State ---
    const [view, setView] = useState('auth'); // Default to auth
    const [selectedCall, setSelectedCall] = useState(null);

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
    const [greeting, setGreeting] = useState("Hey, thank you for calling LCE. How may I help you?");
    const [activeReceptionistTab, setActiveReceptionistTab] = useState('instructions'); // 'instructions', 'knowledge', 'phone'
    const [isEditingReceptionist, setIsEditingReceptionist] = useState(false);
    const [toast, setToast] = useState(null);
    const [isForwardingSetupOpen, setIsForwardingSetupOpen] = useState(false);
    const [isReceptionistActive, setIsReceptionistActive] = useState(false);

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
        name: "Andrew",
        description: "Professional, formal, and polite."
    });

    // User Info State
    const [userInfo, setUserInfo] = useState({
        number: "+12816505521",
        name: "Aayush",
        company: "LCE",
        businessType: "Information Technology Services",
        email: "support@lce.com",
        address: "123 Main St, Suite 100",
        website: "",
        websiteTraining: false,
        emergencyNumber: "",
        useEmergencyNumber: false,
        businessDetails: "LCE is a company specializing in IT services. We offer a wide range of tech solutions including cloud computing, cybersecurity, and software development.",
        instructions: ""
    });

    // --- Knowledge State ---
    const [knowledgeQuestions, setKnowledgeQuestions] = useState([]);

    // Fetch from Supabase
    useEffect(() => {
        const fetchQuestions = async () => {
            if (!session?.user) return;
            const { data, error } = await supabase.from('knowledge_questions').select('*').order('created_at', { ascending: true });
            if (data) setKnowledgeQuestions(data);
            if (error) console.error('Error loading questions:', error);
        };
        fetchQuestions();
    }, [session]);
    const [knowledgeKeywords, setKnowledgeKeywords] = useState([]);
    const [newKeyword, setNewKeyword] = useState("");

    // --- UI State for Interactions ---
    const [activeModal, setActiveModal] = useState(null); // 'add-question', 'add-appointment', etc.
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
            } else {
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

    // --- Effects ---
    useEffect(() => {
        // Mock data for UI preview
        setCalls([
            {
                id: 1,
                name: "Aayush Sf",
                number: "+1 (555) 010-9988",
                time: "1d",
                status: "unread",
                summary: "Customer scheduled a consultation appointment for tomorrow.",
                actionItem: { type: 'calendar', label: 'Appointment Scheduled', details: 'Tomorrow, 2:00 PM' },
                transcript: [
                    { role: 'receptionist', text: "Hey, thank you for calling LCE. How may I help you?" },
                    { role: 'caller', text: "Hi, I'm looking to schedule a consultation for my business." },
                    { role: 'receptionist', text: "I can certainly help with that. We have openings tomorrow afternoon. " },
                    { role: 'caller', text: "Does 2 PM work?" },
                    { role: 'receptionist', text: "Let me check... Yes, 2 PM is available. I'll lock that in for you." },
                    { role: 'caller', text: "Great, thank you." }
                ]
            },
            {
                id: 2,
                name: "John Doe",
                number: "+1 (555) 123-4567",
                time: "2d",
                status: "read",
                summary: "Inquired about pricing for the enterprise tier.",
                transcript: [
                    { role: 'receptionist', text: "Hey, thank you for calling LCE. How may I help you?" },
                    { role: 'caller', text: "Yeah, I was just looking at your website and couldn't find pricing for the enterprise tier." },
                    { role: 'receptionist', text: "Our enterprise tier is customized based on your needs, but it typically starts around $500/month." },
                    { role: 'caller', text: "Okay, that helps. Thanks." }
                ]
            }
        ]);
    }, []);

    const simulateIncomingCall = async () => {
        setSimulating(true);
        setTimeout(() => {
            setSimulating(false);
            const randomCallers = [
                { name: "Sarah Miller", number: "+1 (513) 555-0123", summary: "Asking about the office hours and return policy." },
                { name: "Mike Ross", number: "+1 (212) 555-0198", summary: "Wanted to schedule a consultation for next Tuesday." },
                { name: "Unknown Caller", number: "+1 (513) 555-0999", summary: "Hung up immediately after the greeting." },
                { name: "Pizza Hut", number: "+1 (513) 555-0777", summary: "Delivery driver is outside the building." },
                { name: "Dr. Smith's Office", number: "+1 (513) 555-0342", summary: "Reminder about your appointment tomorrow at 2 PM." }
            ];
            const randomCaller = randomCallers[Math.floor(Math.random() * randomCallers.length)];

            setCalls(prev => [{
                id: Date.now(),
                name: randomCaller.name,
                number: randomCaller.number,
                time: "Just now",
                status: "unread",
                summary: randomCaller.summary
            }, ...prev]);
        }, 1500);
    };

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

    // --- RENDER ---
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
                        <p className="text-center text-gray-400 text-sm mb-8 font-medium">Your AI Receptionist awaits.</p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Email Address</label>
                                <input
                                    type="email"
                                    value={authEmail}
                                    onChange={e => setAuthEmail(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base font-bold text-gray-900 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                    placeholder="you@company.com"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Password</label>
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
                                    className="text-xs font-bold text-gray-400 hover:text-blue-500 transition-colors"
                                >
                                    {authMode === 'signin' ? "New here? Create Account" : "Already have an account? Sign In"}
                                </button>
                            </div>
                        </div>
                    </div>
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
                    <div className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">
                        Powered by <span className="text-gray-900">NuPhone</span>
                    </div>
                </div>
            )}

            {/* =========================================
               INBOX VIEW
               ========================================= */}
            {view === 'inbox' && (
                <div className="flex flex-col h-full relative animate-in fade-in duration-500">
                    {/* Header */}
                    <div className={`${headerGradient} pt-14 pb-8 px-6 rounded-b-[2.5rem] shadow-lg shrink-0 z-10 relative`}>
                        <div className="flex justify-between items-center mb-6">
                            <h1 className="text-3xl font-black text-white tracking-tight">Inbox</h1>
                            <button
                                onClick={() => setView('settings')}
                                className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center transition-all active:scale-95 hover:bg-white/20 border border-white/10"
                            >
                                <Settings size={20} className="text-white" />
                            </button>
                        </div>

                        {/* Search Bar */}
                        <div className="bg-white/95 backdrop-blur-sm rounded-2xl flex items-center px-4 py-3.5 shadow-sm mb-5 transition-transform focus-within:scale-[1.01]">
                            <Search size={18} className="text-gray-400 mr-3" />
                            <input
                                type="text"
                                placeholder="Search inbox..."
                                className="w-full text-sm font-medium text-gray-900 outline-none placeholder-gray-400 bg-transparent"
                            />
                        </div>

                        {/* Filter Chips */}
                        <div className="flex space-x-2 overflow-x-auto pb-1 no-scrollbar mask-gradient-right">
                            {['All', 'Unread', 'Contacts', 'Archived'].map((filter, i) => (
                                <button
                                    key={filter}
                                    className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap shadow-sm active:scale-95 ${i === 0 ? 'bg-white text-gray-900' : 'bg-white/10 text-white backdrop-blur-sm border border-white/10 hover:bg-white/20'}`}
                                >
                                    {filter}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* List Content */}
                    <div className="flex-1 overflow-y-auto pt-4 px-4 pb-24 -mt-2 space-y-3">
                        {calls.map(call => (
                            <div
                                key={call.id}
                                onClick={() => openCallDetail(call)}
                                className="bg-white rounded-[1.5rem] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] active:scale-[0.98] transition-all cursor-pointer border border-transparent hover:border-blue-100"
                            >
                                <div className="flex space-x-4">
                                    {/* Avatar */}
                                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-sm shrink-0 uppercase tracking-wider">
                                        {call.name.substring(0, 2)}
                                    </div>
                                    <div className="flex-1 min-w-0 pt-0.5">
                                        <div className="flex justify-between items-baseline mb-0.5">
                                            <h3 className="font-bold text-gray-900 truncate pr-2">{call.name}</h3>
                                            <span className="text-[10px] font-semibold text-gray-400 whitespace-nowrap">{call.time}</span>
                                        </div>
                                        <p className="text-gray-400 text-xs truncate leading-relaxed">
                                            {call.number}
                                        </p>
                                    </div>
                                    {call.status === 'unread' && (
                                        <div className="w-2.5 h-2.5 bg-blue-400 rounded-full mt-2 shrink-0 shadow-sm shadow-blue-300"></div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* =========================================
               RECEPTIONIST VIEW
               ========================================= */}
            {view === 'receptionist' && (
                <div className="flex flex-col h-full bg-white overflow-y-auto no-scrollbar animate-in fade-in duration-500">
                    {/* Header Container */}
                    <div className={`${headerGradient} pt-12 rounded-b-[3rem] shadow-xl shrink-0 z-20 relative overflow-hidden`}>

                        {/* Decorative background elements */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                        {/* Top Protocol Bar */}
                        <div className="flex justify-between items-center px-6 mb-6 relative z-10 w-full">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className="w-12 h-12 bg-white rounded-full p-0.5 shadow-lg">
                                        <img
                                            src="https://api.dicebear.com/7.x/avataaars/svg?seed=Andrew&backgroundColor=b6e3f4"
                                            alt="Andrew"
                                            className="w-full h-full rounded-full bg-blue-50"
                                        />
                                    </div>
                                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-400 border-2 border-blue-900 rounded-full"></span>
                                </div>
                                <div>
                                    <h1 className="text-2xl font-black text-white tracking-tight">{personality.name}</h1>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setIsEditingReceptionist(true)}
                                    className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md flex items-center justify-center transition-all active:scale-95 border border-white/10 shadow-sm"
                                >
                                    <Edit2 size={16} className="text-white" />
                                </button>
                                <button
                                    onClick={() => setView('settings')}
                                    className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md flex items-center justify-center transition-all active:scale-95 border border-white/10 shadow-sm"
                                >
                                    <Settings size={18} className="text-white" />
                                </button>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex items-end px-4 gap-1 relative z-10 translate-y-[1px]">
                            {['Instructions', 'Knowledge', 'Phone'].map((tab) => {
                                const isActive = activeReceptionistTab === tab.toLowerCase();
                                return (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveReceptionistTab(tab.toLowerCase())}
                                        className={`flex-1 py-3.5 text-sm font-bold rounded-t-2xl transition-all duration-300 relative ${isActive
                                            ? 'bg-white text-gray-900 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-20 translate-y-0'
                                            : 'bg-transparent text-white/70 hover:text-white hover:bg-white/5 z-0'
                                            }`}
                                    >
                                        {tab}
                                        {isActive && (
                                            <>
                                                <div className="absolute bottom-0 -left-4 w-4 h-4 bg-transparent shadow-[4px_4px_0_white] rounded-br-xl pointer-events-none"></div>
                                                <div className="absolute bottom-0 -right-4 w-4 h-4 bg-transparent shadow-[-4px_4px_0_white] rounded-bl-xl pointer-events-none"></div>
                                            </>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>


                    {/* --- Tab Content --- */}
                    <div className="w-full flex-auto bg-white relative z-10 px-6 pt-8 pb-32 min-h-[60vh]">
                        {activeReceptionistTab === 'instructions' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

                                {/* Greeting Message */}
                                <section>
                                    <h3 className="text-base font-bold text-gray-900 mb-1">Greeting Message</h3>
                                    <p className="text-xs text-gray-500 mb-4">The first message your receptionist says upon accepting a call</p>

                                    <div className="border border-gray-100 rounded-xl p-4 shadow-sm bg-white">
                                        <textarea
                                            value={greeting}
                                            onChange={(e) => setGreeting(e.target.value)}
                                            className="w-full text-base text-gray-800 outline-none resize-none bg-transparent font-medium leading-relaxed placeholder-gray-400"
                                            rows={3}
                                        />
                                    </div>
                                </section>

                                {/* Ending Message */}
                                <section>
                                    <h3 className="text-base font-bold text-gray-900 mb-1">Ending Message</h3>
                                    <p className="text-xs text-gray-500 mb-4">The last message your receptionist says when hanging up a call</p>
                                    <div className="border border-gray-100 rounded-xl p-4 shadow-sm bg-white">
                                        <p className="text-sm font-medium text-gray-900">Thank you for calling {userInfo.company} . Have a great day!</p>
                                    </div>
                                </section>

                                {/* Schedule Appointment */}
                                <section>
                                    <h3 className="text-base font-bold text-gray-900 mb-1">Schedule Appointment</h3>
                                    <p className="text-xs text-gray-500 mb-4">Let your receptionist schedule appointments for you based on your calendar</p>

                                    <div className="space-y-3">
                                        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex justify-between items-start cursor-pointer hover:bg-gray-50 transition-colors">
                                            <div>
                                                <h4 className="font-bold text-gray-900 text-sm mb-1">{userInfo.company} Appointment</h4>
                                                <div className="flex items-center text-xs text-gray-500 space-x-2">
                                                    <span>30 min</span>
                                                    <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                                    <span>In Person</span>
                                                </div>
                                            </div>
                                            <div className="text-gray-300">
                                                <ChevronRight size={20} />
                                            </div>
                                        </div>

                                        <button className="w-full bg-white border border-gray-200 text-gray-900 py-3.5 rounded-xl font-bold hover:bg-gray-50 active:scale-[0.98] transition-all flex items-center justify-center shadow-sm text-sm tracking-wide">
                                            <Plus size={18} className="mr-2" />
                                            Add Appointment
                                        </button>
                                    </div>
                                </section>

                                {/* Instructions */}
                                <section>
                                    <h3 className="text-base font-bold text-gray-900 mb-1">Instructions</h3>
                                    <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                                        Any specific instructions for how your receptionist should handle calls?
                                    </p>
                                    <textarea
                                        value={userInfo.instructions}
                                        onChange={(e) => setUserInfo({ ...userInfo, instructions: e.target.value })}
                                        rows={3}
                                        className="w-full bg-white border border-gray-200 rounded-xl p-4 text-base font-medium text-gray-900 shadow-sm focus:ring-2 focus:ring-blue-400/20 outline-none resize-none transition-all leading-relaxed placeholder-gray-400"
                                        placeholder="e.g. Always be polite, never promise refunds..."
                                    />
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
                                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-base font-bold text-gray-900 shadow-sm focus:ring-2 focus:ring-blue-400/20 outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Industry</label>
                                        <input
                                            type="text"
                                            value={userInfo.businessType}
                                            onChange={(e) => setUserInfo({ ...userInfo, businessType: e.target.value })}
                                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-base font-medium text-gray-900 shadow-sm focus:ring-2 focus:ring-blue-400/20 outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Support Email</label>
                                        <input
                                            type="text"
                                            value={userInfo.email}
                                            onChange={(e) => setUserInfo({ ...userInfo, email: e.target.value })}
                                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-base font-medium text-gray-900 shadow-sm focus:ring-2 focus:ring-blue-400/20 outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Address</label>
                                        <input
                                            type="text"
                                            value={userInfo.address}
                                            onChange={(e) => setUserInfo({ ...userInfo, address: e.target.value })}
                                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-base font-medium text-gray-900 shadow-sm focus:ring-2 focus:ring-blue-400/20 outline-none transition-all"
                                        />
                                    </div>

                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Website</label>
                                            <div className="flex items-center space-x-2">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Train from Website</span>
                                                <button
                                                    onClick={() => setUserInfo({ ...userInfo, websiteTraining: !userInfo.websiteTraining })}
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
                                                    onClick={() => setUserInfo({ ...userInfo, useEmergencyNumber: !userInfo.useEmergencyNumber })}
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
                                            {knowledgeQuestions.map((q) => (
                                                <div key={q.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors group relative">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <h4 className="font-bold text-gray-900 text-sm">{q.question}</h4>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setKnowledgeQuestions(prev => prev.filter(item => item.id !== q.id));
                                                            }}
                                                            className="text-gray-300 hover:text-red-500 transition-colors pointer-events-auto"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                    <p className="text-xs text-gray-400">{q.answer}</p>
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

                                    {/* Other Important Info */}
                                    <section>
                                        <h3 className="text-base font-bold text-gray-900 mb-1">Other Business Details</h3>
                                        <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                                            Share things like weekly specials, happy hours, or parking info so your receptionist can be helpful.
                                        </p>
                                        <textarea
                                            rows={3}
                                            className="w-full bg-white border border-gray-200 rounded-xl p-4 text-base font-medium text-gray-900 shadow-sm focus:ring-2 focus:ring-blue-400/20 outline-none resize-none transition-all leading-relaxed placeholder-gray-400"
                                            placeholder="e.g. Always promote our happy hour (3-4 PM) and mention that we offer house calls..."
                                        />
                                    </section>

                                    <div className="h-48"></div>
                                </div>
                            </div>
                        )}

                        {activeReceptionistTab === 'phone' && (
                            <div className="pb-32">
                                {!isForwardingSetupOpen ? (
                                    <div className="space-y-8 animate-in fade-in duration-300">

                                        {/* Receptionist Active Toggle */}
                                        <section className={`border rounded-2xl p-4 flex items-center justify-between transition-colors ${isReceptionistActive ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100'}`}>
                                            <div>
                                                <h3 className="text-base font-bold text-gray-900">Receptionist Active</h3>
                                                <p className={`text-xs font-medium ${isReceptionistActive ? 'text-blue-600' : 'text-gray-500'}`}>
                                                    {isReceptionistActive ? "Answering calls" : "Paused"}
                                                </p>
                                            </div>
                                            <div
                                                onClick={() => setIsReceptionistActive(!isReceptionistActive)}
                                                className={`w-12 h-7 rounded-full relative cursor-pointer transition-colors duration-300 ${isReceptionistActive ? 'bg-blue-500' : 'bg-gray-300'}`}
                                            >
                                                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${isReceptionistActive ? 'left-6' : 'left-1'}`}></div>
                                            </div>
                                        </section>

                                        {/* Number Display */}
                                        <section>
                                            <h3 className="text-base font-bold text-gray-900 mb-1">{personality.name}'s Number</h3>
                                            <p className="text-xs text-gray-500 mb-3">This is your receptionist phone number</p>
                                            <div className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-4 text-sm font-bold flex items-center justify-center space-x-3 shadow-sm text-gray-900">
                                                <Phone size={18} className="fill-current" />
                                                <span className="text-base">(513) 327-7680</span>
                                            </div>
                                        </section>

                                        {/* Forwarding */}
                                        <section>
                                            <h3 className="text-base font-bold text-gray-900 mb-1">Forward to {personality.name}</h3>
                                            <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                                                Forward your missed calls instead of voicemail. <br />
                                                Looking to <button onClick={() => { setForwardingMode('disable'); setIsForwardingSetupOpen(true); }} className="underline decoration-1 cursor-pointer font-bold text-gray-900 hover:text-blue-500">Disable</button>?
                                            </p>
                                            <button
                                                onClick={() => {
                                                    setForwardingMode('enable');
                                                    setActivationStep(1);
                                                    setIsForwardingSetupOpen(true);
                                                }}
                                                className="w-full bg-white border border-gray-200 text-gray-900 py-4 rounded-2xl font-bold hover:bg-gray-50 active:scale-[0.98] transition-all flex items-center justify-center shadow-sm text-sm tracking-wide"
                                            >
                                                Instructions
                                            </button>
                                        </section>

                                        {/* Voicemail Toggle */}
                                        <section>
                                            <div className="flex justify-between items-center mb-1">
                                                <h3 className="text-base font-bold text-gray-900">Voicemail for Contacts</h3>
                                                {/* Toggle Switch */}
                                                <div className="w-11 h-6 bg-gray-200 rounded-full relative cursor-pointer transition-colors duration-200 hover:bg-gray-300">
                                                    <div className="absolute left-[2px] top-[2px] w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200"></div>
                                                </div>
                                            </div>
                                            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                                                Allow selected contacts to leave an in-app voicemail instead of talking to the receptionist
                                            </p>
                                            <div className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-4 text-sm text-gray-400 flex justify-between items-center shadow-sm font-medium">
                                                <span>Select contacts</span>
                                                <span>0</span>
                                            </div>
                                        </section>

                                        {/* Connect/Disconnect Actions */}
                                        <section className="space-y-3 pt-4">
                                            <button
                                                onClick={() => {
                                                    setForwardingMode('enable');
                                                    setActivationStep(1);
                                                    setIsForwardingSetupOpen(true);
                                                }}
                                                className="w-full bg-white border border-gray-200 text-gray-900 px-4 py-4 rounded-2xl font-bold flex items-center justify-between shadow-sm text-sm hover:bg-gray-50 active:scale-[0.98] transition-all"
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                                                        <ArrowUpRight size={16} />
                                                    </div>
                                                    <span>Connect Personal Number</span>
                                                </div>
                                                <ChevronRight size={18} className="text-gray-300" />
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setForwardingMode('disable');
                                                    setIsForwardingSetupOpen(true);
                                                }}
                                                className="w-full bg-white border border-gray-200 text-gray-900 px-4 py-4 rounded-2xl font-bold flex items-center justify-between shadow-sm text-sm hover:bg-gray-50 active:scale-[0.98] transition-all"
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                                                        <XCircle size={16} />
                                                    </div>
                                                    <span>Disconnect Personal Number</span>
                                                </div>
                                                <ChevronRight size={18} className="text-gray-300" />
                                            </button>
                                        </section>

                                        {/* Spacer */}
                                        <div className="h-24"></div>
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
                                                <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center justify-between shadow-sm mb-6">
                                                    <div className="flex items-center space-x-3 text-gray-900 font-bold">
                                                        <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center text-[10px] text-gray-500">{selectedCarrier[0]}</div>
                                                        <span>{selectedCarrier}</span>
                                                    </div>
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
                    <div className="absolute inset-0 z-[60] bg-[#F2F4F8] flex flex-col h-full animate-in slide-in-from-right duration-300">
                        {/* Header */}
                        <div className="bg-white px-6 pt-12 pb-4 flex justify-between items-center shadow-sm z-20">
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

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                                <div className="mt-6 pt-6 border-t border-gray-100">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Recording</h4>
                                    <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
                                        <button className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center text-gray-900 hover:scale-105 active:scale-95 transition-all">
                                            <Play size={18} className="ml-1 fill-current" />
                                        </button>
                                        <div className="flex-1 h-8 flex items-center gap-1">
                                            {/* Mock Waveform */}
                                            {Array.from({ length: 24 }).map((_, i) => (
                                                <div key={i} className={`w-1 rounded-full bg-blue-200 ${i % 3 === 0 ? 'h-6 bg-blue-300' : 'h-3'}`} style={{ height: `${Math.max(20, Math.random() * 100)}%` }}></div>
                                            ))}
                                        </div>
                                        <span className="text-xs font-bold text-gray-500 tabular-nums">0:42</span>
                                    </div>
                                </div>
                            </div>

                            {selectedCall.transcript && (
                                <div className="bg-white rounded-[2rem] p-6 shadow-sm">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Transcript</h3>
                                    <div className="space-y-4">
                                        {selectedCall.transcript.map((msg, idx) => (
                                            <div key={idx} className={`flex ${msg.role === 'receptionist' ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[85%] p-4 rounded-2xl text-sm font-medium leading-relaxed ${msg.role === 'receptionist'
                                                    ? 'bg-blue-500 text-white rounded-tr-none'
                                                    : 'bg-gray-100 text-gray-800 rounded-tl-none'
                                                    }`}>
                                                    {msg.text}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )
            }

            {/* =========================================
               SETTINGS VIEW
               ========================================= */}
            {
                view === 'settings' && (
                    <div className="flex flex-col h-full bg-white relative animate-in slide-in-from-right duration-300">
                        {/* Header */}
                        <div className="px-6 pt-12 pb-4 flex justify-between items-center z-20">
                            <button
                                onClick={() => setView('inbox')}
                                className="w-10 h-10 -ml-2 rounded-full items-center justify-center flex hover:bg-gray-50 transition-colors text-gray-900"
                            >
                                <ChevronLeft size={28} />
                            </button>
                            <h1 className="text-lg font-bold text-gray-900">Settings</h1>
                            <div className="w-10" /> {/* Spacer */}
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 pb-24">
                            <div className="mt-2"></div>

                            {/* General Section */}
                            <div className="mb-8">
                                <h3 className="text-Gray-500 font-medium mb-4 text-sm text-gray-500">General</h3>
                                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                                    {[
                                        { icon: CreditCard, label: 'Manage Plan', action: () => setView('manage-plan') },
                                        { icon: User, label: 'Account', action: () => setView('account') },
                                        { icon: UserPlus, label: 'Invite Friend' },
                                        { icon: Star, label: 'Rate App' },
                                        { icon: Clock, label: 'Time Zone', value: 'EST' },
                                        {
                                            icon: LogOut,
                                            label: 'Sign Out',
                                            action: async () => {
                                                await supabase.auth.signOut();
                                                setView('auth');
                                            }
                                        },
                                    ].map((item, i, arr) => (
                                        <div
                                            key={item.label}
                                            onClick={item.action || (() => showToast(`${item.label} clicked`))}
                                            className={`flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors ${i !== arr.length - 1 ? 'border-b border-gray-100' : ''}`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                                                    <item.icon size={20} className="stroke-[2.5]" />
                                                </div>
                                                <span className="font-bold text-gray-900">{item.label}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {item.value && <span className="text-gray-400 font-medium text-sm">{item.value}</span>}
                                                <ChevronRight size={20} className="text-gray-300" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Contact Us */}
                            <div className="mb-12">
                                <button
                                    onClick={() => showToast("Contact Us clicked")}
                                    className="w-full bg-white rounded-3xl border border-gray-200 p-4 flex items-center justify-center font-bold text-gray-900 shadow-sm hover:bg-gray-50 active:scale-[0.98] transition-all gap-2"
                                >
                                    <LifeBuoy size={20} />
                                    <span>Contact Us</span>
                                </button>
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
                    <div className="absolute inset-0 z-50 bg-[#F2F4F8] flex flex-col h-full animate-in slide-in-from-right duration-300">
                        {/* Header */}
                        <div className="bg-white px-6 pt-12 pb-4 flex items-center shadow-sm z-20">
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
                    <div className="absolute inset-0 z-50 bg-[#F2F4F8] flex flex-col h-full animate-in slide-in-from-right duration-300">
                        {/* Header */}
                        <div className="bg-white px-6 pt-12 pb-4 flex items-center shadow-sm z-20">
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
                                        src="https://api.dicebear.com/7.x/avataaars/svg?seed=Andrew&backgroundColor=b6e3f4"
                                        alt="Andrew"
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
                                        value={personality.name}
                                        onChange={(e) => setPersonality({ ...personality, name: e.target.value })}
                                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-4 text-base font-medium text-gray-900 outline-none focus:ring-2 focus:ring-blue-400/20 active:scale-[0.99] transition-all"
                                    />
                                </div>

                                {/* Voice Selection */}
                                <div>
                                    <label className="block text-base font-bold text-gray-900 mb-2">Voice</label>
                                    <button className="w-full bg-white border border-gray-200 rounded-xl px-4 py-4 flex items-center justify-center gap-3 text-base font-bold text-gray-900 hover:bg-gray-50 active:scale-[0.99] transition-all">
                                        <AudioWaveform size={20} className="text-gray-400" />
                                        Select Voice
                                    </button>
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
            {
                view !== 'call-detail' && (
                    view !== 'auth' && (
                        <div className="absolute bottom-0 left-0 w-full bg-white border-t border-gray-100 flex justify-around items-end pb-8 pt-2 px-2 z-50 rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.03)] h-[6.5rem]">

                            {/* Inbox Tab */}
                            {/* Inbox Tab */}
                            <button
                                onClick={() => setView('inbox')}
                                className={`group flex flex-col items-center justify-center w-24 gap-1 p-2 transition-all duration-300 ${view === 'inbox' || view === 'call-detail' ? 'text-blue-600' : 'text-gray-300 hover:text-gray-400'}`}
                            >
                                <div className={`p-3 rounded-[18px] transition-all duration-300 ${view === 'inbox' || view === 'call-detail' ? 'bg-blue-50 text-blue-600 shadow-sm shadow-blue-100' : 'bg-transparent'}`}>
                                    <div className="w-6 h-6 border-[2.5px] border-current rounded-[7px] relative flex items-center justify-center">
                                        <div className="w-2.5 h-[2.5px] bg-current rounded-full"></div>
                                    </div>
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-widest">Inbox</span>
                            </button>

                            {/* Receptionist Tab */}
                            <button
                                onClick={() => setView('receptionist')}
                                className={`group flex flex-col items-center justify-center w-24 gap-1 p-2 transition-all duration-300 ${view === 'receptionist' ? 'text-blue-600' : 'text-gray-300 hover:text-gray-400'}`}
                            >
                                <div className={`p-3 rounded-[18px] transition-all duration-300 ${view === 'receptionist' ? 'bg-blue-50 text-blue-600 shadow-sm shadow-blue-100' : 'bg-transparent'}`}>
                                    <User size={24} strokeWidth={2.5} />
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-widest">Receptionist</span>
                            </button>

                        </div>
                    )
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
                                        onClick={() => {
                                            if (tempQuestion.q && tempQuestion.a) {
                                                setKnowledgeQuestions(prev => [...prev, { id: Date.now(), question: tempQuestion.q, answer: tempQuestion.a }]);
                                                setTempQuestion({ q: "", a: "" });
                                                setActiveModal(null);
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

        </div >
    );
}
