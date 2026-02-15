import React from 'react';
import { PhoneCall } from 'lucide-react';

export default function EditReceptionistModal({
    onClose,
    personality,
    setPersonality,
    voiceOptions,
    session,
    supabase,
    syncAssistant
}) {
    return (
        <div className="absolute inset-0 z-[70] flex items-end justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="bg-white w-full h-[92%] rounded-t-[2.5rem] relative z-10 animate-in slide-in-from-bottom duration-300 flex flex-col p-6 shadow-2xl overflow-y-auto">
                <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6 shrink-0"></div>

                {/* Title */}
                <h2 className="text-xl font-black text-gray-900 text-center mb-8">Receptionist Profile</h2>

                {/* Avatar */}
                <div className="flex justify-center mb-8">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-xl bg-blue-50">
                        <img
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${personality.name}&backgroundColor=b6e3f4`}
                            alt={personality.name}
                            className="w-full h-full object-cover"
                        />
                    </div>
                </div>

                {/* Form */}
                <div className="space-y-6">
                    {/* Name Input */}
                    <div>
                        <label className="block text-base font-bold text-gray-900 mb-2">Name</label>
                        <input
                            type="text"
                            value={personality.name === "Assistant" ? "" : personality.name}
                            placeholder="Assistant Name"
                            onChange={(e) => setPersonality({ ...personality, name: e.target.value })}
                            onBlur={async () => {
                                await supabase.from('business_profiles')
                                    .update({ assistant_name: personality.name })
                                    .eq('owner_user_id', session.user.id);
                                syncAssistant();
                            }}
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-4 text-base font-medium text-gray-900 outline-none focus:ring-2 focus:ring-blue-400/20 active:scale-[0.99] transition-all"
                        />
                    </div>

                    {/* Voice Selection */}
                    <div>
                        <label className="block text-base font-bold text-gray-900 mb-2">Voice</label>
                        <div className="grid grid-cols-2 gap-3">
                            {voiceOptions.map(v => (
                                <button
                                    key={v.id}
                                    onClick={async () => {
                                        // 1. Update (Optimistic) UI
                                        setPersonality(prev => ({ ...prev, voiceId: v.id }));

                                        // 2. Play Preview
                                        try {
                                            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ""}/api/voice-preview`, {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ voiceId: v.id, text: "Hello! I am your new receptionist." })
                                            });
                                            if (res.ok) {
                                                const blob = await res.blob();
                                                const audio = new Audio(URL.createObjectURL(blob));
                                                audio.play();
                                            }
                                        } catch (e) {
                                            console.error("Preview failed", e);
                                        }

                                        // 3. PERSIST via Server (Trusted)
                                        console.log("Saving voice_id via Backend API...", v.id);
                                        try {
                                            const persistRes = await fetch(`${import.meta.env.VITE_API_BASE_URL || ""}/api/save-voice`, {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ userId: session.user.id, voiceId: v.id })
                                            });
                                            const pData = await persistRes.json();
                                            if (!persistRes.ok) console.error("Persist API Failed:", pData);
                                            else console.log("✅ DB Persisted via Server");
                                        } catch (persistErr) {
                                            console.error("Persist Network Error:", persistErr);
                                        }

                                        // 4. SYNC to Vapi
                                        syncAssistant(v.id);
                                    }}
                                    className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden ${personality.voiceId === v.id ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                                >
                                    <div className="font-bold text-gray-900 text-sm mb-0.5 relative z-10">{v.name}</div>
                                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider relative z-10">
                                        {v.provider === '11labs' ? 'Standard' : 'Premium'}
                                    </div>
                                    {personality.voiceId === v.id && (
                                        <div className="absolute top-2 right-2 text-blue-500 z-10">
                                            <div className="w-2 h-2 rounded-full bg-current shadow-sm animate-pulse" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Demo Section */}
                    <div>
                        <label className="block text-base font-bold text-gray-900 mb-2">Demo</label>
                        <button className="w-full bg-white border border-gray-200 rounded-xl px-4 py-4 flex items-center justify-center gap-3 text-base font-bold text-gray-900 hover:bg-gray-50 active:scale-[0.99] transition-all shadow-sm">
                            <PhoneCall size={20} className="text-gray-400 fill-current" />
                            Call {personality.name}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
