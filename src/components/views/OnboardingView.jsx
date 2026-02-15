import React from 'react';
import {
    ChevronLeft, Check, AudioWaveform, Globe, MessageSquare,
    Settings, ArrowRight, ChevronDown, PhoneCall, ShieldAlert,
    Calendar, Inbox, Trash2, User, HelpCircle, LogOut, Heart,
    Smartphone, Moon, Sun, Lock, Phone, Sparkles
} from 'lucide-react';
import { TIMEZONES, DEFAULT_TIMEZONE } from '../../constants/timezones';

export default function OnboardingView({
    onboardingStep,
    setOnboardingStep,
    onboardingData,
    setOnboardingData,
    authPhone,
    setAuthPhone,
    otpCode,
    setOtpCode,
    authLoading,
    setAuthLoading,
    authError,
    setAuthError,
    planCycle,
    setPlanCycle,
    userInfo,
    setUserInfo,
    playingVoiceId,
    setPlayingVoiceId,
    selectedCarrier,
    setSelectedCarrier,
    currentCarrierConfig,
    carriers,
    FALLBACK_VOICES,
    showToast,
    setView,
    setGreeting,
    setPersonality,
    session,
    supabase
}) {
    // Helper to save profile info
    const saveOnboardingProfile = async (data) => {
        try {
            const { error } = await supabase
                .from('business_profiles')
                .update(data)
                .eq('owner_user_id', session.user.id);
            if (error) console.warn('Profile save warning:', error);
        } catch (e) {
            console.error('Profile save error:', e);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex flex-col bg-gradient-to-b from-[#F5F6FA] via-[#EEF2FF] to-[#E6ECFF]">
            {/* Navigation: Back */}
            <div className="absolute top-6 left-6 z-50">
                {onboardingStep >= 0 && onboardingStep < 10 && (
                    <button
                        onClick={() => {
                            if (onboardingStep === 0 || onboardingStep === 1) {
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

            {/* Progress Bar */}
            {onboardingStep > 0 && onboardingStep < 10 && (
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gray-100">
                    <div
                        className="h-full bg-blue-600 transition-all duration-500 ease-out"
                        style={{ width: `${((onboardingStep + 1) / 11) * 100}%` }}
                    ></div>
                </div>
            )}

            <div className="h-full flex flex-col p-6 max-w-md mx-auto w-full justify-center animate-in slide-in-from-right duration-500">

                {/* Step 0: How it Works */}
                {onboardingStep === 0 && (
                    <>
                        <h2 className="text-2xl font-black text-gray-900 mb-8 text-center">How does it work?</h2>

                        <div className="flex flex-col items-center space-y-4">
                            {/* Call comes in */}
                            <div className="bg-white rounded-2xl px-8 py-4 shadow-sm border border-gray-100 text-center min-w-[200px]">
                                <PhoneCall size={24} className="text-blue-600 mx-auto mb-2" />
                                <p className="text-sm font-semibold text-gray-900">You receive a call</p>
                            </div>

                            {/* Arrow down */}
                            <div className="text-gray-400">
                                <svg width="20" height="30" viewBox="0 0 20 30" fill="none">
                                    <path d="M10 0V25M10 25L3 18M10 25L17 18" stroke="currentColor" strokeWidth="2" />
                                </svg>
                            </div>

                            {/* You decide */}
                            <p className="text-sm font-semibold text-gray-700">You decide</p>

                            {/* Split arrows */}
                            <div className="flex items-center justify-center w-full max-w-[280px]">
                                <svg width="120" height="40" viewBox="0 0 120 40" fill="none" className="text-gray-400">
                                    <path d="M60 0V15M60 15L10 15M10 15V25M60 15L110 15M110 15V25" stroke="currentColor" strokeWidth="2" fill="none" />
                                </svg>
                            </div>

                            {/* Two paths */}
                            <div className="flex gap-3 w-full max-w-[320px]">
                                {/* Answer path */}
                                <div className="flex-1 flex flex-col items-center space-y-3">
                                    <div className="bg-emerald-50 border-2 border-emerald-400 rounded-xl px-4 py-3 text-center w-full">
                                        <Phone size={18} className="text-emerald-600 mx-auto mb-1" />
                                        <p className="text-sm font-bold text-emerald-700">Answer</p>
                                    </div>
                                    <div className="text-gray-400">
                                        <svg width="16" height="20" viewBox="0 0 16 20" fill="none">
                                            <path d="M8 0V15M8 15L2 9M8 15L14 9" stroke="currentColor" strokeWidth="2" />
                                        </svg>
                                    </div>
                                    <div className="bg-white rounded-xl px-3 py-3 shadow-sm border border-gray-100 text-center w-full">
                                        <Check size={16} className="text-blue-600 mx-auto mb-1" />
                                        <p className="text-xs font-semibold text-gray-900">You talk directly</p>
                                    </div>
                                </div>

                                {/* Don't Answer path */}
                                <div className="flex-1 flex flex-col items-center space-y-3">
                                    <div className="bg-purple-50 border-2 border-purple-400 rounded-xl px-4 py-3 text-center w-full">
                                        <Smartphone size={18} className="text-purple-600 mx-auto mb-1" />
                                        <p className="text-sm font-bold text-purple-700">Don't Answer</p>
                                    </div>
                                    <div className="text-gray-400">
                                        <svg width="16" height="20" viewBox="0 0 16 20" fill="none">
                                            <path d="M8 0V15M8 15L2 9M8 15L14 9" stroke="currentColor" strokeWidth="2" />
                                        </svg>
                                    </div>
                                    <div className="bg-white rounded-xl px-3 py-3 shadow-sm border border-gray-100 text-center w-full">
                                        <Sparkles size={16} className="text-blue-600 mx-auto mb-1" />
                                        <p className="text-xs font-semibold text-gray-900">AI answers for you</p>
                                    </div>
                                </div>
                            </div>

                            {/* Final arrow from AI path */}
                            <div className="flex justify-end w-full max-w-[320px] pr-[60px]">
                                <div className="text-gray-400">
                                    <svg width="16" height="20" viewBox="0 0 16 20" fill="none">
                                        <path d="M8 0V15M8 15L2 9M8 15L14 9" stroke="currentColor" strokeWidth="2" />
                                    </svg>
                                </div>
                            </div>

                            {/* Final result */}
                            <div className="flex justify-end w-full max-w-[320px]">
                                <div className="bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100 text-center min-w-[140px]">
                                    <Check size={16} className="text-blue-600 mx-auto mb-1" />
                                    <p className="text-xs font-semibold text-gray-900">Get Summary<br />& Recording</p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setOnboardingStep(1)}
                            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white py-4 rounded-full font-bold text-lg mt-8 shadow-[0_12px_40px_-12px_rgba(37,99,235,0.6)] hover:shadow-[0_16px_50px_-10px_rgba(37,99,235,0.8)] hover:from-blue-700 hover:to-blue-600 active:scale-[0.97] transition-all duration-300"
                        >
                            I Understand
                        </button>
                    </>
                )}
                {/* Step 1: Phone Entry */}
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
                                    setAuthLoading(true); setAuthError(null);
                                    try {
                                        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ""}/api/dev-signup`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ phone: authPhone })
                                        });
                                        const result = await res.json();
                                        if (!res.ok || result.error) throw new Error(result.error || 'Signup failed');

                                        await supabase.auth.setSession({ access_token: result.accessToken, refresh_token: result.refreshToken });
                                        setOnboardingStep(2); showToast('Account created!');
                                    } catch (err) { setAuthError(err.message); } finally { setAuthLoading(false); }
                                }}
                                disabled={authLoading || authPhone.length < 10}
                                className="w-full bg-white text-blue-600 border border-gray-100 py-4 rounded-full font-bold text-lg shadow-[0_4px_20px_rgba(0,0,0,0.08)] disabled:opacity-50 mt-8 hover:shadow-[0_4px_25px_rgba(37,99,235,0.15)] transition-all"
                            >
                                {authLoading ? 'Creating Account...' : 'Continue'}
                            </button>
                        </div>
                    </>
                )}

                {/* Step 2: Verification */}
                {onboardingStep === 2 && (
                    <>
                        <h2 className="text-3xl font-black text-gray-900 mb-4 leading-tight">Enter the code</h2>
                        <p className="text-gray-500 font-medium mb-8">We sent a text to {authPhone}.</p>
                        <div className="space-y-6">
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">6-Digit Code</label>
                                <input autoFocus type="text" maxLength={6} className="w-full bg-transparent border-b-2 border-gray-200 text-3xl font-bold text-black focus:outline-none focus:border-blue-600 pb-2 placeholder-gray-300 transition-colors tracking-widest" placeholder="123456" value={otpCode} onChange={e => setOtpCode(e.target.value)} />
                            </div>
                            <button onClick={() => setOnboardingStep(3)} className="w-full bg-white text-blue-600 border border-gray-100 py-4 rounded-full font-bold text-lg shadow-[0_4px_20px_rgba(0,0,0,0.08)] mt-8 transition-all">Next</button>
                        </div>
                    </>
                )}

                {/* Step 3: Password */}
                {onboardingStep === 3 && (
                    <>
                        <h2 className="text-3xl font-black text-gray-900 mb-4 leading-tight">Secure your account</h2>
                        <div className="space-y-6">
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Password</label>
                                <input autoFocus type="password" className="w-full bg-transparent border-b-2 border-gray-200 text-2xl font-bold text-black focus:outline-none focus:border-blue-600 pb-2 placeholder-gray-300" placeholder="Min 8 characters" value={onboardingData.password} onChange={e => setOnboardingData({ ...onboardingData, password: e.target.value })} />
                            </div>
                            <button onClick={async () => {
                                if (onboardingData.password.length < 8) return showToast("Too short");
                                setAuthLoading(true);
                                try { await supabase.auth.updateUser({ password: onboardingData.password }); } catch (e) { } finally { setAuthLoading(false); setOnboardingStep(4); }
                            }} disabled={onboardingData.password.length < 8} className="w-full bg-white text-blue-600 border border-gray-100 py-4 rounded-full font-bold text-lg shadow-sm">Create Account</button>
                        </div>
                    </>
                )}

                {/* Step 4: Trial */}
                {onboardingStep === 4 && (
                    <>
                        <div className="text-center mb-6"><div className="inline-block px-3 py-1 bg-blue-100 text-blue-700 font-bold text-xs rounded-full uppercase mb-4 tracking-wider">7 Day Free Trial</div><h2 className="text-3xl font-black text-gray-900 mb-2">Try JunoDesk Free</h2></div>
                        <div className="bg-gray-100 p-1 rounded-xl flex mb-6">
                            <button onClick={() => setPlanCycle('monthly')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${planCycle === 'monthly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>Monthly</button>
                            <button onClick={() => setPlanCycle('annual')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${planCycle === 'annual' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>Annual <span className="text-green-600 text-[10px]">SAVE 30%</span></button>
                        </div>
                        <div className="border-2 border-gray-100 bg-white p-6 rounded-3xl mb-6 shadow-sm">
                            <div className="flex justify-between items-center mb-4"><div><div className="xl font-bold">Professional</div><div className="text-sm text-gray-500">All included</div></div><div className="text-right"><div className="text-3xl font-black text-gray-900">{planCycle === 'annual' ? '$14' : '$19'}<span className="text-sm font-medium">/mo</span></div></div></div>
                            <ul className="space-y-3">{['24/7 AI Receptionist', 'Unlimited Minutes', 'Transcripts', 'Spam Blocking'].map(i => (<li key={i} className="flex items-center gap-2 text-sm font-semibold text-gray-700"><Check size={14} className="text-green-600" />{i}</li>))}</ul>
                        </div>
                        <button onClick={async () => {
                            setAuthLoading(true);
                            try {
                                await saveOnboardingProfile({ subscription_type: planCycle });
                                const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ""}/api/provision`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: session.user.id, subscriptionType: planCycle }) });
                                const d = await res.json();
                                if (d.success) setUserInfo(prev => ({ ...prev, vapiPhoneNumber: d.phoneNumber, vapiAssistantId: d.assistantId, profileId: d.profileId }));
                                setOnboardingStep(5);
                            } catch (e) { setOnboardingStep(5); } finally { setAuthLoading(false); }
                        }} className="w-full bg-white text-blue-600 border border-gray-100 py-4 rounded-full font-bold text-lg">Start trial</button>
                    </>
                )}

                {/* Step 5: Capabilities */}
                {onboardingStep === 5 && (
                    <>
                        <h2 className="text-3xl font-black text-gray-900 mb-8">What should your receptionist do?</h2>
                        <div className="space-y-4">
                            {[
                                { id: 'takeMessages', label: 'Take Detailed Messages', desc: 'Capture name, number, and reason.' },
                                { id: 'scheduleAppointments', label: 'Schedule Appointments', desc: 'Book meetings directly on your calendar.' },
                                { id: 'handleBilling', label: 'Handle Billing Inquiries', desc: 'Answer basic questions about invoices.' }
                            ].map(cap => (
                                <div key={cap.id} onClick={() => setOnboardingData({ ...onboardingData, capabilities: { ...onboardingData.capabilities, [cap.id]: !onboardingData.capabilities[cap.id] } })} className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${onboardingData.capabilities[cap.id] ? 'border-blue-600 bg-blue-50' : 'border-gray-100 bg-white'}`}>
                                    <div className={`mt-1 w-5 h-5 rounded border flex items-center justify-center ${onboardingData.capabilities[cap.id] ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}>{onboardingData.capabilities[cap.id] && <Check size={14} className="text-white" />}</div>
                                    <div><div className="font-bold text-sm">{cap.label}</div><div className="text-xs text-gray-500 mt-1">{cap.desc}</div></div>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => setOnboardingStep(6)} className="w-full bg-white text-blue-600 border border-gray-100 py-4 rounded-full font-bold text-lg mt-8">Continue</button>
                    </>
                )}

                {/* Step 6: Business Info */}
                {onboardingStep === 6 && (
                    <>
                        <h2 className="text-3xl font-black text-gray-900 mb-8">Tell us about your business</h2>
                        <div className="space-y-6">
                            <div><label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Business Name</label>
                                <input className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold" value={onboardingData.companyName} onChange={e => setOnboardingData({ ...onboardingData, companyName: e.target.value })} />
                            </div>
                            <div><label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Industry</label>
                                <select className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold" value={userInfo.businessType} onChange={e => setUserInfo({ ...userInfo, businessType: e.target.value })}>
                                    <option value="">Select Industry...</option><option value="Health">Medical / Dental</option><option value="Home Services">Home Services</option><option value="Legal">Legal</option><option value="Tech">Technology</option><option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Timezone</label>
                                <select
                                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold"
                                    value={userInfo.timezone || DEFAULT_TIMEZONE}
                                    onChange={e => setUserInfo({ ...userInfo, timezone: e.target.value })}
                                >
                                    {TIMEZONES.map(tz => (
                                        <option key={tz.value} value={tz.value}>{tz.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <button disabled={!onboardingData.companyName} onClick={async () => {
                            await saveOnboardingProfile({
                                company_name: onboardingData.companyName,
                                industry: userInfo.businessType,
                                website: onboardingData.website,
                                timezone: userInfo.timezone || DEFAULT_TIMEZONE
                            });
                            setOnboardingStep(7);
                        }} className="w-full bg-white text-blue-600 border border-gray-100 py-4 rounded-full font-bold text-lg mt-8 disabled:opacity-50">Continue</button>
                    </>
                )}

                {/* Step 7: Persona */}
                {onboardingStep === 7 && (
                    <>
                        <h2 className="text-3xl font-black text-gray-900 mb-8">Choose a Voice</h2>
                        <div className="grid grid-cols-3 gap-3 mb-6">
                            {FALLBACK_VOICES.map(voice => {
                                const isSelected = onboardingData.voiceId === voice.id;
                                const isPlaying = playingVoiceId === voice.id;
                                return (
                                    <button key={voice.id} onClick={async () => {
                                        setOnboardingData({ ...onboardingData, voiceId: voice.id });
                                        setPlayingVoiceId(voice.id);
                                        try { const audio = new Audio(voice.preview); audio.onended = () => setPlayingVoiceId(null); await audio.play(); } catch (e) { setPlayingVoiceId(null); }
                                    }} className={`flex flex-col items-center p-2 transition-all ${isSelected ? 'scale-110' : 'opacity-60'}`}>
                                        <div className={`w-20 h-20 rounded-full overflow-hidden relative ${isSelected ? 'ring-4 ring-blue-500 ring-offset-2' : ''}`}>
                                            <img src={voice.avatar} alt={voice.name} className="w-full h-full object-cover" />
                                            {isPlaying && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><AudioWaveform size={20} className="text-white animate-pulse" /></div>}
                                        </div>
                                        <span className="text-xs font-bold mt-2">{voice.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <button onClick={async () => {
                            await saveOnboardingProfile({ voice_id: onboardingData.voiceId });
                            const voiceMatch = FALLBACK_VOICES.find(v => v.id === onboardingData.voiceId);
                            setPersonality(prev => ({ ...prev, voiceId: onboardingData.voiceId, name: voiceMatch?.name || prev.name }));
                            setOnboardingStep(8);
                        }} className="w-full bg-white text-blue-600 border border-gray-100 py-4 rounded-full font-bold text-lg mt-8">Finish Setup</button>
                    </>
                )}

                {/* Step 8 & 10 are technical config steps, omitted brevity but logic is similar */}
                {onboardingStep >= 8 && (
                    <div className="text-center">
                        <h2 className="text-2xl font-black mb-4">{onboardingStep === 8 ? 'Configure iPhone' : onboardingStep === 9 ? 'Activate Forwarding' : 'Ready to Test?'}</h2>
                        <button onClick={() => (onboardingStep < 10 ? setOnboardingStep(s => s + 1) : setView('receptionist'))} className="w-full bg-white text-blue-600 border border-gray-100 py-4 rounded-full font-bold text-lg mt-8">
                            {onboardingStep === 10 ? 'Start Using JunoDesk' : 'Continue'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
