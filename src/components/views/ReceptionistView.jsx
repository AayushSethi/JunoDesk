import React, { useState } from 'react';
import {
    AudioWaveform, Globe, MessageCircle, FileText, Calendar,
    Plus, X, RefreshCw, ChevronDown, Check, Phone,
    Copy, ArrowUpRight, ArrowRight, ChevronLeft, ChevronRight, Settings, Info, PhoneCall, HelpCircle, XCircle
} from 'lucide-react';

import AddQuestionModal from '../modals/AddQuestionModal';
import LanguageModal from '../modals/LanguageModal';

export default function ReceptionistView({
    activeReceptionistTab,
    setActiveReceptionistTab,
    personality,
    setPersonality,
    voiceOptions,
    playingVoiceId,
    setPlayingVoiceId,
    greeting,
    setGreeting,
    knowledgeItems,
    setKnowledgeItems,
    newInstruction,
    setNewInstruction,
    userInfo,
    setUserInfo,
    isScraping,
    setIsScraping,
    newFact,
    setNewFact,
    isForwardingSetupOpen,
    setIsForwardingSetupOpen,
    forwardingMode,
    setForwardingMode,
    activationStep,
    setActivationStep,
    selectedCarrier,
    setSelectedCarrier,
    isReceptionistActive,
    setIsReceptionistActive,
    carriers,
    currentCarrierConfig,
    showToast,
    syncAssistant,
    saveProfileField,
    handleProvision,
    session,
    supabase,
    languages,
    LANGUAGES,

    setLanguages,
    provisioning
}) {
    // Local State for Modals
    const [activeModal, setActiveModal] = useState(null); // 'add-question' etc
    const [showLanguageModal, setShowLanguageModal] = useState(false);
    const [tempQuestion, setTempQuestion] = useState({ q: "", a: "" });

    return (
        <>
        <div className="flex flex-col h-full bg-transparent overflow-y-auto no-scrollbar animate-in fade-in duration-500">
            {/* --- Header Section (Centered Branding) --- */}
            <header className="px-6 flex flex-col space-y-4 shrink-0 pt-10 pb-0">
                <div className="flex justify-center items-center z-20">
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


                {/* --- Navigation Tabs (Underline Style) --- */}
                <nav className="flex space-x-6 justify-center">
                    {['Instructions', 'Knowledge', 'Phone'].map(tab => {
                        const isActive = activeReceptionistTab === tab.toLowerCase();
                        return (
                            <button
                                key={tab}
                                onClick={() => setActiveReceptionistTab(tab.toLowerCase())}
                                className={`pb-3 relative text-sm font-bold transition-all ${isActive ? 'text-[#0047AB]' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {tab}
                                {isActive && (
                                    <span className="absolute bottom-0 left-0 w-full h-[3px] bg-[#0047AB] rounded-t-full animate-in slide-in-from-bottom-1"></span>
                                )}
                            </button>
                        );
                    })}
                </nav>
                <div className="h-[1px] bg-slate-100 -mx-6"></div>
            </header>


            {/* --- Tab Content --- */}
            <>
            <div className="w-full flex-auto bg-transparent relative z-10 px-6 pt-0 pb-32 min-h-[60vh]">
                {activeReceptionistTab === 'instructions' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">


                        {/* Greeting Message Card */}
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 shadow-sm">
                            <h3 className="text-sm font-bold text-gray-900 mb-3">Greeting Message</h3>
                            <p className="text-xs text-gray-500 mb-3">First message your receptionist says</p>
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
                                className="w-full text-sm font-medium text-gray-900 outline-none bg-white border border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 transition-colors resize-none leading-relaxed placeholder-gray-400"
                                placeholder="Hello, thank you for calling. How may I help you?"
                                rows={2}
                            />
                        </div>



                        {/* Instructions Card */}
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 shadow-sm">
                            <h3 className="text-sm font-bold text-gray-900 mb-3">Instructions</h3>
                            <p className="text-xs text-gray-500 mb-3">How your receptionist should handle calls</p>
                            <div className="space-y-2">
                                {knowledgeItems.filter(i => i.type === 'instruction' && !i.content.text.startsWith('WEBSITE KNOWLEDGE') && i.content.source !== 'website_scrape').map((item) => {
                                    return (
                                        <div key={item.id} className="bg-white border border-gray-100 rounded-lg p-3 flex justify-between items-center group hover:border-gray-200 transition-colors">
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
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newInstruction}
                                        onChange={(e) => setNewInstruction(e.target.value)}
                                        placeholder="Add instruction..."
                                        className="h-10 flex-1 text-sm font-medium text-gray-900 outline-none bg-white border border-gray-200 rounded-lg px-3 focus:border-blue-500 transition-colors placeholder-gray-400"
                                        onKeyDown={async (e) => {
                                            if (e.key === 'Enter' && newInstruction.trim()) {
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
                                        className="h-10 w-10 bg-blue-600 text-white rounded-lg flex items-center justify-center hover:bg-blue-700 active:scale-95 transition-all"
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>


                        {/* Voice & Languages Card */}
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 shadow-sm">
                            <div className="space-y-4">
                                {/* Voice Section */}
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 mb-3">Voice & Languages</h3>
                                    <div className="grid grid-cols-3 gap-2">
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
                                                    <div className={`w-12 h-12 rounded-full overflow-hidden relative transition-all ${isSelected ? 'ring-4 ring-blue-500 ring-offset-2 ring-offset-white shadow-[0_0_20px_rgba(37,99,235,0.5)]' : 'ring-2 ring-gray-200'}`}>
                                                        <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                                                        {isPlaying && (
                                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                                <AudioWaveform size={16} className="text-white animate-pulse" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className={`text-xs font-bold mt-2 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`}>{p.name}</span>
                                                </button>
                                            )
                                        }) : (
                                            <div className="col-span-3 text-center py-4 text-gray-400 text-xs font-medium">
                                                Loading voices...
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Languages Section */}
                                <div>
                                    <div
                                        onClick={() => setShowLanguageModal(true)}
                                        className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                                <Globe size={16} />
                                            </div>
                                            <div className="flex flex-col">
                                                <h3 className="text-sm font-bold text-gray-900 leading-tight">Languages</h3>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <div className="flex -space-x-1 overflow-hidden">
                                                        {languages.slice(0, 3).map(lang => (
                                                            <div key={lang} className="w-3 h-3 rounded-full bg-gray-50 border border-white flex items-center justify-center text-[8px] z-10" title={lang}>
                                                                {LANGUAGES.find(l => l.name === lang)?.flag || '🌐'}
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <span className="text-xs font-medium text-gray-500 truncate">
                                                        {languages.length > 0 ? languages.join(', ') : "English (Default)"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <ChevronRight size={16} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                                    </div>
                                </div>
                            </div>
                        </div>


                        {/* Google Calendar Connect */}
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 shadow-sm">
                            <h3 className="text-sm font-bold text-gray-900 mb-3">Calendar Integration</h3>
                            <p className="text-xs text-gray-500 mb-3">Connect Google Calendar for availability and bookings</p>

                            {userInfo.google_access_token ? (
                                <div className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <svg viewBox="0 0 200 200" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                                            <path fill="#FFFFFF" d="M148.882,43.618l-47.368-5.263l-57.895,5.263L38.355,96.25l5.263,52.632l52.632,6.579l52.632-6.579l5.263-53.947L148.882,43.618z"/>
                                            <path fill="#1A73E8" d="M65.211,125.276c-3.934-2.658-6.658-6.539-8.145-11.671l9.132-3.763c0.829,3.158,2.276,5.605,4.342,7.342c2.053,1.737,4.553,2.592,7.474,2.592c2.987,0,5.553-0.908,7.697-2.724s3.224-4.132,3.224-6.934c0-2.868-1.132-5.211-3.395-7.026s-5.105-2.724-8.5-2.724h-5.276v-9.039H76.5c2.921,0,5.382-0.789,7.382-2.368c2-1.579,3-3.737,3-6.487c0-2.447-0.895-4.395-2.684-5.855s-4.053-2.197-6.803-2.197c-2.684,0-4.816,0.711-6.395,2.145s-2.724,3.197-3.447,5.276l-9.039-3.763c1.197-3.395,3.395-6.395,6.618-8.987c3.224-2.592,7.342-3.895,12.342-3.895c3.697,0,7.026,0.711,9.974,2.145c2.947,1.434,5.263,3.421,6.934,5.947c1.671,2.539,2.5,5.382,2.5,8.539c0,3.224-0.776,5.947-2.329,8.184c-1.553,2.237-3.461,3.947-5.724,5.145v0.539c2.987,1.25,5.421,3.158,7.342,5.724c1.908,2.566,2.868,5.632,2.868,9.211s-0.908,6.776-2.724,9.579c-1.816,2.803-4.329,5.013-7.513,6.618c-3.197,1.605-6.789,2.421-10.776,2.421C73.408,129.263,69.145,127.934,65.211,125.276z"/>
                                            <path fill="#1A73E8" d="M121.25,79.961l-9.974,7.25l-5.013-7.605l17.987-12.974h6.895v61.197h-9.895L121.25,79.961z"/>
                                            <path fill="#EA4335" d="M148.882,196.25l47.368-47.368l-23.684-10.526l-23.684,10.526l-10.526,23.684L148.882,196.25z"/>
                                            <path fill="#34A853" d="M33.092,172.566l10.526,23.684h105.263v-47.368H43.618L33.092,172.566z"/>
                                            <path fill="#4285F4" d="M12.039-3.75C3.316-3.75-3.75,3.316-3.75,12.039v136.842l23.684,10.526l23.684-10.526V43.618h105.263l10.526-23.684L148.882-3.75H12.039z"/>
                                            <path fill="#188038" d="M-3.75,148.882v31.579c0,8.724,7.066,15.789,15.789,15.789h31.579v-47.368H-3.75z"/>
                                            <path fill="#FBBC04" d="M148.882,43.618v105.263h47.368V43.618l-23.684-10.526L148.882,43.618z"/>
                                            <path fill="#1967D2" d="M196.25,43.618V12.039c0-8.724-7.066-15.789-15.789-15.789h-31.579v47.368H196.25z"/>
                                        </svg>
                                        <div className="flex flex-col">
                                            <h4 className="text-sm font-bold text-gray-900">Google Calendar</h4>
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                                                <span className="text-xs text-gray-500">Online</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            await supabase.from('business_profiles').update({ google_access_token: null, google_refresh_token: null }).eq('owner_user_id', session.user.id);
                                            setUserInfo({ ...userInfo, google_access_token: null });
                                            showToast("Calendar disconnected");
                                        }}
                                        className="text-xs text-red-500 hover:text-red-700 font-bold"
                                    >
                                        Disconnect
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={async () => {
                                        showToast("Redirecting to Google Sign In...");
                                        try {
                                            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/google-url`, {
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
                                    className="w-full bg-white border border-gray-200 text-gray-900 py-3 rounded-lg font-medium hover:bg-gray-50 active:scale-[0.98] transition-all flex items-center justify-center text-sm gap-2"
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
                        </div>

                        {/* Spacer */}
                        <div className="h-48"></div>
                    </div>
                )}

                {activeReceptionistTab === 'knowledge' && (
                    <div className="space-y-6 animate-in fade-in duration-300 relative pb-32">
                            {/* Basic Info Card */}
                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 shadow-sm">
                                <h3 className="text-sm font-bold text-gray-900 mb-4">Basic Information</h3>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Business Name</label>
                                        <input
                                            type="text"
                                            value={userInfo.company}
                                            onChange={(e) => setUserInfo({ ...userInfo, company: e.target.value })}
                                            onBlur={(e) => saveProfileField('company_name', e.target.value)}
                                            className="h-10 w-full text-sm font-medium text-gray-900 outline-none bg-white border border-gray-200 rounded-lg px-3 focus:border-blue-500 transition-colors placeholder-gray-400"
                                            placeholder="e.g. Sunrise Café"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Industry</label>
                                        <input
                                            type="text"
                                            value={userInfo.businessType}
                                            onChange={(e) => setUserInfo({ ...userInfo, businessType: e.target.value })}
                                            onBlur={(e) => saveProfileField('industry', e.target.value)}
                                            className="h-10 w-full text-sm font-medium text-gray-900 outline-none bg-white border border-gray-200 rounded-lg px-3 focus:border-blue-500 transition-colors placeholder-gray-400"
                                            placeholder="e.g. Restaurant, Consulting"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Support Email</label>
                                        <input
                                            type="text"
                                            value={userInfo.email}
                                            onChange={(e) => setUserInfo({ ...userInfo, email: e.target.value })}
                                            onBlur={(e) => saveProfileField('support_email', e.target.value)}
                                            className="h-10 w-full text-sm font-medium text-gray-900 outline-none bg-white border border-gray-200 rounded-lg px-3 focus:border-blue-500 transition-colors placeholder-gray-400"
                                            placeholder="e.g. contact@business.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
                                        <input
                                            type="text"
                                            value={userInfo.address}
                                            onChange={(e) => setUserInfo({ ...userInfo, address: e.target.value })}
                                            onBlur={(e) => saveProfileField('address', e.target.value)}
                                            className="h-10 w-full text-sm font-medium text-gray-900 outline-none bg-white border border-gray-200 rounded-lg px-3 focus:border-blue-500 transition-colors placeholder-gray-400"
                                            placeholder="e.g. 123 Main St, City, State"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Website Card */}
                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 shadow-sm">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="text-sm font-bold text-gray-900">Website Training</h3>
                                </div>
                                <p className="text-xs text-gray-500 mb-3">We will scan this site to answer questions</p>
                                <div className="w-full flex items-center gap-2 mb-4">
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
                                        className="h-10 flex-1 text-sm font-medium text-gray-900 outline-none bg-white border border-gray-200 rounded-lg px-3 focus:border-blue-500 transition-colors placeholder-gray-400"
                                    />
                                    <button
                                        disabled={!userInfo.website || isScraping}
                                        onClick={async () => {
                                            if (!userInfo.website) return;
                                            setIsScraping(true);
                                            try {
                                                setIsScraping(true);
                                                const res = await fetch('/api/scrape-website', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({
                                                        url: userInfo.website,
                                                        userId: session.user.id
                                                    })
                                                });
                                                const data = await res.json();

                                                if (data.success) {
                                                    showToast("Website trained successfully!");
                                                    const { data: info } = await supabase
                                                        .from('business_info')
                                                        .select('*')
                                                        .eq('owner_user_id', session.user.id);
                                                    if (info) {
                                                        setKnowledgeItems(info.filter(i => ['qa', 'fact', 'instruction', 'common_words', 'website_content'].includes(i.type)));
                                                    }
                                                    syncAssistant();
                                                } else {
                                                    showToast("Scraping failed: " + data.error);
                                                }
                                            } catch (err) {
                                                console.error("Scrape error:", err);
                                                showToast("Scraping failed");
                                            } finally {
                                                setIsScraping(false);
                                            }
                                        }}
                                        className={`h-10 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${!userInfo.website ? 'bg-gray-100 text-gray-400 cursor-not-allowed' :
                                            isScraping ? 'bg-blue-100 text-blue-500 cursor-wait' : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
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

                                {/* Synced Website Content */}
                                <div className="space-y-2">
                                    {knowledgeItems.filter(i => i.type === 'instruction' && (i.content.text.startsWith('WEBSITE KNOWLEDGE') || i.content.source === 'website_scrape')).map((item) => {
                                        const titleMatch = item.content.text.match(/WEBSITE KNOWLEDGE \((.*?)\):/);
                                        const title = titleMatch ? titleMatch[1] : (item.content.url ? new URL(item.content.url).hostname : "Website Content");

                                        return (
                                            <div key={item.id} className="border border-gray-200 rounded-lg group overflow-hidden transition-all hover:border-blue-500">
                                                <details className="group/details">
                                                    <summary className="p-3 flex justify-between items-center cursor-pointer list-none hover:bg-gray-50 transition-colors">
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
                                                    <div className="px-3 pb-3 pt-0">
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
                            </div>

                            {/* Service Description Card */}
                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 shadow-sm">
                                <h3 className="text-sm font-bold text-gray-900 mb-3">Service Description</h3>
                                <p className="text-xs text-gray-500 mb-3">Describe what your company does in detail</p>
                                <textarea
                                    value={userInfo.businessDetails}
                                    onChange={(e) => setUserInfo({ ...userInfo, businessDetails: e.target.value })}
                                    onBlur={(e) => saveProfileField('business_description', e.target.value)}
                                    rows={4}
                                    className="w-full text-sm font-medium text-gray-900 outline-none bg-white border border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 transition-colors resize-none leading-relaxed placeholder-gray-400"
                                    placeholder="Describe what your company does..."
                                />
                            </div>

                            {/* Questions Card */}
                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 shadow-sm">
                                <h3 className="text-sm font-bold text-gray-900 mb-3">Common Questions</h3>
                                <p className="text-xs text-gray-500 mb-3">Questions your receptionist should know</p>
                                <div className="space-y-2">
                                    {knowledgeItems.filter(i => i.type === 'qa').map((item) => (
                                        <div key={item.id} className="bg-white border border-gray-100 rounded-lg p-3 cursor-pointer hover:bg-gray-50 transition-colors group relative">
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
                                        className="h-10 w-full bg-white border border-gray-200 text-gray-900 rounded-lg font-medium hover:bg-gray-50 active:scale-[0.98] transition-all flex items-center justify-center text-sm"
                                    >
                                        <Plus size={16} className="mr-2" />
                                        Add Question
                                    </button>
                                </div>
                            </div>

                            {/* Facts Card */}
                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 shadow-sm">
                                <h3 className="text-sm font-bold text-gray-900 mb-3">Additional Information</h3>
                                <p className="text-xs text-gray-500 mb-3">Specific facts about your business</p>
                                <div className="space-y-2">
                                    {knowledgeItems.filter(i => i.type === 'fact').map((item) => (
                                        <div key={item.id} className="bg-white border border-gray-100 rounded-lg p-3 flex justify-between items-center group">
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
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newFact}
                                            onChange={(e) => setNewFact(e.target.value)}
                                            placeholder="Add a new fact..."
                                            className="h-10 flex-1 text-sm font-medium text-gray-900 outline-none bg-white border border-gray-200 rounded-lg px-3 focus:border-blue-500 transition-colors placeholder-gray-400"
                                            onKeyDown={async (e) => {
                                                if (e.key === 'Enter' && newFact.trim()) {
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
                                            className="h-10 w-10 bg-blue-600 text-white rounded-lg flex items-center justify-center hover:bg-blue-700 active:scale-95 transition-all"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="h-48"></div>
                    </div>
                )}

                {activeReceptionistTab === 'phone' && (
                    <div className="pb-32">
                        {!isForwardingSetupOpen ? (
                            <div className="space-y-4 animate-in fade-in duration-300">

                                {/* 1. Phone number & Demo */}
                                <section className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                                    <div className="flex justify-between items-center mb-3">
                                        <div>
                                            <h3 className="text-sm font-bold text-gray-900">{personality.name}'s Number</h3>
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
                                            className="bg-blue-50 text-blue-600 px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 hover:bg-blue-100 transition-colors"
                                        >
                                            <Phone size={10} className="fill-current" /> Test Call
                                        </button>
                                    </div>

                                    {userInfo.vapiPhoneNumber ? (
                                        <div className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-base font-black tracking-tight flex items-center justify-center space-x-2 text-gray-900">
                                            <span>{userInfo.vapiPhoneNumber}</span>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(userInfo.vapiPhoneNumber);
                                                    showToast("Number copied");
                                                }}
                                                className="text-gray-300 hover:text-blue-500 transition-colors ml-1"
                                            >
                                                <Copy size={14} />
                                            </button>
                                        </div>
                                    ) : provisioning ? (
                                        <div className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 font-bold flex items-center justify-center space-x-2 text-gray-400 animate-pulse">
                                            <RefreshCw size={14} className="animate-spin" />
                                            <span>Generating...</span>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={handleProvision}
                                            className="w-full bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 font-bold flex items-center justify-center space-x-2 text-red-600 hover:bg-red-100 transition-colors"
                                        >
                                            <RefreshCw size={14} />
                                            <span>Retry Number Generation</span>
                                        </button>
                                    )}
                                </section>

                                {/* 2. Forwarding Status */}
                                <section className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center ${forwardingMode === 'enable' && activationStep > 1 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                                                <ArrowUpRight size={14} />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-gray-900">Call Forwarding</h3>
                                            </div>
                                        </div>
                                    </div>

                                    {forwardingMode === 'enable' && activationStep > 1 ? (
                                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                                            <div className="flex items-center gap-2 text-blue-800 font-bold text-xs mb-2">
                                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(37,99,235,0.4)]"></div>
                                                Forwarding Active
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setForwardingMode('disable');
                                                    setIsForwardingSetupOpen(true);
                                                }}
                                                className="text-xs font-bold text-blue-600 hover:underline"
                                            >
                                                Disable Forwarding
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <button
                                                onClick={() => {
                                                    setForwardingMode('enable');
                                                    setActivationStep(1);
                                                    setIsForwardingSetupOpen(true);
                                                }}
                                                className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-bold hover:bg-blue-700 active:scale-[0.98] transition-all shadow-lg shadow-blue-100"
                                            >
                                                Setup Forwarding
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setForwardingMode('disable');
                                                    setIsForwardingSetupOpen(true);
                                                }}
                                                className="w-full text-red-500 py-2 rounded-lg font-bold text-xs hover:bg-red-50 transition-colors"
                                            >
                                                Deactivate Receptionist
                                            </button>
                                        </div>
                                    )}
                                </section>

                                {/* 3. Voicemail Toggle */}
                                <section className="flex items-center justify-between bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-900">Contact Voicemail</h3>
                                        <p className="text-xs text-gray-500">Allow contacts to bypass AI</p>
                                    </div>
                                    <div className="w-10 h-5 bg-gray-200 rounded-full relative cursor-pointer">
                                        <div className="absolute left-[1px] top-[1px] w-4 h-4 bg-white rounded-full shadow-sm"></div>
                                    </div>
                                </section>

                                {/* 4. Connected Phone Number (User's Mobile) */}
                                <section>
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-2 mt-4">Account Phone Number</h3>
                                    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                                                <PhoneCall size={16} />
                                            </div>
                                            <h3 className="text-sm font-bold text-gray-900">Connected Phone Number</h3>
                                        </div>

                                        <div className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-base font-black tracking-tight flex items-center justify-center mb-3 text-gray-900">
                                            {userInfo.userPhoneNumber || 'No phone number saved'}
                                        </div>

                                        <div className="flex items-start gap-2">
                                            <HelpCircle size={12} className="text-blue-600 mt-0.5 shrink-0" />
                                            <p className="text-xs font-bold text-blue-600 leading-snug cursor-pointer hover:underline">
                                                Need to change your number or add a line? Speak to support
                                            </p>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        ) : (
                            <div className="animate-in slide-in-from-right duration-300 bg-white z-30 -mx-6 -mt-8 px-6 pt-8 pb-40 min-h-screen">
                                <button
                                    onClick={() => {
                                        if (forwardingMode === 'enable' && activationStep > 1) {
                                            setActivationStep(prev => prev - 1);
                                        } else {
                                            setIsForwardingSetupOpen(false);
                                        }
                                    }}
                                    className="flex items-center text-gray-900 font-bold mb-6 hover:bg-gray-50 px-2 py-1 rounded-lg -ml-2 transition-colors"
                                >
                                    <ChevronLeft size={22} className="mr-0.5" /> Back
                                </button>

                                {forwardingMode === 'enable' && (
                                    <div className="space-y-6">
                                        {activationStep === 1 && (
                                            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                                <h2 className="text-xl font-extrabold text-gray-900 mb-4">Turn off Live Voicemail</h2>
                                                <p className="text-sm text-gray-500 mb-8 font-medium">This ensures Juno picks up before Apple's voicemail.</p>

                                                <div className="bg-black rounded-2xl p-4 mb-8 text-white shadow-2xl relative overflow-hidden">
                                                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                                                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-800">
                                                        <div className="flex items-center space-x-2 text-blue-400 font-bold">
                                                            <ChevronLeft size={18} />
                                                            <span>Phone</span>
                                                        </div>
                                                        <span className="font-bold">Live Voicemail</span>
                                                    </div>
                                                    <div className="flex items-center justify-between bg-gray-900/50 rounded-xl p-3 border border-gray-800">
                                                        <span className="font-bold text-sm">Live Voicemail</span>
                                                        <div className="w-11 h-6 bg-[#34C759] rounded-full relative shadow-inner">
                                                            <div className="absolute right-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-lg"></div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => setActivationStep(2)}
                                                    className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-bold shadow-xl hover:bg-black active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                                >
                                                    Continue <ArrowRight size={18} />
                                                </button>
                                            </div>
                                        )}

                                        {activationStep === 2 && (
                                            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                                <h2 className="text-xl font-extrabold text-gray-900 mb-6">Select Carrier</h2>
                                                <div className="space-y-3 mb-8">
                                                    {carriers.map(carrier => (
                                                        <div
                                                            key={carrier.name}
                                                            onClick={() => setSelectedCarrier(carrier.name)}
                                                            className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${selectedCarrier === carrier.name
                                                                ? 'border-blue-500 bg-blue-50/50'
                                                                : 'border-gray-100 hover:border-gray-200'
                                                                }`}
                                                        >
                                                            <span className={`font-bold text-sm ${selectedCarrier === carrier.name ? 'text-blue-600' : 'text-gray-900'}`}>{carrier.name}</span>
                                                            {selectedCarrier === carrier.name && <Check size={14} className="text-blue-500" />}
                                                        </div>
                                                    ))}
                                                </div>

                                                <button
                                                    onClick={() => setActivationStep(3)}
                                                    disabled={!selectedCarrier}
                                                    className={`w-full py-3.5 rounded-xl font-bold shadow-xl transition-all ${selectedCarrier ? 'bg-gray-900 text-white hover:bg-black active:scale-[0.98]' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                                                >
                                                    Continue
                                                </button>
                                            </div>
                                        )}

                                        {activationStep === 3 && (
                                            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                                <h2 className="text-lg font-extrabold text-gray-900 mb-6">Enable Call Forwarding</h2>
                                                <p className="text-sm text-gray-500 mb-8 font-medium">Final step: Activate the call forwarding code for your carrier.</p>

                                                <div className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-3.5 text-lg font-black tracking-widest text-gray-900 flex items-center justify-center space-x-3 mb-8 shadow-inner">
                                                    <Copy size={18} className="text-gray-400" />
                                                    <span>{currentCarrierConfig.code}</span>
                                                </div>

                                                <button
                                                    onClick={() => {
                                                        setIsReceptionistActive(true);
                                                        setIsForwardingSetupOpen(false);
                                                        showToast("Receptionist Activated!");
                                                    }}
                                                    className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-[0.98] transition-all"
                                                >
                                                    Verify Activation
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {forwardingMode === 'disable' && (
                                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                        <h2 className="text-lg font-extrabold text-gray-900 mb-6">Disable Forwarding</h2>
                                        <p className="text-sm text-gray-500 mb-8 font-medium">Use the code below to stop forwarding calls to your receptionist.</p>

                                        <div className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-3.5 text-lg font-black tracking-widest text-gray-900 flex items-center justify-center space-x-3 mb-8 shadow-inner">
                                            <Copy size={18} className="text-gray-400" />
                                            <span>{currentCarrierConfig.disableCode}</span>
                                        </div>

                                        <button
                                            onClick={() => {
                                                setIsReceptionistActive(false);
                                                setIsForwardingSetupOpen(false);
                                                showToast("Receptionist Deactivated!");
                                            }}
                                            className="w-full bg-red-600 text-white py-3.5 rounded-xl font-bold shadow-xl shadow-red-100 hover:bg-red-700 active:scale-[0.98] transition-all"
                                        >
                                            Verify Deactivation
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
            </>
            {/* --- Modals Rendered --- */}
            {activeModal === 'add-question' && (
                <AddQuestionModal
                    onClose={() => setActiveModal(null)}
                    tempQuestion={tempQuestion}
                    setTempQuestion={setTempQuestion}
                    onSave={async () => {
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
                />
            )}

            {showLanguageModal && (
                <LanguageModal
                    onClose={() => setShowLanguageModal(false)}
                    languages={languages}
                    setLanguages={setLanguages}
                    LANGUAGES={LANGUAGES}
                    onSave={async () => {
                        await supabase.from('business_info').delete().eq('owner_user_id', session.user.id).eq('type', 'languages');
                        await supabase.from('business_info').insert({
                            owner_user_id: session.user.id,
                            type: 'languages',
                            content: { languages }
                        });
                        syncAssistant();
                        setShowLanguageModal(false);
                        showToast("Languages updated");
                    }}
                />
            )}
        </div>
        </>
    );
}
