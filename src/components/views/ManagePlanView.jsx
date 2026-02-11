import React from 'react';
import { ChevronLeft, Check } from 'lucide-react';

export default function ManagePlanView({ setView, activePlan, setActivePlan }) {
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
