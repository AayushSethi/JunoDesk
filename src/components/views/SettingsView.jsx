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
                const res = await fetch(`http://localhost:3000/api/subscription-status?userId=${session.user.id}`);
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
                                <div className="text-3xl font-black text-gray-900">{activePlan === 'annual' ? '$14' : '$19'}<span className="text-sm font-medium">/mo</span></div>
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
    );
}
