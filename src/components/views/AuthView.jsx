import React from 'react';
import { ArrowRight, ShieldAlert } from 'lucide-react';

export default function AuthView({
    loginMethod,
    setLoginMethod,
    authPhone,
    setAuthPhone,
    authPassword,
    setAuthPassword,
    otpCode,
    setOtpCode,
    showOtpInput,
    authError,
    authLoading,
    handleSendOtp,
    handleVerifyOtp,
    handlePasswordLogin
}) {
    return (
        <div className="flex flex-col h-full bg-[#1A1A1A] items-center px-8 relative overflow-hidden">
            {/* Background elements (glowing orbs) */}
            <div className="absolute top-[-10%] right-[-20%] w-[80%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full"></div>
            <div className="absolute bottom-[-10%] left-[-20%] w-[80%] h-[40%] bg-blue-900/10 blur-[120px] rounded-full"></div>

            <div className="flex-1 w-full flex flex-col justify-center items-center py-12 z-10">
                {/* Logo Section */}
                <div className="mb-12 text-center animate-in fade-in slide-in-from-top-4 duration-500">
                    <h1 className="text-5xl font-black tracking-tight text-white mb-3">
                        Juno<span className="text-blue-500">Desk</span>
                    </h1>
                    <p className="text-gray-400 font-bold text-xs uppercase tracking-[.25em] opacity-80">
                        The AI Receptionist
                    </p>
                </div>

                {/* Login Method Toggle */}
                {!showOtpInput && (
                    <div className="flex bg-gray-100/10 backdrop-blur-md rounded-full p-1 mb-8 w-full max-w-xs border border-white/5">
                        <button
                            onClick={() => { setLoginMethod('otp'); }}
                            className={`flex-1 py-3 rounded-full text-xs font-black transition-all duration-300 ${loginMethod === 'otp' ? 'bg-white text-gray-900 shadow-xl scale-100' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            SMS CODE
                        </button>
                        <button
                            onClick={() => { setLoginMethod('password'); }}
                            className={`flex-1 py-3 rounded-full text-xs font-black transition-all duration-300 ${loginMethod === 'password' ? 'bg-white text-gray-900 shadow-xl scale-100' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            PASSWORD
                        </button>
                    </div>
                )}

                {/* Login Card */}
                <div className="w-full max-w-sm space-y-6">
                    <div className="bg-white/5 backdrop-blur-2xl rounded-[32px] p-8 border border-white/10 shadow-2xl relative group">
                        {/* Glow effect on hover */}
                        <div className="absolute inset-0 bg-blue-500/5 blur-2xl rounded-[32px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                        <div className="relative space-y-6">
                            {!showOtpInput ? (
                                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-5">
                                    {/* Phone Input */}
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block px-1">Phone Number</label>
                                        <div className="relative">
                                            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 font-bold text-[16px] pointer-events-none">
                                                🇺🇸 +1
                                            </div>
                                            <input
                                                type="tel"
                                                value={authPhone}
                                                onChange={e => {
                                                    const val = e.target.value.replace(/\D/g, '');
                                                    if (val.length <= 10) setAuthPhone(val);
                                                }}
                                                className="w-full bg-white/5 border border-white/5 rounded-2xl pl-16 pr-5 py-5 text-[18px] font-bold text-white placeholder-white/20 focus:bg-white/10 focus:border-blue-500/30 outline-none transition-all duration-300"
                                                placeholder="(555) 000-0000"
                                            />
                                        </div>
                                    </div>

                                    {/* Password Input (only in password mode) */}
                                    {loginMethod === 'password' && (
                                        <div className="animate-in fade-in duration-300">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block px-1">Password</label>
                                            <input
                                                type="password"
                                                value={authPassword}
                                                onChange={e => setAuthPassword(e.target.value)}
                                                className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-5 text-[18px] font-bold text-white placeholder-white/20 focus:bg-white/10 focus:border-blue-500/30 outline-none transition-all duration-300"
                                                placeholder="Enter password"
                                            />
                                        </div>
                                    )}
                                </div>
                            ) : (
                                /* OTP Input */
                                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-5 block text-center">Verification Code</label>
                                    <input
                                        type="text"
                                        maxLength={6}
                                        value={otpCode}
                                        onChange={e => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            if (val.length <= 6) setOtpCode(val);
                                        }}
                                        className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-6 text-[28px] font-black text-white text-center tracking-[0.5em] focus:bg-white/10 focus:border-blue-500/30 outline-none transition-all duration-300"
                                        placeholder="000000"
                                    />
                                    <p className="text-gray-500 text-[11px] font-bold text-center mt-6">
                                        Check your messages for the code
                                    </p>
                                </div>
                            )}

                            {/* Error Message */}
                            {authError && (
                                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl animate-in shake duration-300">
                                    <div className="flex gap-3">
                                        <ShieldAlert size={16} className="text-red-400 shrink-0" />
                                        <p className="text-red-400 text-[13px] font-bold leading-tight">{authError}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={showOtpInput ? handleVerifyOtp : (loginMethod === 'password' ? handlePasswordLogin : handleSendOtp)}
                        disabled={authLoading}
                        className="w-full group bg-blue-600 text-white py-5 rounded-[24px] font-black text-lg tracking-wide shadow-2xl shadow-blue-600/20 hover:bg-blue-500 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full duration-1000 transition-transform"></div>

                        {authLoading ? (
                            <span className="flex items-center justify-center gap-3">
                                <div className="w-5 h-5 border-[3px] border-white/30 border-t-white rounded-full animate-spin"></div>
                                SECURING...
                            </span>
                        ) : (
                            <span className="flex items-center justify-center gap-2">
                                {showOtpInput ? 'FINALIZE' : (loginMethod === 'password' ? 'ENTER DASHBOARD' : 'GET ACCESS CODE')}
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 duration-300 transition-transform" />
                            </span>
                        )}
                    </button>

                    {!showOtpInput && (
                        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest text-center mt-6 px-10 leading-relaxed opacity-40">
                            Secure single-use authentication
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
