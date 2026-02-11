import React from 'react';
import {
    Users, Bell, CreditCard, MessageSquare, Lock, LogOut,
    Trash2, ChevronRight, ChevronLeft, CreditCard as CreditCardIcon
} from 'lucide-react';

export default function SettingsView({
    view,
    setView,
    showToast,
    supabase,
    setSession,
    session
}) {
    if (view !== 'settings') return null;

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
