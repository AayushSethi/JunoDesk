import React, { useState } from 'react';
import {
    RefreshCw, Phone, UserPlus, Share2, Archive, Inbox,
    Trash2, Play, Pause, ChevronDown, ChevronRight, CalendarCheck,
    Search, Calendar, Plus, FileText, Sparkles
} from 'lucide-react';

export default function InboxView({
    view,
    calls,
    setCalls,
    activeInboxTab,
    setActiveInboxTab,
    authLoading,
    personality,
    voiceOptions,
    isReceptionistActive,
    handleArchiveCall,
    handleUnarchiveCall,
    handleDeleteCall,
    playingVoiceId,
    setPlayingVoiceId,
    audioProgress,
    setAudioProgress,
    showToast,
    fetchCalls,
    session,
    supabase,
    expandedCallId,
    setExpandedCallId,
    showTranscript,
    setShowTranscript
}) {
    if (view !== 'inbox') return null;

    // Helper: Date Formatter
    const fmtDate = (d) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const now = new Date(); // Current time

    const visibleCalls = calls.filter(c => {
        if (activeInboxTab === 'inbox') return !c.isSpam && !c.isArchived;
        if (activeInboxTab === 'unread') return !c.isSpam && !c.isArchived && (!c.isRead || expandedCallId === c.id);
        if (activeInboxTab === 'archived') return c.isArchived;
        return false;
    });

    const grouped = visibleCalls.reduce((acc, call) => {
        const date = new Date(call.rawTime);

        // Reset hours to start of day for accurate day comparison
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfCallDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

        const diffTime = startOfToday - startOfCallDate;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        let label = "Older";

        if (diffDays === 0) label = "Today";
        else if (diffDays === 1) label = "Yesterday";
        else if (diffDays < 7) {
            // For individual days up to a week, show exact date (e.g., "Feb 5")
            label = fmtDate(date);
        }
        else if (diffDays < 14) label = "2 Weeks Ago";
        else if (diffDays < 30) label = "Last 30 Days";

        if (!acc[label]) acc[label] = [];
        acc[label].push(call);
        return acc;
    }, {});

    // Generate dynamic order keys based on what we found (plus fixed ones)
    // We want: Today, Yesterday, [Dynamic Dates descending], 2 Weeks Ago, Last 30 Days, Older

    // Get all keys that are purely dates (not special labels)
    const dateKeys = Object.keys(grouped).filter(k =>
        k !== "Today" && k !== "Yesterday" && k !== "2 Weeks Ago" && k !== "Last 30 Days" && k !== "Older"
    );

    // Sort date keys descending (newest first)
    dateKeys.sort((a, b) => new Date(b + ` ${now.getFullYear()}`) - new Date(a + ` ${now.getFullYear()}`));

    const order = ["Today", "Yesterday", ...dateKeys, "2 Weeks Ago", "Last 30 Days", "Older"];

    return (
        <div className="flex flex-col h-full bg-white overflow-y-auto no-scrollbar animate-in fade-in duration-500" >
            {/* --- Header Section (Centered Branding) --- */}
            < div className="pt-10 pb-6 px-6 flex justify-center items-center shrink-0 z-20" >
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

            <header className="px-6 flex flex-col space-y-6 shrink-0">

                {/* --- Status Cards Grid --- */}
                <div className="grid grid-cols-2 gap-3">
                    <button className="flex items-center p-3 bg-[#F0F7FF] border border-[#D1E9FF] rounded-2xl text-left transition-all active:scale-95">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center mr-3 shadow-sm">
                            <div className={`w-2.5 h-2.5 rounded-full ${isReceptionistActive ? 'bg-[#007FFF] animate-pulse shadow-[0_0_8px_#007FFF]' : 'bg-gray-400'}`}></div>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-[#0047AB] uppercase tracking-wider">AI Status</p>
                            <p className="text-sm font-bold text-slate-800">{isReceptionistActive ? 'AI Active' : 'Offline'}</p>
                        </div>
                    </button>
                    <button className="flex items-center p-3 bg-slate-50 border border-slate-200 rounded-2xl text-left transition-all active:scale-95">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center mr-3 shadow-sm text-slate-400">
                            <Calendar size={18} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Schedule</p>
                            <p className="text-sm font-bold text-slate-800">Calendar</p>
                        </div>
                    </button>
                </div>

                {/* --- Navigation Tabs (Underline Style) --- */}
                <nav className="flex space-x-6 pt-2">
                    {['inbox', 'unread', 'archived'].map(tab => {
                        const isActive = activeInboxTab === tab;
                        const label = tab === 'inbox' ? 'All' : tab.charAt(0).toUpperCase() + tab.slice(1);
                        return (
                            <button
                                key={tab}
                                onClick={() => setActiveInboxTab(tab)}
                                className={`pb-3 relative text-sm font-bold transition-all ${isActive ? 'text-[#0047AB]' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {label}
                                {isActive && (
                                    <span className="absolute bottom-0 left-0 w-full h-[3px] bg-[#0047AB] rounded-t-full animate-in slide-in-from-bottom-1"></span>
                                )}
                            </button>
                        );
                    })}
                </nav>
                <div className="h-[1px] bg-slate-100 -mx-6"></div>
            </header>

            {/* --- Main Content (Calls List) --- */}
            <main className="flex-1 overflow-y-auto no-scrollbar px-6">
                {authLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
                        <RefreshCw className="animate-spin" size={24} />
                        <span className="text-sm font-medium">Loading calls...</span>
                    </div>
                ) : visibleCalls.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-slate-400 text-sm font-medium">No calls in this view</p>
                    </div>
                ) : order.map(groupLabel => {
                    if (!grouped[groupLabel] || grouped[groupLabel].length === 0) return null;
                    return (
                        <div key={groupLabel} className="pt-6">
                            <h3 className="text-[#0047AB] font-bold text-[11px] uppercase tracking-widest px-1 mb-2">
                                {groupLabel}
                            </h3>
                            <div className="divide-y divide-slate-100">
                                {grouped[groupLabel].map(call => {
                                    const isExpanded = expandedCallId === call.id;
                                    const isUnread = !call.isRead;
                                    const timeStr = new Date(call.rawTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

                                    return (
                                        <div
                                            key={call.id}
                                            onClick={async () => {
                                                const isCurrentlyExpanded = expandedCallId === call.id;
                                                setExpandedCallId(isCurrentlyExpanded ? null : call.id);
                                                setShowTranscript(false);

                                                if (!isCurrentlyExpanded && !call.isRead) {
                                                    setCalls(prev => prev.map(c => c.id === call.id ? { ...c, isRead: true } : c));
                                                    try {
                                                        await supabase.from('calls').update({ is_read: true }).eq('id', call.id);
                                                    } catch (err) { console.error(err); }
                                                }
                                            }}
                                            className="group cursor-pointer"
                                        >
                                            <div className={`py-3 transition-all duration-300 ${isExpanded ? 'px-4 -mx-4 rounded-3xl bg-[#F0F7FF] shadow-sm ring-1 ring-[#D1E9FF]/50 my-2' : ''}`}>
                                                {/* --- Call Info Row --- */}
                                                <div className="flex justify-between items-start mb-0.5">
                                                    <div className="flex-1">
                                                        <h3 className={`text-[17px] font-bold tracking-tight flex items-center gap-2 ${isUnread ? 'text-[#1A1C1E]' : 'text-slate-600'}`}>
                                                            {call.name === "Unknown Caller" ? call.number : call.name}
                                                            {isUnread && (
                                                                <span className="w-2 h-2 bg-[#007FFF] rounded-full shrink-0 mt-0.5"></span>
                                                            )}
                                                        </h3>
                                                    </div>
                                                    <span className="text-[13px] font-semibold text-slate-400 tabular-nums">
                                                        {timeStr}
                                                    </span>
                                                </div>

                                                {/* Booking Status Pill - Subtle Refinement */}
                                                {call.actionItem && (
                                                    <div
                                                        className="mb-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full
                                                            bg-gray-100 border border-gray-200 
                                                            text-gray-900 text-[10px] font-bold tracking-tight
                                                            hover:bg-gray-200 transition-all cursor-pointer group/pill"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (call.actionItem.link) window.open(call.actionItem.link, "_blank");
                                                        }}
                                                    >
                                                        <CalendarCheck size={10} strokeWidth={3} />
                                                        <span className="whitespace-nowrap">Booked · {call.actionItem.displayTime}</span>
                                                    </div>
                                                )}

                                                {/* --- Summary Peek (Collapsed) --- */}
                                                {!isExpanded && (
                                                    <div className="flex items-center gap-2 px-1">
                                                        <Sparkles size={14} className="text-[#007FFF]" />
                                                        <p className="text-[13px] text-slate-500 font-medium truncate">
                                                            {call.summary}
                                                        </p>
                                                    </div>
                                                )}

                                                {/* --- Expanded Detail --- */}
                                                {isExpanded && (
                                                    <div className="mt-1 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                                        <div className="p-3 rounded-2xl bg-white border border-[#D1E9FF] shadow-sm">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <Sparkles size={14} className="text-[#007FFF]" />
                                                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#0047AB]">AI Assistant Summary</span>
                                                            </div>
                                                            <p className="text-[14px] leading-relaxed text-slate-700 font-medium">
                                                                {call.summary}
                                                            </p>
                                                        </div>

                                                        {/* Actions Layout (Per Request) */}
                                                        <div className="flex items-center gap-2 mb-2 w-full">
                                                            <button
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="bg-[#007FFF] text-white px-3 py-2 rounded-full font-bold text-xs flex items-center gap-2 shadow-lg shadow-[#007FFF]/20 active:scale-95 transition-all"
                                                            >
                                                                <Phone size={14} fill="white" /> Call
                                                            </button>
                                                            <button
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="bg-white border border-slate-100 text-slate-700 px-3 py-2 rounded-full font-bold text-xs flex items-center gap-2 shadow-sm active:scale-95 transition-all"
                                                            >
                                                                <UserPlus size={14} /> Add
                                                            </button>

                                                            <div className="flex gap-1.5 ml-auto">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); showToast("Sharing..."); }}
                                                                    className="w-10 h-10 bg-white shadow-sm rounded-full flex items-center justify-center text-slate-400 border border-slate-50 hover:bg-slate-50 transition-colors"
                                                                >
                                                                    <Share2 size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (call.isArchived) handleUnarchiveCall(call.id);
                                                                        else handleArchiveCall(call.id);
                                                                    }}
                                                                    className="w-10 h-10 bg-white shadow-sm rounded-full flex items-center justify-center text-slate-400 border border-slate-50 hover:bg-slate-50 transition-colors"
                                                                >
                                                                    <Archive size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleDeleteCall(call.id); }}
                                                                    className="w-10 h-10 bg-white shadow-sm rounded-full flex items-center justify-center text-slate-400 border border-slate-50 hover:bg-red-50 hover:text-red-500 transition-colors"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Audio & Transcript Section - Compact & Integrated */}
                                                        <div className="space-y-3 mt-1" onClick={(e) => e.stopPropagation()}>
                                                            {/* Integrated Audio Player Component */}
                                                            {call.recordingUrl && (
                                                                <RecordingPlayer
                                                                    recordingUrl={call.recordingUrl}
                                                                    callId={call.id}
                                                                    playingVoiceId={playingVoiceId}
                                                                    setPlayingVoiceId={setPlayingVoiceId}
                                                                    audioProgress={audioProgress}
                                                                    setAudioProgress={setAudioProgress}
                                                                />
                                                            )}

                                                            {/* Minimalist Transcript Toggle */}
                                                            <button
                                                                onClick={() => { setShowTranscript(!showTranscript); }}
                                                                className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-[#007FFF] transition-colors"
                                                            >
                                                                <FileText size={12} /> {showTranscript ? 'Hide' : 'View'} Transcript
                                                                <ChevronDown size={10} className={`transition-transform duration-300 ${showTranscript ? 'rotate-180' : ''}`} />
                                                            </button>

                                                            {showTranscript && (
                                                                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl max-h-48 overflow-y-auto no-scrollbar animate-in slide-in-from-top-1">
                                                                    {call.transcript ? (
                                                                        <div className="space-y-2.5">
                                                                            {call.transcript.split(/(?=AI:|Guest:|User:)/g).map((msg, i) => {
                                                                                const isAI = msg.trim().startsWith("AI:");
                                                                                const sender = isAI ? "Receptionist" : "Guest";
                                                                                const content = msg.replace(/^(AI:|Guest:|User:)/i, '').trim();
                                                                                if (!content) return null;
                                                                                return (
                                                                                    <div key={i} className={`flex flex-col ${isAI ? 'items-start text-left' : 'items-end text-right'}`}>
                                                                                        <span className={`text-[10px] font-black uppercase tracking-wider mb-0.5 ${isAI ? 'text-blue-500' : 'text-slate-400'}`}>
                                                                                            {sender}
                                                                                        </span>
                                                                                        <span className={`text-sm font-medium leading-relaxed max-w-[85%] ${isAI ? 'text-slate-700' : 'text-slate-600'}`}>
                                                                                            {content}
                                                                                        </span>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    ) : (
                                                                        <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest text-center py-1">No Transcript</p>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
                <div className="h-40"></div>
            </main>
        </div>
    );
}

// --- Isolated Recording Player Component ---
function RecordingPlayer({ recordingUrl, callId, playingVoiceId, setPlayingVoiceId, setAudioProgress }) {
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const isActive = playingVoiceId === callId;

    const formatTime = (time) => {
        if (isNaN(time)) return "0:00";
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className="flex items-center gap-3 py-1">
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    const audioId = `audio-${callId}`;
                    const audioEl = document.getElementById(audioId);
                    if (audioEl) {
                        if (audioEl.paused) {
                            // Stop other playing audios
                            document.querySelectorAll('audio').forEach(el => {
                                if (el.id !== audioId) el.pause();
                            });
                            audioEl.play();
                            setPlayingVoiceId(callId);
                        } else {
                            audioEl.pause();
                            setPlayingVoiceId(null);
                        }
                    }
                }}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-90 ${isActive ? 'bg-[#007FFF]' : 'bg-slate-200 text-slate-600'}`}
            >
                {isActive ? <Pause size={12} fill="white" className="text-white" /> : <Play size={12} fill="currentColor" className="ml-0.5" />}
            </button>

            <div className="flex-1 flex flex-col gap-1">
                <div className="h-1 bg-slate-100 rounded-full overflow-hidden relative cursor-pointer"
                    onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        const percent = (e.clientX - rect.left) / rect.width;
                        const audioEl = document.getElementById(`audio-${callId}`);
                        if (audioEl) audioEl.currentTime = percent * audioEl.duration;
                    }}
                >
                    <div
                        className="h-full bg-[#007FFF] rounded-full transition-all duration-75"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
                <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-tighter text-slate-400 tabular-nums">
                    <span>{isActive ? 'Playing Recording' : 'Recording'}</span>
                    <span>{formatTime(currentTime || duration)}</span>
                </div>
            </div>

            <audio
                id={`audio-${callId}`}
                src={recordingUrl}
                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                onEnded={() => { setPlayingVoiceId(null); setAudioProgress(0); setCurrentTime(0); }}
                onTimeUpdate={(e) => {
                    setCurrentTime(e.currentTarget.currentTime);
                    if (isActive) {
                        const p = (e.currentTarget.currentTime / e.currentTarget.duration) * 100;
                        setAudioProgress(p || 0);
                    }
                }}
                className="hidden"
            />
        </div>
    );
}
