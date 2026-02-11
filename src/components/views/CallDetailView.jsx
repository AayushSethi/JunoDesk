import React from 'react';
import {
    ChevronLeft, Share2, UserPlus, Phone, MessageSquare,
    Calendar, Play
} from 'lucide-react';

export default function CallDetailView({
    selectedCall,
    setView,
    showToast
}) {
    if (!selectedCall) return null;

    return (
        <div className="absolute inset-0 z-[60] bg-[#F9FAFB] flex flex-col h-full animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="px-6 pt-12 pb-4 flex justify-between items-center z-20 bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0">
                <button onClick={() => setView('inbox')} className="w-10 h-10 -ml-2 rounded-full items-center justify-center flex hover:bg-gray-100 transition-colors text-gray-900">
                    <ChevronLeft size={28} />
                </button>
                <h1 className="text-base font-bold text-gray-900">Call Details</h1>
                <button
                    onClick={() => showToast('Shared transcript')}
                    className="w-10 h-10 -mr-2 rounded-full items-center justify-center flex hover:bg-gray-100 transition-colors text-gray-900"
                >
                    <Share2 size={20} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 pb-48 space-y-4">
                {/* Contact Card */}
                <div className="bg-white rounded-[2rem] p-6 border border-gray-200 shadow-sm text-center relative overflow-hidden">
                    <div className="w-24 h-24 bg-gray-50 rounded-full mx-auto flex items-center justify-center mb-4 text-3xl font-bold text-gray-300 border border-gray-100 shadow-inner">
                        {selectedCall.name.charAt(0)}
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">{selectedCall.name}</h2>
                    <p className="text-gray-500 font-medium mt-1 mb-4">{selectedCall.number}</p>

                    <button
                        onClick={() => showToast("Added to Contacts")}
                        className="text-xs font-bold text-gray-600 bg-gray-50 border border-gray-200 px-4 py-2 rounded-full hover:bg-gray-100 transition-colors flex items-center mx-auto"
                    >
                        <UserPlus size={14} className="mr-1.5" />
                        Add to Contacts
                    </button>

                    <div className="grid grid-cols-2 gap-3 mt-8">
                        <button className="bg-[#2563EB] text-white py-3.5 rounded-2xl font-bold shadow-lg shadow-blue-200 flex items-center justify-center active:scale-95 transition-all hover:bg-blue-600">
                            <Phone size={18} className="mr-2" /> Call
                        </button>
                        <button className="bg-white border border-gray-200 text-gray-900 py-3.5 rounded-2xl font-bold flex items-center justify-center active:scale-95 transition-all hover:bg-gray-50 shadow-sm">
                            <MessageSquare size={18} className="mr-2" /> Text
                        </button>
                    </div>
                </div>

                {/* Summary & Actions */}
                <div className="bg-white rounded-[2rem] p-6 border border-gray-200 shadow-sm">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-gray-300"></div> Summary
                    </h3>
                    <p className="text-gray-900 leading-relaxed font-medium">
                        {selectedCall.summary}
                    </p>

                    {/* Action Item Card */}
                    {selectedCall.actionItem && (
                        <div className="mt-6 bg-blue-50 border border-blue-100 rounded-2xl p-5 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-blue-100 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none"></div>
                            <div className="flex items-center gap-4 mb-4 relative z-10">
                                <div className="w-12 h-12 bg-white text-blue-600 rounded-xl border border-blue-100 shadow-sm flex items-center justify-center shrink-0">
                                    <Calendar size={22} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 text-sm">{selectedCall.actionItem.label}</h4>
                                    <p className="text-blue-600 text-xs font-bold mt-0.5">
                                        {selectedCall.actionItem.summary || "Appointment confirmed"}
                                    </p>
                                    <p className="text-gray-400 text-[10px] font-medium mt-0.5">
                                        {selectedCall.actionItem.displayTime}
                                    </p>
                                </div>
                            </div>
                            {selectedCall.actionItem.link && (
                                <a
                                    href={selectedCall.actionItem.link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block w-full text-center bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-bold py-3 rounded-xl transition-all shadow-md shadow-blue-100 relative z-10"
                                >
                                    View on Calendar
                                </a>
                            )}
                        </div>
                    )}

                    {/* Audio Player */}
                    {selectedCall.recordingUrl && (
                        <div className="mt-8 pt-6 border-t border-gray-100">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-gray-300"></div> Recording
                            </h4>
                            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex items-center gap-4">
                                <button
                                    onClick={() => {
                                        const audio = new Audio(selectedCall.recordingUrl);
                                        audio.play();
                                    }}
                                    className="w-12 h-12 bg-white rounded-full shadow-sm border border-gray-100 flex items-center justify-center text-gray-900 hover:scale-105 active:scale-95 transition-all text-[#2563EB]">
                                    <Play size={20} className="ml-1 fill-current" />
                                </button>
                                <div className="flex-1 h-10 flex items-center gap-1 opacity-50">
                                    {Array.from({ length: 24 }).map((_, i) => (
                                        <div key={i} className={`w-1 rounded-full bg-gray-400 ${i % 3 === 0 ? 'h-6' : 'h-3'}`} style={{ height: `${Math.max(20, Math.random() * 100)}%` }}></div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Transcript */}
                <div className="bg-white rounded-[2rem] p-6 border border-gray-200 shadow-sm">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-gray-300"></div> Transcript
                    </h3>
                    <div className="space-y-4">
                        {selectedCall.transcript ? (
                            <div className="text-sm font-medium leading-relaxed text-gray-700 whitespace-pre-wrap font-mono text-[13px] bg-gray-50 p-4 rounded-xl border border-gray-100">
                                {selectedCall.transcript}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400 italic">No transcript available.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
