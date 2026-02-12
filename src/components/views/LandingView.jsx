import React from 'react';

export default function LandingView({ setView, setOnboardingStep, session, supabase }) {
    return (
        <div className="flex flex-col h-full items-center justify-between px-6 py-8 bg-gradient-to-b from-[#F5F6FA] via-[#EEF2FF] to-[#E6ECFF] relative">
            {/* Top Right - Log In Button & Logout if session exists */}
            <div className="w-full flex justify-end gap-3">
                {session && (
                    <button
                        onClick={() => supabase.auth.signOut()}
                        className="px-6 py-2.5 bg-gray-100 border border-gray-200 rounded-full text-gray-600 font-bold text-sm hover:bg-gray-200 transition-all"
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

            {/* Center Section - Logo & Title */}
            <div className="flex-1 flex flex-col items-center justify-center text-center w-full max-w-md">
                {/* Logo - No Background */}
                <div className="mb-12">
                    <img src="/pics/JunoDesk_Logo.svg" alt="JunoDesk" className="w-32 h-32" />
                </div>

                {/* Title */}
                <h1 className="text-5xl font-black mb-4 tracking-tight text-center leading-tight">
                    Welcome to<br />
                    <span className="text-gray-900">Juno</span><span className="text-blue-600">Desk</span>
                </h1>
                <p className="text-black/80 text-lg font-medium leading-relaxed px-8 mb-12">
                    Your AI receptionist that never misses a call.
                </p>

                {/* Bottom Section - Get Started Button */}
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
            </div>
        </div>
    );
}
