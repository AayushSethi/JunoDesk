import React, { useState, useRef, useEffect } from 'react';
import {
    ChevronLeft, Share2, UserPlus, Phone, MessageSquare,
    Calendar, Play, Sparkles, Clock, CalendarCheck, Pause, Trash2
} from 'lucide-react';

export default function CallDetailView({
    selectedCall,
    setView,
    showToast,
    handleDeleteCall
}) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const audioRef = useRef(null);

    useEffect(() => {
        if (selectedCall?.recordingUrl) {
            audioRef.current = new Audio(selectedCall.recordingUrl);
            const audio = audioRef.current;

            const onTimeUpdate = () => {
                setCurrentTime(audio.currentTime);
                setProgress((audio.currentTime / audio.duration) * 100);
            };
            const onEnded = () => {
                setIsPlaying(false);
                setProgress(0);
                setCurrentTime(0);
            };

            audio.addEventListener('timeupdate', onTimeUpdate);
            audio.addEventListener('ended', onEnded);

            return () => {
                audio.removeEventListener('timeupdate', onTimeUpdate);
                audio.removeEventListener('ended', onEnded);
                audio.pause();
                audio.src = '';
            };
        }
    }, [selectedCall]);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const formatTime = (time) => {
        if (isNaN(time) || time === Infinity || !time) return "0:00";
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (!selectedCall) return null;

    return (
        <div className="absolute inset-0 z-[60] bg-white flex flex-col h-full animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="px-6 pt-12 pb-4 flex justify-between items-center z-20 bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0">
                <button onClick={() => setView('inbox')} className="w-10 h-10 -ml-2 rounded-full items-center justify-center flex hover:bg-gray-100 transition-colors text-gray-900">
                    <ChevronLeft size={28} />
                </button>
                <div className="flex flex-col items-center">
                    <h1 className="text-base font-bold text-gray-900">{selectedCall.name || selectedCall.number}</h1>
                    <p className="text-[10px] text-gray-500 font-medium">{new Date(selectedCall.rawTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</p>
                </div>
                <button
                    onClick={() => showToast('Shared call')}
                    className="w-10 h-10 -mr-2 rounded-full items-center justify-center flex hover:bg-gray-100 transition-colors text-gray-900"
                >
                    <Share2 size={20} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto pb-48">

                {/* Actions Row */}
                <div className="flex justify-center gap-6 py-6 border-b border-gray-100 px-6 bg-gray-50/50">
                    <button className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform" onClick={() => showToast('Calling...')}>
                        <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shadow-sm">
                            <Phone size={20} fill="currentColor" />
                        </div>
                        <span className="text-[11px] font-bold text-gray-600">Call</span>
                    </button>
                    <button className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform" onClick={() => showToast('Opening messages...')}>
                        <div className="w-12 h-12 rounded-full bg-white border border-gray-200 text-gray-700 flex items-center justify-center shadow-sm">
                            <MessageSquare size={20} fill="currentColor" />
                        </div>
                        <span className="text-[11px] font-bold text-gray-600">Message</span>
                    </button>
                    <button className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform" onClick={() => showToast('Added to Contacts')}>
                        <div className="w-12 h-12 rounded-full bg-white border border-gray-200 text-gray-700 flex items-center justify-center shadow-sm">
                            <UserPlus size={20} />
                        </div>
                        <span className="text-[11px] font-bold text-gray-600">Add</span>
                    </button>
                    <button className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform" onClick={() => {
                        if (handleDeleteCall) {
                            handleDeleteCall(selectedCall.id);
                            setView('inbox');
                        } else {
                            showToast("Unable to delete");
                        }
                    }}>
                        <div className="w-12 h-12 rounded-full bg-red-50 border border-red-100 text-red-600 flex items-center justify-center shadow-sm">
                            <Trash2 size={20} />
                        </div>
                        <span className="text-[11px] font-bold text-gray-600">Delete</span>
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Summary / Structured Data */}
                    {selectedCall.structured_data && typeof selectedCall.structured_data === 'object' ? (
                        <div className="space-y-4 relative">
                            <div className="flex items-center gap-2 mb-2">
                                <Sparkles size={16} className="text-blue-600" />
                                <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Call Details</h3>
                            </div>
                            <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex flex-col gap-4">
                                <div>
                                    <span className="block text-xs font-medium text-gray-400 mb-0.5">Caller details</span>
                                    <span className="block text-[15px] font-bold text-gray-900">{selectedCall.structured_data.callerName || "Unknown"}</span>
                                </div>

                                <div>
                                    <span className="block text-xs font-medium text-gray-400 mb-0.5">Call regarding</span>
                                    <span className="block text-[15px] font-bold text-gray-900">{selectedCall.structured_data.callRegarding || "N/A"}</span>
                                </div>

                                <div>
                                    <span className="block text-xs font-medium text-gray-400 mb-0.5">Action taken</span>
                                    <span className="block text-[15px] font-bold text-gray-900 leading-tight">{selectedCall.structured_data.actionTaken || "None"}</span>
                                </div>

                                <div className="flex justify-between items-center pr-4">
                                    <div>
                                        <span className="block text-xs font-medium text-gray-400 mb-0.5">Goal achieved?</span>
                                        <span className="block text-[15px] font-bold text-gray-900">{selectedCall.structured_data.wasSuccessful ? "Yes" : "No"}</span>
                                    </div>
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 border border-gray-100 bg-gray-50">
                                        <Check size={18} className={selectedCall.structured_data.wasSuccessful ? "text-green-500" : "text-gray-300"} />
                                    </div>
                                </div>

                                {selectedCall.structured_data.additionalNotes && (
                                    <>
                                        <div className="h-px w-full bg-gray-100"></div>
                                        <div>
                                            <span className="block text-xs font-medium text-gray-400 mb-0.5">Notes</span>
                                            <span className="block text-[15px] font-medium text-gray-700 leading-snug">{selectedCall.structured_data.additionalNotes}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 relative">
                            <div className="flex items-center gap-2 mb-2">
                                <Sparkles size={16} className="text-blue-600" />
                                <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">AI Summary</h3>
                            </div>
                            <div className="bg-blue-50/50 rounded-2xl p-5 border border-blue-100/50 shadow-sm leading-relaxed text-gray-800 text-[15px] font-medium">
                                {selectedCall.summary}
                            </div>
                        </div>
                    )}

                    {/* Action Item Card */}
                    {selectedCall.actionItem && (
                        <div className="bg-white border-2 border-green-100 rounded-2xl p-4 shadow-sm relative overflow-hidden flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center shrink-0">
                                    <CalendarCheck size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 text-[13px]">{selectedCall.actionItem.label}</h4>
                                    <p className="text-green-600 text-[11px] font-bold mt-0.5">
                                        {selectedCall.actionItem.summary || "Appointment confirmed"}
                                    </p>
                                </div>
                            </div>
                            {selectedCall.actionItem.link && (
                                <a
                                    href={selectedCall.actionItem.link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="bg-green-600 hover:bg-green-700 text-white text-[11px] px-4 py-2 font-bold rounded-full transition-all shadow-sm shrink-0"
                                >
                                    View
                                </a>
                            )}
                        </div>
                    )}

                    {/* Audio Player */}
                    {selectedCall.recordingUrl && (
                        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 flex items-center gap-4 mt-6">
                            <button
                                onClick={togglePlay}
                                className="w-10 h-10 shrink-0 bg-blue-600 rounded-full shadow-md flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-all">
                                {isPlaying ? <Pause size={16} className="fill-current" /> : <Play size={16} className="ml-1 fill-current" />}
                            </button>
                            <div className="flex-1 cursor-pointer py-2" onClick={(e) => {
                                if (!audioRef.current || !audioRef.current.duration) return;
                                const rect = e.currentTarget.getBoundingClientRect();
                                const clickX = e.clientX - rect.left;
                                const percent = Math.max(0, Math.min(1, clickX / rect.width));
                                audioRef.current.currentTime = percent * audioRef.current.duration;
                                setProgress(percent * 100);
                            }}>
                                <div className="h-1.5 bg-gray-200 rounded-full w-full overflow-hidden">
                                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${progress}%` }}></div>
                                </div>
                            </div>
                            <span className="text-[10px] font-bold text-gray-500 tabular-nums min-w-[30px] shrink-0 text-right">{formatTime(currentTime)}</span>
                        </div>
                    )}
                </div>

                <div className="h-1 bg-gray-50 border-y border-gray-100" />

                {/* Transcript */}
                <div className="p-6">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 text-center">Call Transcript</h3>
                    <div className="space-y-4">
                        {selectedCall.transcript ? (
                            selectedCall.transcript.split(/(?=AI:|Guest:|User:)/g).map((msg, i) => {
                                const isAI = msg.trim().startsWith("AI:");
                                const sender = isAI ? "Receptionist" : "Guest";
                                const content = msg.replace(/^(AI:|Guest:|User:)/i, '').trim();
                                if (!content) return null;
                                return (
                                    <div key={i} className={`flex flex-col mb-4 ${isAI ? 'items-end' : 'items-start'}`}>
                                        <span className={`text-[10px] font-bold mb-1 px-1 ${isAI ? 'text-gray-400' : 'text-gray-400'}`}>
                                            {sender}
                                        </span>
                                        <div className={`px-4 py-2.5 rounded-2xl max-w-[85%] text-[15px] leading-relaxed shadow-sm ${isAI ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-gray-100 text-gray-900 rounded-tl-sm'}`}>
                                            {content}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-sm text-gray-400 italic text-center py-10">No transcript available.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

