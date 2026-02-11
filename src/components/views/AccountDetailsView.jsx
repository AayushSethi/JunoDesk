import React from 'react';
import { ChevronLeft } from 'lucide-react';

export default function AccountDetailsView({ setView }) {
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
