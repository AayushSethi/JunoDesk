import React from 'react';

export default function LandingView({ setView, setOnboardingStep, session, supabase }) {
    return (
        <div className="bg-gradient-to-b from-[#F5F6FA] via-[#EEF2FF] to-[#E6ECFF] text-slate-900 min-h-screen flex flex-col font-sans overflow-hidden relative pb-[max(2rem,env(safe-area-inset-bottom))]">

            {/* Subtle Background Gradient for Depth */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px]"></div>
                <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[100px]"></div>
            </div>

            {/* Main Container */}
            <div className="relative flex flex-col flex-1 px-8 pt-[max(2rem,env(safe-area-inset-top))] h-full">

                {/* Top Right - Log In Button & Logout if session exists */}
                <div className="w-full flex justify-end gap-3 z-20 absolute top-6 right-6 lg:right-10">
                    {session && (
                        <button
                            onClick={() => supabase.auth.signOut()}
                            className="px-5 py-2 bg-white/50 backdrop-blur-md border border-gray-200 rounded-full text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-all"
                        >
                            Logout
                        </button>
                    )}
                    <button
                        onClick={() => setView('login')}
                        className="px-6 py-2.5 bg-blue-600 backdrop-blur-md border border-blue-500/50 rounded-full text-white font-semibold text-sm hover:bg-blue-700 active:scale-95 transition-all duration-200 shadow-lg shadow-blue-600/30"
                    >
                        Log in
                    </button>
                </div>

                {/* Header / Logo */}
                <header className="pt-12 px-6 flex justify-center items-center z-10 w-full mt-4">
                    <div className="flex items-center gap-3">
                        <img src="/pics/JunoDesk_Logo.svg" alt="JunoDesk" className="w-8 h-8" />
                        <h1 className="text-3xl font-black tracking-tighter">
                            <span className="text-gray-900">Juno</span><span className="text-blue-600">Desk</span>
                        </h1>
                    </div>
                </header>

                {/* Central AI Orb Section */}
                <main className="flex-1 flex flex-col items-center justify-center z-10 w-full mb-10 mt-6 lg:mt-12">
                    <div className="relative">
                        {/* Outer Rings (Animated) */}
                        <div className="absolute inset-0 rounded-full border border-blue-500/30 scale-[1.7] animate-[ping_3s_ease-in-out_infinite] opacity-50"></div>

                        <div className="absolute inset-0 rounded-full border border-blue-500/40 scale-[1.4]"></div>
                        <div className="absolute inset-0 rounded-full border border-blue-500/20 scale-[2.0]"></div>

                        {/* The Orb */}
                        <div className="relative w-36 h-36 rounded-full flex items-center justify-center overflow-hidden z-10 transition-transform duration-700 hover:scale-105"
                            style={{
                                boxShadow: '0 0 60px 10px rgba(37, 99, 235, 0.4)',
                                background: 'radial-gradient(circle at 30% 30%, #ffffff 0%, #2563eb 60%, #1e3a8a 100%)'
                            }}>
                            {/* Subtle shimmer effect */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent"></div>
                        </div>

                        {/* Label for the AI */}
                        <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 text-center w-full z-10">
                            <span className="text-xs font-black tracking-[0.2em] text-blue-600 uppercase">Juno AI Active</span>
                        </div>
                    </div>
                </main>

                {/* Footer / Call to Action */}
                <footer className="pb-8 flex flex-col items-center text-center z-10 mt-auto">
                    <div className="space-y-4 mb-10 max-w-[300px]">
                        <h2 className="text-3xl font-bold leading-tight text-slate-900 tracking-tight">
                            Welcome to the future of front desk management
                        </h2>
                        <p className="text-slate-500 font-medium text-[15px] leading-relaxed px-2">
                            Your AI receptionist that never misses a call.
                        </p>
                    </div>

                    <div className="w-full max-w-md">
                        <button
                            onClick={() => {
                                setView('onboarding');
                                setOnboardingStep(0);
                            }}
                            className="w-full bg-blue-600 text-white py-5 rounded-full font-black text-lg tracking-wide shadow-[0_20px_60px_-15px_rgba(37,99,235,0.8)] hover:shadow-[0_25px_80px_-10px_rgba(37,99,235,0.9)] hover:bg-blue-700 active:scale-[0.97] transition-all duration-300"
                        >
                            <span className="relative drop-shadow-[0_0_12px_rgba(147,197,253,0.9)]">
                                Get Started
                            </span>
                        </button>
                    </div>

                    <div className="mt-8 flex items-center justify-center space-x-6">
                        <a className="text-[13px] font-medium text-slate-400 hover:text-blue-600 transition-colors" href="#">Privacy Policy</a>
                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                        <a className="text-[13px] font-medium text-slate-400 hover:text-blue-600 transition-colors" href="#">Support</a>
                    </div>
                </footer>
            </div>
        </div>
    );
}
