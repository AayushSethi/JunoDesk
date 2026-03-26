import React, { useState } from 'react';
import {
    RefreshCw, Phone, UserPlus, Share2, Archive,
    Trash2, Play, Pause, ChevronDown, CalendarCheck,
    FileText, Sparkles, MessageSquare, Send
} from 'lucide-react';

export default function InboxView({
    view,
    calls,
    setCalls,
    activeInboxTab,
    setActiveInboxTab,
    authLoading,
    isReceptionistActive,
    handleArchiveCall,
    handleUnarchiveCall,
    handleDeleteCall,
    playingVoiceId,
    setPlayingVoiceId,
    audioProgress,
    setAudioProgress,
    showToast,
    supabase,
    expandedCallId,
    setExpandedCallId,
    showTranscript,
    setShowTranscript,
    userInfo,
    openCallDetail
}) {
    if (view !== 'inbox') return null;

    const [mainTab, setMainTab] = useState('calls'); // 'calls' or 'texts'
    const [chats, setChats] = useState([]);
    const [loadingChats, setLoadingChats] = useState(false);

    // Fetch Chats when Texts tab is active
    React.useEffect(() => {
        if (mainTab === 'texts' && userInfo?.profileId) {
            setLoadingChats(true);
            const fetchChats = async () => {
                try {
                    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/chats?userId=${userInfo.profileId}`);
                    const data = await res.json();
                    if (data.success) {
                        setChats(data.conversations);
                    }
                } catch (err) {
                    console.error("Failed to fetch chats:", err);
                } finally {
                    setLoadingChats(false);
                }
            };
            fetchChats();
        }
    }, [mainTab, userInfo]);

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

        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfCallDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

        const diffTime = startOfToday - startOfCallDate;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        let label = fmtDate(date); // Default to actual date (e.g. "Mon, Feb 17")

        if (diffDays === 0) label = "Today";
        else if (diffDays === 1) label = "Yesterday";

        if (!acc[label]) acc[label] = [];
        acc[label].push(call);
        return acc;
    }, {});

    const dateKeys = Object.keys(grouped).filter(k => k !== "Today" && k !== "Yesterday");

    // Sort dates descending
    dateKeys.sort((a, b) => new Date(b) - new Date(a));
    const order = ["Today", "Yesterday", ...dateKeys];

    return (
        <div className="flex flex-col h-full bg-white overflow-y-auto no-scrollbar animate-in fade-in duration-500">
            {/* Header */}
            <div className="pb-5 px-6 flex justify-center items-center shrink-0 z-20 pt-[max(2.5rem,env(safe-area-inset-top))]">
                <div className="flex bg-gray-100 p-1 rounded-full items-center">
                    <button 
                        onClick={() => setMainTab('calls')}
                        className={`px-4 py-1.5 rounded-full text-[13px] font-extrabold tracking-tight transition-all ${mainTab === 'calls' ? 'bg-white shadow-sm text-gray-950' : 'text-gray-500 hover:text-gray-800'}`}
                    >
                        Calls
                    </button>
                    <button 
                        onClick={() => setMainTab('texts')}
                        className={`px-4 py-1.5 rounded-full text-[13px] font-extrabold tracking-tight transition-all ${mainTab === 'texts' ? 'bg-white shadow-sm text-gray-950' : 'text-gray-500 hover:text-gray-800'}`}
                    >
                        Texts
                    </button>
                </div>
            </div>

            {mainTab === 'calls' ? (
                <>
                <header className="px-6 flex flex-col space-y-4 shrink-0">
                {/* Status Cards */}
                <div className="grid grid-cols-2 gap-3">
                    <button className="flex flex-col p-2.5 bg-white border border-gray-200 rounded-xl text-left shadow-sm transition-all active:scale-95">
                        <p className="text-[11px] font-semibold text-gray-500 mb-1.5">AI Receptionist Status</p>
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${isReceptionistActive ? 'bg-green-500' : 'bg-red-500'}`} />
                            <p className="text-sm font-extrabold text-gray-950">{isReceptionistActive ? 'Online' : 'Offline'}</p>
                        </div>
                    </button>

                    <button
                        className="flex flex-col p-2.5 bg-white border border-gray-200 rounded-xl text-left shadow-sm transition-all active:scale-95"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (userInfo?.google_access_token) {
                                const calendarId = userInfo.google_calendar_id || 'primary';
                                const url = `https://calendar.google.com/calendar/u/0/r?cid=${encodeURIComponent(calendarId)}`;
                                window.open(url, '_blank', 'noopener');
                            } else {
                                showToast('Connect Google Calendar in Receptionist → Instructions tab');
                            }
                        }}
                    >
                        <p className="text-[11px] font-semibold text-gray-500 mb-1.5">Calendar Status</p>
                        <div className="flex items-center gap-2">
                            <svg viewBox="0 0 200 200" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                                <path fill="#FFFFFF" d="M148.882,43.618l-47.368-5.263l-57.895,5.263L38.355,96.25l5.263,52.632l52.632,6.579l52.632-6.579l5.263-53.947L148.882,43.618z" />
                                <path fill="#1A73E8" d="M65.211,125.276c-3.934-2.658-6.658-6.539-8.145-11.671l9.132-3.763c0.829,3.158,2.276,5.605,4.342,7.342c2.053,1.737,4.553,2.592,7.474,2.592c2.987,0,5.553-0.908,7.697-2.724s3.224-4.132,3.224-6.934c0-2.868-1.132-5.211-3.395-7.026s-5.105-2.724-8.5-2.724h-5.276v-9.039H76.5c2.921,0,5.382-0.789,7.382-2.368c2-1.579,3-3.737,3-6.487c0-2.447-0.895-4.395-2.684-5.855s-4.053-2.197-6.803-2.197c-2.684,0-4.816,0.711-6.395,2.145s-2.724,3.197-3.447,5.276l-9.039-3.763c1.197-3.395,3.395-6.395,6.618-8.987c3.224-2.592,7.342-3.895,12.342-3.895c3.697,0,7.026,0.711,9.974,2.145c2.947,1.434,5.263,3.421,6.934,5.947c1.671,2.539,2.5,5.382,2.5,8.539c0,3.224-0.776,5.947-2.329,8.184c-1.553,2.237-3.461,3.947-5.724,5.145v0.539c2.987,1.25,5.421,3.158,7.342,5.724c1.908,2.566,2.868,5.632,2.868,9.211s-0.908,6.776-2.724,9.579c-1.816,2.803-4.329,5.013-7.513,6.618c-3.197,1.605-6.789,2.421-10.776,2.421C73.408,129.263,69.145,127.934,65.211,125.276z" />
                                <path fill="#1A73E8" d="M121.25,79.961l-9.974,7.25l-5.013-7.605l17.987-12.974h6.895v61.197h-9.895L121.25,79.961z" />
                                <path fill="#EA4335" d="M148.882,196.25l47.368-47.368l-23.684-10.526l-23.684,10.526l-10.526,23.684L148.882,196.25z" />
                                <path fill="#34A853" d="M33.092,172.566l10.526,23.684h105.263v-47.368H43.618L33.092,172.566z" />
                                <path fill="#4285F4" d="M12.039-3.75C3.316-3.75-3.75,3.316-3.75,12.039v136.842l23.684,10.526l23.684-10.526V43.618h105.263l10.526-23.684L148.882-3.75H12.039z" />
                                <path fill="#188038" d="M-3.75,148.882v31.579c0,8.724,7.066,15.789,15.789,15.789h31.579v-47.368H-3.75z" />
                                <path fill="#FBBC04" d="M148.882,43.618v105.263h47.368V43.618l-23.684-10.526L148.882,43.618z" />
                                <path fill="#1967D2" d="M196.25,43.618V12.039c0-8.724-7.066-15.789-15.789-15.789h-31.579v47.368H196.25z" />
                            </svg>
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${userInfo?.google_access_token ? 'bg-green-500' : 'bg-red-500'}`} />
                                <p className="text-sm font-extrabold text-gray-950">{userInfo?.google_access_token ? 'Online' : 'Offline'}</p>
                            </div>
                        </div>
                    </button>
                </div>

                {/* Tabs */}
                <nav className="flex space-x-6 pt-1">
                    {['inbox', 'unread', 'archived'].map(tab => {
                        const isActive = activeInboxTab === tab;
                        const label = tab === 'inbox' ? 'All' : tab.charAt(0).toUpperCase() + tab.slice(1);
                        return (
                            <button
                                key={tab}
                                onClick={() => setActiveInboxTab(tab)}
                                className={`pb-3 relative text-sm font-extrabold transition-all ${isActive ? 'text-gray-950' : 'text-gray-400 hover:text-gray-700'
                                    }`}
                            >
                                {label}
                                {isActive && (
                                    <span className="absolute bottom-0 left-0 w-full h-[3px] bg-blue-600 rounded-t-full animate-in slide-in-from-bottom-1" />
                                )}
                            </button>
                        );
                    })}
                </nav>
                <div className="h-px bg-gray-200 -mx-6" />
            </header>

            {/* Main */}
            <main className="flex-1 overflow-y-auto no-scrollbar px-6">
                {authLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-4">
                        <RefreshCw className="animate-spin" size={24} />
                        <span className="text-sm font-semibold">Loading calls...</span>
                    </div>
                ) : visibleCalls.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-gray-500 text-sm font-semibold">No calls in this view</p>
                    </div>
                ) : order.map(groupLabel => {
                    if (!grouped[groupLabel] || grouped[groupLabel].length === 0) return null;
                    return (
                        <div key={groupLabel} className="pt-5">
                            <h3 className="text-blue-600 font-extrabold text-[10px] uppercase tracking-widest px-1 mb-2">
                                {groupLabel}
                            </h3>
                            <div className="divide-y divide-gray-200">
                                {grouped[groupLabel].map(call => {
                                    const isExpanded = expandedCallId === call.id;
                                    const isUnread = !call.isRead;
                                    const timeStr = new Date(call.rawTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

                                    return (
                                        <div
                                            key={call.id}
                                            onClick={async () => {
                                                if (!call.isRead) {
                                                    setCalls(prev => prev.map(c => c.id === call.id ? { ...c, isRead: true } : c));
                                                    try {
                                                        await supabase.from('calls').update({ is_read: true }).eq('id', call.id);
                                                    } catch (err) { console.error(err); }
                                                }
                                                if (openCallDetail) openCallDetail(call);
                                            }}
                                            className="group cursor-pointer"
                                        >
                                            <div className="py-3 transition-all duration-300">
                                                {/* Call header */}
                                                <div className="flex justify-between items-start mb-1">
                                                    <div className="flex-1">
                                                        <h3 className={`text-[17px] font-black tracking-tight flex items-center gap-2 ${isUnread ? 'text-gray-950' : 'text-gray-700'}`}>
                                                            {call.name === "Unknown Caller" ? call.number : call.name}
                                                            {isUnread && <span className="w-2 h-2 bg-blue-600 rounded-full shrink-0 mt-0.5" />}
                                                        </h3>
                                                    </div>
                                                    <span className="text-[13px] font-semibold text-gray-400 tabular-nums">
                                                        {timeStr}
                                                    </span>
                                                </div>

                                                {/* Booked pill */}
                                                {call.actionItem && (
                                                    <div
                                                        className="mb-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full
                              bg-green-50 border border-green-200
                              text-green-800 text-[10px] font-extrabold tracking-tight
                              hover:bg-green-100 transition-all cursor-pointer group/pill"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (call.actionItem.link) window.open(call.actionItem.link, "_blank");
                                                        }}
                                                    >
                                                        <CalendarCheck size={10} strokeWidth={3} className="text-green-700" />
                                                        <span className="whitespace-nowrap">Booked · {call.actionItem.displayTime}</span>
                                                    </div>
                                                )}

                                                {/* Collapsed preview */}
                                                <div className="flex items-center gap-2 px-1">
                                                    <Sparkles size={14} className="text-blue-600 shrink-0" />
                                                    <p className="text-[13px] text-gray-600 font-medium truncate">
                                                        {call.summary}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
                <div className="h-40" />
            </main>
            </>
            ) : (
                <main className="flex-1 overflow-y-auto no-scrollbar px-6">
                    {loadingChats ? (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-4">
                            <RefreshCw className="animate-spin" size={24} />
                            <span className="text-sm font-semibold">Loading messages...</span>
                        </div>
                    ) : chats.length === 0 ? (
                        <div className="text-center py-20">
                            <MessageSquare className="mx-auto mb-4 text-gray-300" size={48} />
                            <p className="text-gray-500 text-sm font-semibold">No messages yet</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200">
                            {chats.map(chat => {
                                const lastMsg = chat.lastMessage;
                                const isUnread = lastMsg && lastMsg.direction === 'inbound';
                                const timeStr = new Date(chat.updatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                                
                                return (
                                    <div key={chat.phone} className="py-4 cursor-pointer group hover:bg-gray-50/50 transition-all rounded-xl -mx-2 px-2">
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="flex-1">
                                                <h3 className={`text-[17px] font-black tracking-tight flex items-center gap-2 ${isUnread ? 'text-gray-950' : 'text-gray-700'}`}>
                                                    {chat.phone}
                                                    {isUnread && <span className="w-2 h-2 bg-blue-600 rounded-full shrink-0" />}
                                                </h3>
                                            </div>
                                            <span className="text-[13px] font-semibold text-gray-400 tabular-nums">
                                                {timeStr}
                                            </span>
                                        </div>
                                        <p className="text-[13px] text-gray-500 font-medium truncate">
                                            {lastMsg?.direction.includes('outbound') ? 'You/AI: ' : ''}{lastMsg?.content || "No messages"}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    <div className="h-40" />
                </main>
            )}
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
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-90 ${isActive ? 'bg-blue-600' : 'bg-gray-200 text-gray-900'
                    }`}
            >
                {isActive ? <Pause size={12} fill="white" className="text-white" /> : <Play size={12} fill="currentColor" className="ml-0.5" />}
            </button>

            <div className="flex-1 flex flex-col gap-1">
                <div
                    className="h-1 bg-gray-200 rounded-full overflow-hidden relative cursor-pointer"
                    onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        const percent = (e.clientX - rect.left) / rect.width;
                        const audioEl = document.getElementById(`audio-${callId}`);
                        if (audioEl) audioEl.currentTime = percent * audioEl.duration;
                    }}
                >
                    <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-75"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-tighter text-gray-500 tabular-nums">
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
