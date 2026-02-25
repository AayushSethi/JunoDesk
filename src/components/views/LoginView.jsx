import React from 'react';
import { ArrowRight } from 'lucide-react';

export default function LoginView({
    showOtpInput,
    setShowOtpInput,
    authPhone,
    setAuthPhone,
    authPassword,
    setAuthPassword,
    otpCode,
    setOtpCode,
    authError,
    setAuthError,
    authLoading,
    loginMethod,
    setLoginMethod,
    handleVerifyOtp,
    handlePasswordLogin,
    handleSendOtp,
    setView
}) {
    return (
        <div className="flex flex-col h-full items-center justify-between px-6 pb-8 pt-[max(2.5rem,env(safe-area-inset-top))] bg-gradient-to-b from-[#F5F6FA] via-[#EEF2FF] to-[#E6ECFF] relative overflow-hidden">
            {/* Background Decorative Rings */}
            <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] bg-blue-400/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-[-5%] left-[-10%] w-[300px] h-[300px] bg-indigo-400/10 rounded-full blur-3xl pointer-events-none"></div>

            {/* Top Right - Back Button */}
            <div className="w-full flex justify-end z-10 sticky top-0">
                <button
                    onClick={() => {
                        if (showOtpInput) {
                            setShowOtpInput(false);
                        } else {
                            setView('auth');
                        }
                        setAuthError(null);
                    }}
                    className="px-6 py-2.5 bg-white/60 backdrop-blur-md border border-gray-200/50 rounded-full text-gray-700 font-bold text-sm hover:bg-white/80 active:scale-95 transition-all duration-200 shadow-sm"
                >
                    {showOtpInput ? 'Change Number' : '← Back'}
                </button>
            </div>

            {/* Center Section - Login Form */}
            <div className="flex-1 flex flex-col items-center justify-center text-center w-full max-w-md z-10 mt-16 pb-12">
                {/* Logo */}
                <div className="mb-8">
                    <img src="/pics/JunoDesk_Logo.svg" alt="JunoDesk" className="w-20 h-20" />
                </div>

                {/* Title */}
                <h2 className="text-4xl font-black text-gray-900 mb-2">
                    {showOtpInput ? 'Enter Code' : 'Welcome back'}
                </h2>
                <p className="text-gray-500 text-base font-medium mb-10">
                    {showOtpInput
                        ? `Verify the 6-digit code sent to ${authPhone}`
                        : <>Sign in to your <span className="text-gray-900 font-bold">Juno</span><span className="text-blue-600 font-bold">Desk</span></>
                    }
                </p>

                {/* Login Method Toggle */}
                {!showOtpInput && (
                    <div className="flex bg-gray-100/80 rounded-full p-1 mb-6 w-full max-w-xs mx-auto">
                        <button
                            onClick={() => { setLoginMethod('otp'); setAuthError(null); }}
                            className={`flex-1 py-2.5 rounded-full text-sm font-bold transition-all duration-200 ${loginMethod === 'otp' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                        >
                            Send Code
                        </button>
                        <button
                            onClick={() => { setLoginMethod('password'); setAuthError(null); }}
                            className={`flex-1 py-2.5 rounded-full text-sm font-bold transition-all duration-200 ${loginMethod === 'password' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                        >
                            Use Password
                        </button>
                    </div>
                )}

                {/* Login Card */}
                <div className="w-full bg-white/80 backdrop-blur-2xl rounded-[32px] p-8 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.1)] border border-white/50">
                    <div className="space-y-6">
                        {!showOtpInput ? (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4">
                                {/* Phone Input */}
                                <div>
                                    <div className="flex justify-between items-center mb-2 px-1">
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.1em]">Phone Number</label>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-[15px]">
                                            🇺🇸 +1
                                        </div>
                                        <input
                                            type="tel"
                                            value={authPhone}
                                            onChange={e => {
                                                const val = e.target.value.replace(/\D/g, '');
                                                if (val.length <= 10) setAuthPhone(val);
                                            }}
                                            className="w-full bg-gray-50/50 border-2 border-transparent rounded-[20px] pl-16 pr-4 py-5 text-[17px] font-bold text-gray-900 placeholder-gray-300 focus:bg-white focus:border-blue-500/10 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all duration-300"
                                            placeholder="(555) 000-0000"
                                        />
                                    </div>
                                </div>

                                {/* Password Input (only in password mode) */}
                                {loginMethod === 'password' && (
                                    <div>
                                        <div className="flex justify-between items-center mb-2 px-1">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.1em]">Password</label>
                                        </div>
                                        <input
                                            type="password"
                                            value={authPassword}
                                            onChange={e => setAuthPassword(e.target.value)}
                                            className="w-full bg-gray-50/50 border-2 border-transparent rounded-[20px] px-4 py-5 text-[17px] font-bold text-gray-900 placeholder-gray-300 focus:bg-white focus:border-blue-500/10 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all duration-300"
                                            placeholder="Enter your password"
                                        />
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* OTP Input */
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="flex justify-between items-center mb-2 px-1">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.1em]">Verification Code</label>
                                </div>
                                <input
                                    type="text"
                                    maxLength={6}
                                    value={otpCode}
                                    onChange={e => {
                                        const val = e.target.value.replace(/\D/g, '');
                                        if (val.length <= 6) setOtpCode(val);
                                    }}
                                    className="w-full bg-gray-50/50 border-2 border-transparent rounded-[20px] px-4 py-5 text-[24px] font-black text-gray-900 text-center tracking-[0.5em] placeholder-gray-200 focus:bg-white focus:border-blue-500/10 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all duration-300"
                                    placeholder="000000"
                                />
                            </div>
                        )}

                        {/* Error Message */}
                        {authError && (
                            <div className="bg-red-50/50 border border-red-100 p-4 rounded-2xl animate-in zoom-in-95 duration-200">
                                <p className="text-red-600 text-[13px] font-bold text-center leading-tight">{authError}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Section - Action Button */}
            <div className="w-full max-w-md z-10">
                <button
                    onClick={showOtpInput ? handleVerifyOtp : (loginMethod === 'password' ? handlePasswordLogin : handleSendOtp)}
                    disabled={authLoading}
                    className="w-full group bg-blue-600 text-white py-5 rounded-[24px] font-black text-lg tracking-wide shadow-[0_20px_50px_-15px_rgba(37,99,235,0.4)] hover:shadow-[0_25px_60px_-10px_rgba(37,99,235,0.5)] hover:bg-blue-700 active:scale-[0.98] transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden relative"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full duration-1000 transition-transform"></div>

                    {authLoading ? (
                        <span className="flex items-center justify-center gap-3">
                            <div className="w-5 h-5 border-[3px] border-white/30 border-t-white rounded-full animate-spin"></div>
                            Processing...
                        </span>
                    ) : (
                        <span className="flex items-center justify-center gap-2">
                            {showOtpInput ? 'Verify Account' : (loginMethod === 'password' ? 'Sign In' : 'Send Verification Code')}
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 duration-300 transition-transform" />
                        </span>
                    )}
                </button>

                {!showOtpInput && (
                    <p className="text-gray-400 text-[11px] font-bold uppercase tracking-wider text-center mt-6 px-10 leading-relaxed opacity-60">
                        By signing in, you agree to receive an automated verification text.
                    </p>
                )}
            </div>
        </div>
    );
}
