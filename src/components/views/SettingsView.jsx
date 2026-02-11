import React, { useState } from 'react';
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
