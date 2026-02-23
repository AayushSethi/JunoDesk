import React, { useState, useEffect } from 'react';
import {
    Users, Bell, CreditCard, MessageSquare, Lock, LogOut,
    Trash2, ChevronRight, ChevronLeft, Check
} from 'lucide-react';

export default function SettingsView({
    view,
    setView,
    showToast,
    supabase,
    setSession,
    session
}) {
    const [activePlan, setActivePlan] = useState('monthly');
    const [subscriptionStatus, setSubscriptionStatus] = useState(null);
    const [loadingSubscription, setLoadingSubscription] = useState(false);

    useEffect(() => {
        const fetchSubscription = async () => {
            if (!session?.user || view !== 'manage-plan') return;
            setLoadingSubscription(true);
            try {
                const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ""}/api/subscription-status?userId=${session.user.id}`);
                const data = await res.json();
                setSubscriptionStatus(data);
            } catch (err) {
                console.error('Failed to fetch subscription:', err);
            } finally {
                setLoadingSubscription(false);
            }
        };
        fetchSubscription();
    }, [session, view]);

    if (view !== 'settings' && view !== 'manage-plan' && view !== 'account') return null;

    // --- SUB-VIEW: ACCOUNT ---
    if (view === 'account') {
        return (
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
        );
    }

    // --- SUB-VIEW: MANAGE PLAN ---
    if (view === 'manage-plan') {
        return (
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

                    {/* Current Subscription Status */}
                    {loadingSubscription ? (
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 text-center">
                            <p className="text-sm text-gray-500 font-medium">Loading subscription...</p>
                        </div>
                    ) : subscriptionStatus?.hasActiveSubscription ? (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <h3 className="text-sm font-bold text-gray-900">Active Subscription</h3>
                            </div>
                            <p className="text-xs text-gray-600">Plan: {subscriptionStatus.subscription?.productId}</p>
                            <p className="text-xs text-gray-600">Expires: {new Date(subscriptionStatus.subscription?.expiresAt).toLocaleDateString()}</p>
                        </div>
                    ) : (
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
                            <p className="text-sm text-gray-600 font-medium">No active subscription</p>
                        </div>
                    )}

                    {/* Plan Toggle */}
                    <div className="bg-gray-100 p-1 rounded-xl flex mb-6">
                        <button onClick={() => setActivePlan('monthly')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${activePlan === 'monthly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>Monthly</button>
                        <button onClick={() => setActivePlan('annual')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${activePlan === 'annual' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>Annual <span className="text-green-600 text-[10px]">SAVE 30%</span></button>
                    </div>

                    {/* Plan Card */}
                    <div className="border-2 border-gray-100 bg-white p-6 rounded-3xl mb-6 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <div className="text-xl font-bold">Professional</div>
                                <div className="text-sm text-gray-500">All included</div>
                            </div>
                            <div className="text-right">
                                <div className="text-3xl font-black text-gray-900">{activePlan === 'annual' ? '$17.49' : '$24.99'}<span className="text-sm font-medium">/mo</span></div>
                                {activePlan === 'annual' && <div className="text-xs text-gray-500 font-medium">Billed $209.88 annually</div>}
                            </div>
                        </div>
                        <ul className="space-y-3">
                            {['24/7 AI Receptionist', 'Unlimited Minutes', 'Transcripts', 'Spam Blocking'].map(i => (
                                <li key={i} className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                    <Check size={14} className="text-green-600" />{i}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <button
                        onClick={() => showToast('Subscription management coming soon')}
                        className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-200 active:scale-[0.98] transition-all"
                    >
                        Update Subscription
                    </button>

                    <div className="mt-8 text-center text-xs text-gray-400 font-medium">
                        Terms | Privacy
                    </div>
                </div>
            </div>
        );
    }

    // --- MAIN VIEW: SETTINGS ---
    return (
        <div className="flex flex-col h-full bg-transparent relative animate-in slide-in-from-right duration-300">
            {/* Header */}
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
                {/* --- FEATURES --- */}
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1 mt-4">Features</h3>

                {/* Contacts Card */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 shadow-sm mb-3 cursor-pointer hover:border-blue-300 transition-all group" onClick={() => showToast('Opening Contacts Settings...')}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white text-blue-600 flex items-center justify-center shrink-0 border border-gray-200 shadow-sm group-hover:scale-105 transition-transform">
                                <Users size={20} className="stroke-[2.5px]" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-gray-900">Contacts</h4>
                                <p className="text-xs font-medium text-gray-500 mt-0.5">Sync phone contacts</p>
                            </div>
                        </div>
                        <div className="bg-white rounded-lg p-1.5 border border-gray-200 text-gray-400 group-hover:text-blue-600 transition-colors">
                            <ChevronRight size={16} />
                        </div>
                    </div>
                </div>

                {/* Notifications Card */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 shadow-sm cursor-pointer hover:border-blue-300 transition-all group">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white text-blue-600 flex items-center justify-center shrink-0 border border-gray-200 shadow-sm group-hover:scale-105 transition-transform">
                                <Bell size={20} className="stroke-[2.5px]" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-gray-900">Notifications</h4>
                                <p className="text-xs font-medium text-gray-500 mt-0.5">Manage alerts</p>
                            </div>
                        </div>
                        <div className="w-10 h-6 bg-blue-600 rounded-full relative transition-colors shadow-inner">
                            <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                        </div>
                    </div>
                </div>

                {/* --- ACCOUNT --- */}
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1 mt-6">Account</h3>

                {/* Manage Plan */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 shadow-sm mb-3 cursor-pointer hover:border-blue-300 transition-all group" onClick={() => setView('manage-plan')}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white text-blue-600 flex items-center justify-center shrink-0 border border-gray-200 shadow-sm group-hover:scale-105 transition-transform">
                                <CreditCard size={20} className="stroke-[2.5px]" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-gray-900">Manage Plan</h4>
                                <p className="text-xs font-medium text-gray-500 mt-0.5">Subscription & Billing</p>
                            </div>
                        </div>
                        <div className="bg-white rounded-lg p-1.5 border border-gray-200 text-gray-400 group-hover:text-blue-600 transition-colors">
                            <ChevronRight size={16} />
                        </div>
                    </div>
                </div>

                {/* Support */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 shadow-sm mb-3 cursor-pointer hover:border-blue-300 transition-all group" onClick={() => window.open('https://calendly.com/aayushsethi37/30min', '_blank')}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white text-blue-600 flex items-center justify-center shrink-0 border border-gray-200 shadow-sm group-hover:scale-105 transition-transform">
                                <MessageSquare size={20} className="stroke-[2.5px]" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-gray-900">Contact Support</h4>
                                <p className="text-xs font-medium text-gray-500 mt-0.5">Chat with us</p>
                            </div>
                        </div>
                        <div className="bg-white rounded-lg p-1.5 border border-gray-200 text-gray-400 group-hover:text-blue-600 transition-colors">
                            <ChevronRight size={16} />
                        </div>
                    </div>
                </div>

                {/* Privacy Policy */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 shadow-sm mb-3 cursor-pointer hover:border-blue-300 transition-all group" onClick={() => showToast('Opening Privacy Policy...')}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white text-blue-600 flex items-center justify-center shrink-0 border border-gray-200 shadow-sm group-hover:scale-105 transition-transform">
                                <Lock size={20} className="stroke-[2.5px]" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-gray-900">Privacy & Security</h4>
                                <p className="text-xs font-medium text-gray-500 mt-0.5">Data protection</p>
                            </div>
                        </div>
                        <div className="bg-white rounded-lg p-1.5 border border-gray-200 text-gray-400 group-hover:text-blue-600 transition-colors">
                            <ChevronRight size={16} />
                        </div>
                    </div>
                </div>


                {/* Sign Out */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 shadow-sm mb-3 cursor-pointer hover:border-red-300 transition-all group" onClick={async () => {
                    try {
                        await supabase.auth.signOut();
                    } catch (e) {
                        console.error('Sign out error:', e);
                    } finally {
                        setSession(null);
                        setView('auth');
                    }
                }}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white text-red-500 flex items-center justify-center shrink-0 border border-gray-200 shadow-sm group-hover:scale-105 transition-transform">
                                <LogOut size={20} className="stroke-[2.5px]" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-gray-900">Sign Out</h4>
                                <p className="text-xs font-medium text-gray-500 mt-0.5">Log out of your account</p>
                            </div>
                        </div>
                        <div className="bg-white rounded-lg p-1.5 border border-gray-200 text-gray-400 group-hover:text-red-500 transition-colors">
                            <ChevronRight size={16} />
                        </div>
                    </div>
                </div>

                {/* Delete Account */}
                <div className="bg-red-50 border border-red-100 rounded-xl p-4 shadow-sm cursor-pointer hover:bg-red-100 transition-all group" onClick={() => showToast('Delete Account Flow')}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white text-red-500 flex items-center justify-center shrink-0 border border-red-100 shadow-sm group-hover:scale-105 transition-transform">
                                <Trash2 size={20} className="stroke-[2.5px]" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-red-600">Delete Account</h4>
                                <p className="text-xs font-medium text-red-400 mt-0.5">Permanently remove data</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
