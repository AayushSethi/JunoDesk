import React from 'react';
import {
    ChevronLeft, Check, AudioWaveform, Globe, MessageSquare,
    Settings, ArrowRight, ChevronDown, PhoneCall, ShieldAlert,
    Calendar, Inbox, Trash2, User, HelpCircle, LogOut, Heart,
    Smartphone, Moon, Sun, Lock, Phone, Sparkles, Copy, ArrowUpRight
} from 'lucide-react';
import { TIMEZONES, DEFAULT_TIMEZONE } from '../../constants/timezones';
import googleCalendarIcon from '../../assets/avatars/Logos/Google_Calendar_icon.svg';
import { Purchases } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';

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
    personality,
    setPersonality,
    session,
    supabase
}) {
    const [testCallState, setTestCallState] = React.useState('idle'); // 'idle', 'calling', 'active', 'success', 'error'
    const [testCallDuration, setTestCallDuration] = React.useState(0);

    React.useEffect(() => {
        if (onboardingStep === 13) {
            if (testCallState === 'error') {
                const tmr = setTimeout(() => setOnboardingStep(14), 1500);
                return () => clearTimeout(tmr);
            } else if (testCallState === 'success') {
                const tmr = setTimeout(() => setOnboardingStep(15), 1500);
                return () => clearTimeout(tmr);
            }
        }
    }, [testCallState, onboardingStep, setOnboardingStep]);

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

    const setupPhase = onboardingStep === 9 ? 1 : (onboardingStep >= 10 && onboardingStep <= 11) ? 2 : (onboardingStep >= 12 && onboardingStep <= 13) ? 3 : 4;

    return (
        <div className={`fixed inset-0 z-[9999] flex flex-col transition-colors duration-500 overflow-hidden bg-gradient-to-b from-[#F5F6FA] via-[#EEF2FF] to-[#E6ECFF] text-gray-900`}>
            {/* Progress Bar (Standard) */}
            {onboardingStep > 0 && onboardingStep < 9 && (
                <div className="absolute top-[env(safe-area-inset-top,0px)] left-0 w-full h-1.5 bg-gray-100 z-50">
                    <div
                        className="h-full bg-blue-600 transition-all duration-500 ease-out"
                        style={{ width: `${((onboardingStep + 1) / 9) * 100}%` }}
                    ></div>
                </div>
            )}

            {/* Header / Nav Container */}
            <div className="w-full pt-[max(4rem,env(safe-area-inset-top)+1rem)] px-6 shrink-0 flex flex-col items-center z-40 relative">
                {onboardingStep >= 0 && onboardingStep < 9 && (
                    <div className="w-full flex">
                        <button
                            onClick={() => {
                                if (onboardingStep === 0 || onboardingStep === 1) {
                                    setView('auth');
                                } else if (onboardingStep === 8.1) {
                                    setOnboardingStep(8);
                                } else if (onboardingStep === 8.2) {
                                    setOnboardingStep(8.1);
                                } else if (onboardingStep === 9) {
                                    setOnboardingStep(8.2);
                                } else {
                                    setOnboardingStep(s => s - 1);
                                }
                            }}
                            className="px-4 py-2 bg-white/50 backdrop-blur-sm border border-gray-200 rounded-full text-gray-600 font-semibold text-sm hover:bg-white hover:text-gray-900 transition-all flex items-center gap-1 shadow-sm"
                        >
                            <ChevronLeft size={16} />
                            Back
                        </button>
                    </div>
                )}

                {/* Progress Stepper (Phone Setup Phase) */}
                {onboardingStep >= 9 && onboardingStep <= 14 && (
                    <div className="w-full max-w-xs mx-auto flex items-center justify-between mb-4">
                        {[1, 2, 3, 4].map(step => (
                            <React.Fragment key={step}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm z-10 transition-all shadow-sm border ${setupPhase >= step ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-400 border-gray-200'}`}>
                                    {step}
                                </div>
                                {step < 4 && (
                                    <div className="flex-1 h-[3px] mx-1 relative rounded-full overflow-hidden">
                                        <div className="absolute inset-0 bg-gray-200"></div>
                                        <div className="absolute left-0 top-0 bottom-0 bg-blue-600 transition-all duration-500 ease-out" style={{ width: setupPhase > step ? '100%' : '0%' }}></div>
                                    </div>
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex-1 flex flex-col p-6 pt-2 max-w-md mx-auto w-full justify-center animate-in slide-in-from-right duration-500 overflow-y-auto pb-12">

                {/* Step 0: How it Works */}
                {onboardingStep === 0 && (
                    <>
                        <h2 className="text-3xl font-black text-gray-900 mb-8 text-center tracking-tight">How does it work?</h2>

                        <div className="flex flex-col items-center w-full max-w-[320px] mx-auto text-sm">
                            {/* Call comes in */}
                            <div className="w-[200px] bg-white rounded-[1.2rem] py-4 px-4 flex flex-col items-center shadow-sm border border-gray-200 mb-1 z-10">
                                <PhoneCall size={24} className="text-blue-600 mb-2" />
                                <h3 className="font-bold text-gray-900 text-[15px]">You receive a call</h3>
                            </div>

                            <div className="flex flex-col items-center justify-center my-1 z-0">
                                <div className="w-[1.5px] h-4 bg-gray-300"></div>
                                <ChevronDown size={14} className="text-gray-400 -mt-1.5" strokeWidth={3} />
                            </div>

                            <div className="font-bold text-gray-900 mb-1 z-10 text-[15px]">You decide</div>

                            <svg width="80" height="30" viewBox="0 0 80 30" fill="none" className="my-1 text-gray-400">
                                <path d="M40 0 L15 25 L22 25 M15 25 L15 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M40 0 L65 25 L58 25 M65 25 L65 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>

                            <div className="w-full flex gap-3 items-start z-10">
                                {/* Left Branch */}
                                <div className="flex-[0.9] flex flex-col items-center">
                                    <div className="w-full bg-white border-2 border-green-500 rounded-xl py-4 px-2 flex flex-col items-center shadow-sm mb-1">
                                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white mb-2">
                                            <Phone size={12} fill="currentColor" />
                                        </div>
                                        <h3 className="font-bold text-green-500 text-[14px]">Answer</h3>
                                    </div>

                                    <div className="flex flex-col items-center justify-center my-1">
                                        <div className="w-[1.5px] h-4 bg-gray-300"></div>
                                        <ChevronDown size={14} className="text-gray-400 -mt-1.5" strokeWidth={3} />
                                    </div>

                                    <div className="w-full bg-white border border-gray-200 rounded-xl py-4 px-2 flex flex-col items-center shadow-sm">
                                        <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white mb-2">
                                            <Check size={12} strokeWidth={3} />
                                        </div>
                                        <h3 className="font-bold text-gray-900 text-center text-[13px] leading-tight">You talk directly</h3>
                                    </div>
                                </div>

                                {/* Right Branch */}
                                <div className="flex-[1.1] flex flex-col items-center">
                                    <div className="w-full bg-white border-2 border-blue-600 rounded-xl py-4 px-2 flex flex-col items-center shadow-sm mb-1">
                                        <div className="w-6 h-6 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-2">
                                            <Phone size={14} className="rotate-[135deg]" fill="currentColor" />
                                        </div>
                                        <h3 className="font-bold text-blue-600 text-[14px]">Don't Answer</h3>
                                    </div>

                                    <div className="flex flex-col items-center justify-center my-1">
                                        <div className="w-[1.5px] h-4 bg-gray-300"></div>
                                        <ChevronDown size={14} className="text-gray-400 -mt-1.5" strokeWidth={3} />
                                    </div>

                                    <div className="w-full bg-white border border-gray-200 rounded-xl py-4 px-2 flex flex-col items-center shadow-sm mb-1">
                                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-blue-600 mb-2">
                                            <Sparkles size={20} />
                                        </div>
                                        <h3 className="font-bold text-gray-900 text-center text-[13px] leading-tight px-1">JunoDesk answers for you</h3>
                                    </div>

                                    <div className="flex flex-col items-center justify-center my-1">
                                        <div className="w-[1.5px] h-4 bg-gray-300"></div>
                                        <ChevronDown size={14} className="text-gray-400 -mt-1.5" strokeWidth={3} />
                                    </div>

                                    <div className="w-full bg-white border border-gray-200 rounded-xl py-4 px-2 flex flex-col items-center shadow-sm">
                                        <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white mb-2">
                                            <Check size={12} strokeWidth={3} />
                                        </div>
                                        <h3 className="font-bold text-gray-900 text-center text-[13px] leading-tight px-1">Get Summary & Recording</h3>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setOnboardingStep(1)}
                            className="w-full bg-gray-900 text-white py-4 rounded-full font-bold shadow-xl hover:bg-black active:scale-[0.98] transition-all mt-8 flex items-center justify-center text-[17px]"
                        >
                            Continue
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

                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Email Address</label>
                                <input
                                    type="email"
                                    className="w-full bg-transparent border-b-2 border-gray-200 text-2xl font-bold text-black focus:outline-none focus:border-blue-600 pb-2 placeholder-gray-300 transition-colors"
                                    placeholder="you@company.com"
                                    value={onboardingData.email || ''}
                                    onChange={e => setOnboardingData({ ...onboardingData, email: e.target.value })}
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
                                            body: JSON.stringify({ phone: authPhone, email: onboardingData.email })
                                        });
                                        const result = await res.json();
                                        if (!res.ok || result.error) throw new Error(result.error || 'Signup failed');

                                        await supabase.auth.setSession({ access_token: result.accessToken, refresh_token: result.refreshToken });
                                        setOnboardingStep(2); showToast('Account created!');
                                    } catch (err) { setAuthError(err.message); } finally { setAuthLoading(false); }
                                }}
                                disabled={authLoading || authPhone.length < 10 || !onboardingData.email || !onboardingData.email.includes('@')}
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
                        <div className="text-center mb-6"><div className="inline-block px-3 py-1 bg-blue-100 text-blue-700 font-bold text-xs rounded-full uppercase mb-4 tracking-wider">7 Day Free Trial</div><h2 className="text-3xl font-black mb-2">Try <span className="text-gray-900">Juno</span><span className="text-blue-600">Desk</span> Free</h2></div>
                        <div className="bg-gray-100 p-1 rounded-xl flex mb-6">
                            <button onClick={() => setPlanCycle('monthly')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${planCycle === 'monthly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>Monthly</button>
                            <button onClick={() => setPlanCycle('annual')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${planCycle === 'annual' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>Annual <span className="text-green-600 text-[10px]">SAVE 30%</span></button>
                        </div>
                        <div className="border-2 border-gray-100 bg-white p-6 rounded-3xl mb-6 shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                                <div><div className="text-xl font-bold">Professional</div><div className="text-sm text-gray-500">All included</div></div>
                                <div className="text-right">
                                    <div className="text-3xl font-black text-gray-900">{planCycle === 'annual' ? '$33.25' : '$49.00'}<span className="text-sm font-medium">/mo</span></div>
                                    {planCycle === 'annual' && <div className="text-xs text-gray-500 font-medium">Billed $399.00 annually</div>}
                                </div>
                            </div>
                            <ul className="space-y-3">{['24/7 AI Receptionist', 'Unlimited Minutes', 'Transcripts', 'Spam Blocking'].map(i => (<li key={i} className="flex items-center gap-2 text-sm font-semibold text-gray-700"><Check size={14} className="text-green-600" />{i}</li>))}</ul>
                        </div>
                        <button onClick={async () => {
                            if (typeof Capacitor !== 'undefined' && Capacitor.getPlatform() === 'web') {
                                showToast("Web dev bypass: Pretending to purchase package");
                                setAuthLoading(true);
                                await saveOnboardingProfile({ subscription_type: planCycle });
                                const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ""}/api/provision`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: session.user.id, subscriptionType: planCycle }) });
                                const d = await res.json();
                                if (d.success) setUserInfo(prev => ({ ...prev, vapiPhoneNumber: d.phoneNumber, vapiAssistantId: d.assistantId, profileId: d.profileId }));
                                setAuthLoading(false);
                                setOnboardingStep(5);
                                return;
                            }

                            try {
                                setAuthLoading(true);
                                showToast("Loading secure checkout...");
                                const offerings = await Purchases.getOfferings();
                                if (offerings.current && offerings.current.availablePackages.length > 0) {
                                    const pkgToBuy = planCycle === 'annual' ? offerings.current.annual : offerings.current.monthly;
                                    if (!pkgToBuy) {
                                        showToast("Plan not found. Try again later.");
                                        setAuthLoading(false);
                                        return;
                                    }

                                    const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkgToBuy });
                                    const activeEntitlements = Object.keys(customerInfo.entitlements.active);

                                    if (activeEntitlements.length > 0) {
                                        await saveOnboardingProfile({ subscription_type: planCycle });
                                        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ""}/api/provision`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: session.user.id, subscriptionType: planCycle }) });
                                        const d = await res.json();
                                        if (d.success) setUserInfo(prev => ({ ...prev, vapiPhoneNumber: d.phoneNumber, vapiAssistantId: d.assistantId, profileId: d.profileId }));
                                        setOnboardingStep(5);
                                    } else {
                                        showToast("Purchase completed, but features weren't unlocked.");
                                    }
                                } else {
                                    showToast("No packages available. Check RevenueCat setup.");
                                }
                            } catch (e) {
                                if (!e.userCancelled) {
                                    console.error('Purchase error:', e);
                                    showToast("Failed to process subscription.");
                                }
                            } finally {
                                setAuthLoading(false);
                            }
                        }} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-xl shadow-blue-200 active:scale-[0.98] transition-all text-lg mb-4 flex items-center justify-center">
                            {authLoading ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Processing...
                                </div>
                            ) : "Start 14-Day Free Trial"}
                        </button>
                        <div className="text-center mt-2 flex justify-center gap-4 text-xs font-semibold text-gray-400">
                            <a href="https://example.com/terms" target="_blank" rel="noreferrer" className="hover:text-gray-600">Terms of Service</a>
                            <a href="https://example.com/privacy" target="_blank" rel="noreferrer" className="hover:text-gray-600">Privacy Policy</a>
                        </div>
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
                                { id: 'answerQuestions', label: 'Answer FAQs', desc: 'Answer common questions about your business.' }
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
                                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Website <span className="text-gray-300 font-normal normal-case">— optional</span></label>
                                <input
                                    type="text"
                                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold"
                                    placeholder="https://example.com"
                                    value={onboardingData.website || ''}
                                    onChange={(e) => setOnboardingData({ ...onboardingData, website: e.target.value })}
                                    onBlur={(e) => {
                                        let val = e.target.value.trim();
                                        if (val && !val.startsWith('http://') && !val.startsWith('https://')) {
                                            val = 'https://' + val;
                                            setOnboardingData(prev => ({ ...prev, website: val }));
                                        }
                                    }}
                                />
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
                        <button disabled={!onboardingData.companyName || authLoading} onClick={async () => {
                            setAuthLoading(true);
                            try {
                                await saveOnboardingProfile({
                                    company_name: onboardingData.companyName,
                                    industry: userInfo.businessType,
                                    website: onboardingData.website,
                                    timezone: userInfo.timezone || DEFAULT_TIMEZONE
                                });

                                if (onboardingData.website) {
                                    showToast("Scanning website...");
                                    try {
                                        // Fire and forget, or wait? Waiting might take 5-10 seconds.
                                        // It's better to wait so they don't test immediately before knowledge is ready
                                        await fetch(`${import.meta.env.VITE_API_BASE_URL || ""}/api/scrape-website`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                url: onboardingData.website,
                                                userId: session.user.id
                                            })
                                        });
                                    } catch (scrapeErr) {
                                        console.warn("Scrape error during onboarding:", scrapeErr);
                                    }
                                }

                                setOnboardingStep(7);
                            } catch (err) {
                                console.error("Error saving business info:", err);
                                showToast("Failed to complete setup");
                            } finally {
                                setAuthLoading(false);
                            }
                        }} className="w-full bg-white text-blue-600 border border-gray-100 py-4 rounded-full font-bold text-lg mt-8 disabled:opacity-50">
                            {authLoading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                    Syncing Knowledge...
                                </div>
                            ) : 'Continue'}
                        </button>
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

                {/* Step 8: Connect Google Calendar */}
                {onboardingStep === 8 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="flex justify-center mb-6">
                            <div className="w-20 h-20 bg-white rounded-2xl shadow-xl flex items-center justify-center p-4 border border-gray-100">
                                <img src={googleCalendarIcon} alt="Google Calendar" className="w-full h-full object-contain" />
                            </div>
                        </div>

                        <h2 className="text-2xl font-black text-gray-900 mb-3 text-center tracking-tight">Connect your calendar</h2>
                        <p className="text-center text-gray-500 font-medium mb-8 text-sm px-4">Let {personality?.name || 'Juno'} handle your bookings by syncing with your Google Calendar.</p>

                        <button
                            onClick={async () => {
                                try {
                                    setAuthLoading(true);
                                    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ""}/api/auth/google-url`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ userId: session.user.id })
                                    });
                                    const data = await res.json();

                                    if (data.url) {
                                        const popup = window.open(data.url, 'googleAuth', 'width=500,height=600');
                                        const timer = setInterval(() => {
                                            if (popup && popup.closed) {
                                                clearInterval(timer);
                                                showToast("Calendar connected successfully!");
                                                setOnboardingStep(8.1);
                                                setAuthLoading(false);
                                            }
                                        }, 1000);
                                    } else {
                                        showToast("Failed to initialize Google Auth");
                                        setAuthLoading(false);
                                    }
                                } catch (e) {
                                    console.error(e);
                                    showToast("Error connecting calendar. Try again.");
                                    setAuthLoading(false);
                                }
                            }}
                            disabled={authLoading}
                            className={`w-full ${authLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98]'} text-white py-4 rounded-xl font-bold shadow-xl shadow-blue-100 transition-all flex items-center justify-center gap-2 mb-4`}
                        >
                            {authLoading ? 'Connecting...' : <>Connect Google Calendar <ArrowRight size={18} /></>}
                        </button>

                        <button
                            onClick={() => setOnboardingStep(8.1)}
                            className="text-gray-400 font-bold text-xs hover:text-gray-600 transition-colors uppercase tracking-wider flex items-center justify-center w-full mx-auto py-2"
                        >
                            Skip for now
                        </button>
                    </div>
                )}

                {/* Step 8.1: Enable Notifications */}
                {onboardingStep === 8.1 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="flex justify-center mb-6">
                            <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6 shadow-sm relative overflow-hidden">
                                <div className="absolute inset-0 bg-blue-600 opacity-10 animate-pulse"></div>
                                <MessageSquare size={36} className="text-blue-600 relative z-10" fill="currentColor" />
                                <div className="absolute top-4 right-4 w-4 h-4 bg-red-500 rounded-full border-2 border-white"></div>
                            </div>
                        </div>

                        <h2 className="text-3xl font-black text-gray-900 mb-3 text-center tracking-tight">Stay in the loop</h2>
                        <p className="text-center text-gray-500 font-medium mb-12 text-[15px] px-6">Get instantly notified the second your AI receptionist takes a message or books a meeting.</p>

                        <button
                            onClick={() => {
                                if ('Notification' in window) {
                                    Notification.requestPermission();
                                }
                                setOnboardingStep(8.2);
                            }}
                            className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-[0.98] transition-all text-lg mb-4"
                        >
                            Enable Notifications
                        </button>

                        <button
                            onClick={() => setOnboardingStep(8.2)}
                            className="text-gray-400 font-bold text-xs hover:text-gray-600 transition-colors w-full text-center py-2"
                        >
                            MAYBE LATER
                        </button>
                    </div>
                )}

                {/* Step 8.2: Sync Contacts */}
                {onboardingStep === 8.2 && (
                    <div className="animate-in zoom-in duration-300">
                        <div className="flex justify-center mb-6">
                            <div className="w-24 h-24 bg-purple-50 rounded-2xl flex flex-wrap items-center justify-center gap-1 p-3 transform rotate-3 shadow-sm border border-purple-100">
                                <div className="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center text-purple-700 font-bold text-xs">JD</div>
                                <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-bold text-xs">AM</div>
                                <div className="w-8 h-8 rounded-full bg-pink-200 flex items-center justify-center text-pink-700 font-bold text-xs">SK</div>
                            </div>
                        </div>

                        <h2 className="text-3xl font-black text-gray-900 mb-3 text-center tracking-tight">Who's calling?</h2>
                        <p className="text-center text-gray-500 font-medium mb-12 text-[15px] px-6">Allow contact access so your AI receptionist can greet your regular customers by name.</p>

                        <button
                            onClick={() => {
                                // Web API for contacts, or mock for now
                                setOnboardingStep(9);
                            }}
                            className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold shadow-xl hover:bg-black active:scale-[0.98] transition-all text-lg mb-4 flex items-center justify-center gap-2"
                        >
                            <User size={18} /> Sync Contacts
                        </button>

                        <button
                            onClick={() => setOnboardingStep(9)}
                            className="text-gray-400 font-bold text-xs hover:text-gray-600 transition-colors w-full text-center py-2"
                        >
                            SKIP FOR NOW
                        </button>
                    </div>
                )}

                {/* Step 9: Turn off Live Voicemail */}
                {onboardingStep === 9 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="bg-white border-2 border-gray-100 rounded-3xl p-6 mb-8 text-gray-900 shadow-sm">
                            <h2 className="text-[22px] font-black tracking-tight mb-2">Step 1: Disable<br />Live Voicemail</h2>
                            <p className="text-[15px] text-gray-500 mb-8 font-medium pr-4 leading-relaxed">To let your AI assistant answer your missed calls, you need to turn Live Voicemail OFF.</p>

                            <div className="space-y-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 text-[13px] shrink-0">1</div>
                                    <div className="text-[15px] text-gray-700 font-medium pt-0.5">Open your Settings</div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 text-[13px] shrink-0">2</div>
                                    <div className="text-[15px] text-gray-700 font-medium pt-0.5">Scroll and go to Apps<br />-&gt; Phone</div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 text-[13px] shrink-0">3</div>
                                    <div className="text-[15px] text-gray-700 font-medium pt-0.5">Select Live Voicemail</div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 text-[13px] shrink-0">4</div>
                                    <div className="text-[15px] text-gray-700 font-medium pt-0.5">Turn Live Voicemail OFF</div>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setOnboardingStep(10)}
                            className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold hover:bg-black active:scale-[0.98] transition-all text-lg flex items-center justify-center"
                        >
                            Continue
                        </button>
                    </div>
                )}

                {/* Step 10: Choose Carrier */}
                {onboardingStep === 10 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <h2 className="text-[28px] font-black text-gray-900 mb-6 tracking-tight text-center">Select Carrier</h2>
                        <div className="space-y-3 mb-8">
                            {carriers.map(carrier => (
                                <div
                                    key={carrier.name}
                                    onClick={() => setSelectedCarrier(carrier.name)}
                                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${selectedCarrier === carrier.name
                                        ? 'border-blue-600 bg-blue-50/50'
                                        : 'border-transparent bg-white shadow-sm hover:border-blue-200'
                                        }`}
                                >
                                    <span className={`font-bold text-[15px] ${selectedCarrier === carrier.name ? 'text-blue-600' : 'text-gray-900'}`}>{carrier.name}</span>
                                    {selectedCarrier === carrier.name && <Check size={18} className="text-blue-600" />}
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => setOnboardingStep(11)}
                            disabled={!selectedCarrier}
                            className={`w-full py-4 rounded-xl font-bold shadow-sm transition-all text-lg flex items-center justify-center ${selectedCarrier ? 'bg-gray-900 text-white hover:bg-black active:scale-[0.98]' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                        >
                            Continue
                        </button>
                    </div>
                )}

                {/* Step 11: Setup Call Forwarding */}
                {onboardingStep === 11 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300 text-center pt-4">
                        <h2 className="text-[28px] font-black text-gray-900 mb-3 tracking-tight">Call Forwarding</h2>
                        <p className="text-[15px] text-gray-500 mb-10 font-medium px-4">Call this code to forward missed calls to your AI receptionist.</p>

                        <a
                            href={`tel:${encodeURIComponent((currentCarrierConfig?.code || '').replace('(513) 327-7680', userInfo?.vapiPhoneNumber || '(513) 327-7680'))}`}
                            className="w-40 h-40 mx-auto rounded-full bg-blue-600 flex flex-col items-center justify-center gap-2 mb-8 shadow-xl shadow-blue-200 active:scale-[0.95] transition-all hover:bg-blue-700"
                        >
                            <Phone size={36} className="text-white" fill="currentColor" />
                        </a>

                        <div className="text-sm font-medium text-gray-500 mb-2">Code to dial:</div>
                        <div className="text-2xl font-black text-gray-900 tracking-wider mb-10">
                            {(currentCarrierConfig?.code || '').replace('(513) 327-7680', userInfo?.vapiPhoneNumber || '(513) 327-7680')}
                        </div>

                        <p className="text-gray-500 text-[14px] mb-8 font-medium px-4">After calling, a grey confirmation screen will appear. Tap Dismiss to finish.</p>

                        <button
                            onClick={() => setOnboardingStep(12)}
                            className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold hover:bg-black active:scale-[0.98] transition-all text-lg flex items-center justify-center"
                        >
                            Continue
                        </button>
                    </div>
                )}

                {/* Step 15: Setup Complete */}
                {onboardingStep === 15 && (
                    <div className="animate-in zoom-in duration-500 flex flex-col items-center justify-center text-center mt-10">
                        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-green-100/50">
                            <Check size={40} className="text-green-600" strokeWidth={3} />
                        </div>

                        <h2 className="text-3xl font-black text-gray-950 mb-4 tracking-tight leading-tight">Setup Complete! 🎉</h2>
                        <p className="text-gray-500 font-medium text-sm mb-10">Your AI receptionist is fully activated and ready to handle your missed calls.</p>

                        <div className="w-full space-y-3">
                            <button
                                onClick={() => {
                                    setView('receptionist');
                                    showToast("Welcome to your dashboard! 🎉");
                                }}
                                className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-bold shadow-xl hover:bg-black active:scale-[0.98] transition-all"
                            >
                                Go to Dashboard
                            </button>

                            <a
                                href={`tel:${userInfo?.vapiPhoneNumber || ''}`}
                                className="w-full bg-blue-50 text-blue-600 py-3.5 rounded-xl font-bold hover:bg-blue-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                <Phone size={18} fill="currentColor" /> Call Your Receptionist
                            </a>
                        </div>
                    </div>
                )}

                {/* Step 12: Let's test your setup */}
                {onboardingStep === 12 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300 text-center mt-6">
                        <h2 className="text-[28px] font-black text-gray-900 mb-3 tracking-tight">Let's test your setup</h2>
                        <p className="text-[16px] text-gray-500 mb-12 font-medium px-4">We'll place a quick test call to your number to confirm call forwarding works.</p>

                        <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex flex-col items-center justify-center gap-2 mb-10 shadow-xl shadow-blue-200">
                            <Phone size={36} className="text-white ml-2" fill="currentColor" />
                        </div>

                        <div className="text-[15px] font-medium text-gray-500 mb-1">We'll call:</div>
                        <div className="text-2xl font-black text-gray-900 tracking-wider mb-10">
                            {authPhone || '(555) 123-4567'}
                        </div>

                        <div className="bg-white border-2 border-gray-100 rounded-2xl p-4 mb-8 w-full text-left flex flex-col gap-1 shadow-sm">
                            <div className="flex items-center gap-2 font-bold text-gray-900 text-[15px]">
                                <Smartphone size={16} className="text-gray-400" />
                                When your phone rings:
                            </div>
                            <p className="text-gray-500 text-[14px] pl-6">Press decline or let it ring — don't answer.</p>
                        </div>

                        <button
                            onClick={async () => {
                                setOnboardingStep(13);
                                setTestCallState('calling');
                                setTestCallDuration(0);

                                try {
                                    await fetch(`${import.meta.env.VITE_API_BASE_URL || ""}/api/test-call`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ userId: session.user.id, userPhone: authPhone, vapiPhone: userInfo?.vapiPhoneNumber })
                                    });

                                    let attempts = 0;
                                    const pollInterval = setInterval(async () => {
                                        attempts++;
                                        try {
                                            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ""}/api/test-call/status?userId=${session.user.id}`);
                                            const data = await res.json();

                                            if (data.status === 'in-progress') {
                                                setTestCallState('active');
                                                setTestCallDuration(prev => prev + 2);
                                            } else if (data.status === 'completed') {
                                                setTestCallState('success');
                                                clearInterval(pollInterval);
                                            } else if (data.status === 'failed' || attempts > 30) {
                                                setTestCallState('error');
                                                clearInterval(pollInterval);
                                            }
                                        } catch (e) {
                                            if (attempts > 30) {
                                                setTestCallState('error');
                                                clearInterval(pollInterval);
                                            }
                                        }
                                    }, 2000);
                                } catch (err) {
                                    console.error(err);
                                    setTestCallState('error');
                                }
                            }}
                            className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 active:scale-[0.98] transition-all text-lg mb-4 shadow-sm flex items-center justify-center"
                        >
                            Start Test Call
                        </button>

                        <button
                            onClick={() => setOnboardingStep(15)}
                            className="text-gray-400 font-bold text-xs hover:text-gray-600 transition-colors uppercase tracking-wider py-2"
                        >
                            Skip & Go to Dashboard
                        </button>
                    </div>
                )}

                {/* Step 13: Testing Your Assistant (Active Test) */}
                {onboardingStep === 13 && (
                    <div className="animate-in fade-in duration-300 text-center mt-6">
                        <h2 className="text-[28px] font-black text-gray-900 mb-2 tracking-tight">Testing Your Assistant</h2>
                        <p className="text-[16px] text-gray-500 mb-12 font-medium">Watching the magic happen...</p>

                        <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center relative mb-12 shadow-xl shadow-blue-200">
                            {(testCallState === 'calling') && (
                                <Phone size={36} className="text-white ml-2 animate-pulse" fill="currentColor" />
                            )}
                            {(testCallState === 'active' || testCallState === 'success') && (
                                <>
                                    <User size={38} className="text-white relative z-10" fill="currentColor" />
                                    <div className="absolute top-2 right-2 bg-blue-800 rounded-full p-0.5 border-2 border-white">
                                        <AudioWaveform size={12} className="text-white animate-pulse" />
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="text-[15px] font-medium text-gray-500 mb-4 h-6">
                            {testCallState === 'calling' ? 'Placing test call...' : `0:0${testCallDuration % 10} Your assistant is on the line`}
                        </div>

                        <div className="bg-white border-2 border-gray-100 rounded-2xl p-4 w-full text-left space-y-5 shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${testCallState === 'idle' ? 'bg-gray-100 text-gray-400' : 'bg-[#34C759] text-white'}`}>
                                    {testCallState !== 'idle' ? <Check size={14} strokeWidth={3} /> : <span className="text-[13px] font-bold">1</span>}
                                </div>
                                <span className={`font-medium text-[15px] ${testCallState === 'idle' ? 'text-gray-400' : 'text-gray-900'}`}>Placing test call</span>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${testCallState === 'active' || testCallState === 'success' ? 'bg-[#34C759] text-white' : 'bg-gray-100 text-gray-400'}`}>
                                    {testCallState === 'active' || testCallState === 'success' ? <Check size={14} strokeWidth={3} /> : <span className="text-[13px] font-bold">2</span>}
                                </div>
                                <span className={`font-medium text-[15px] ${testCallState === 'active' || testCallState === 'success' ? 'text-gray-900' : 'text-gray-400'}`}>Call declined & routing to assistant</span>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${testCallState === 'success' ? 'bg-[#34C759] text-white' : (testCallState === 'active' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400')}`}>
                                    {testCallState === 'success' ? <Check size={14} strokeWidth={3} /> : (testCallState === 'active' ? <AudioWaveform size={16} className="animate-spin" /> : <span className="text-[13px] font-bold">3</span>)}
                                </div>
                                <span className={`font-medium text-[15px] ${testCallState === 'success' ? 'text-gray-900' : (testCallState === 'active' ? 'text-blue-600 font-bold' : 'text-gray-400')}`}>Assistant handling call</span>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${testCallState === 'success' ? 'bg-[#34C759] text-white' : 'bg-gray-100 text-gray-400'}`}>
                                    {testCallState === 'success' ? <Check size={14} strokeWidth={3} /> : <span className="text-[13px] font-bold">4</span>}
                                </div>
                                <span className={`font-medium text-[15px] ${testCallState === 'success' ? 'text-gray-900' : 'text-gray-400'}`}>Generating summary & recording</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 14: Error / Fix Setup */}
                {onboardingStep === 14 && (
                    <div className="animate-in fade-in slide-in-from-bottom flex flex-col items-center">
                        <h2 className="text-[28px] font-black text-red-600 mb-2 mt-4 tracking-tight">Assistant Didn't Answer</h2>
                        <p className="text-[17px] text-gray-500 mb-8 font-medium">Let's fix your setup:</p>

                        <div className="space-y-4 w-full px-2">
                            <div className="bg-white border-2 border-gray-100 rounded-2xl p-4 w-full shadow-sm text-left">
                                <div className="flex gap-4">
                                    <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center shrink-0">
                                        <span className="text-[13px] font-bold">1</span>
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold text-[16px] text-gray-900 mb-1">Turn off live voicemail</div>
                                        <div className="text-gray-500 text-[13px] mb-4">Go to Phone {'>'} Live Voicemail {'>'} Off</div>
                                        <button
                                            onClick={() => setOnboardingStep(9)}
                                            className="w-full bg-blue-50 text-blue-600 py-3 rounded-xl font-bold active:scale-[0.98] transition-all text-[15px]"
                                        >
                                            Open Settings
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white border-2 border-gray-100 rounded-2xl p-4 w-full shadow-sm text-left">
                                <div className="flex gap-4">
                                    <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center shrink-0">
                                        <span className="text-[13px] font-bold">2</span>
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold text-[16px] text-gray-900 mb-1">Activate call forwarding</div>
                                        <div className="text-gray-500 text-[13px] mb-4">This refreshes your carrier settings. After calling, a grey confirmation screen will appear. Tap Dismiss to finish.</div>
                                        <a
                                            href={`tel:${encodeURIComponent((currentCarrierConfig?.code || '').replace('(513) 327-7680', userInfo?.vapiPhoneNumber || '(513) 327-7680'))}`}
                                            className="w-full flex items-center justify-center bg-gray-900 text-white py-3 rounded-xl font-bold active:scale-[0.98] transition-all text-[15px]"
                                        >
                                            Dial Code
                                        </a>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white border-2 border-gray-100 rounded-2xl p-4 w-full shadow-sm text-left">
                                <div className="flex gap-4">
                                    <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center shrink-0">
                                        <span className="text-[13px] font-bold">3</span>
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold text-[16px] text-gray-900 mb-1">Try the test call again</div>
                                        <div className="text-gray-500 text-[13px] mb-4">We'll call you once more</div>
                                        <button
                                            onClick={() => setOnboardingStep(12)}
                                            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold active:scale-[0.98] transition-all text-[15px] shadow-sm"
                                        >
                                            Start Test
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white border-2 border-gray-100 rounded-2xl p-4 w-full shadow-sm text-left">
                                <div className="flex gap-4 items-center">
                                    <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center shrink-0">
                                        <span className="text-[13px] font-bold">4</span>
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold text-[16px] text-gray-900 mb-1">When it rings: decline or ignore</div>
                                        <div className="text-gray-500 text-[13px] leading-tight mt-1">Don't answer! Let it forward to assistant</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                setView('receptionist');
                                showToast("Welcome to your dashboard! 🎉");
                            }}
                            className="mt-8 text-gray-400 font-bold text-[13px] hover:text-gray-600 transition-colors tracking-wide underline decoration-gray-400 underline-offset-4"
                        >
                            Skip & Go to Dashboard
                        </button>
                    </div>
                )}
            </div>
        </div >
    );
}
