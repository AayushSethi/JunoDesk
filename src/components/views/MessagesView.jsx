import React, { useState, useEffect, useRef } from 'react';
import { Send, Phone, User, MessageCircle, ChevronLeft } from 'lucide-react';

// Helper to format timestamps nice and clean
const formatTime = (isoString) => {
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function MessagesView({ userId, businessPhone, showToast }) {
    const [conversations, setConversations] = useState([]);
    const [activeChat, setActiveChat] = useState(null); // Will hold the whole chat object: { phone, history }
    const [loading, setLoading] = useState(true);
    const [replyText, setReplyText] = useState("");
    const [sending, setSending] = useState(false);

    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Load messages
    const fetchMessages = async () => {
        try {
            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/messages?userId=${userId}`);
            const data = await res.json();
            if (data.success) {
                // Sort conversations by the most recent message
                const sorted = data.conversations.sort((a, b) => {
                    const lastA = new Date(a.history[a.history.length - 1].created_at);
                    const lastB = new Date(b.history[b.history.length - 1].created_at);
                    return lastB - lastA;
                });
                setConversations(sorted);

                // Update active chat if one is selected
                if (activeChat) {
                    const updatedActive = sorted.find(c => c.phone === activeChat.phone);
                    if (updatedActive) setActiveChat(updatedActive);
                }
            }
        } catch (e) {
            console.error(e);
            showToast("Failed to load messages.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 5000); // Polling for new messages natively
        return () => clearInterval(interval);
    }, [userId, activeChat]);

    useEffect(() => {
        if (activeChat) scrollToBottom();
    }, [activeChat]);

    const handleSendMessage = async () => {
        if (!replyText.trim() || !activeChat) return;

        setSending(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/messages/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    toPhone: activeChat.phone,
                    content: replyText.trim()
                })
            });
            const data = await res.json();
            if (data.success) {
                setReplyText("");
                await fetchMessages();
                setTimeout(scrollToBottom, 100);
            } else {
                showToast(data.error || "Failed to send message");
            }
        } catch (e) {
            console.error(e);
            showToast("Failed to send message due to network error");
        } finally {
            setSending(false);
        }
    };

    // Make numbers look pretty if they're standard E.164
    const formatPhone = (phone) => {
        if (!phone) return "Unknown";
        if (phone.length === 12 && phone.startsWith("+1")) {
            return `(${phone.slice(2, 5)}) ${phone.slice(5, 8)}-${phone.slice(8)}`;
        }
        return phone;
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 pb-20 sm:pb-0">
            {/* Header */}
            <div className="bg-white px-6 pt-12 pb-4 shadow-sm border-b border-gray-100 flex items-center justify-between z-10 sticky top-0">
                <div className="flex items-center gap-3">
                    {activeChat && (
                        <button
                            onClick={() => setActiveChat(null)}
                            className="mr-1 -ml-2 p-2 hover:bg-gray-100 rounded-full transition-colors active:scale-95 sm:hidden"
                        >
                            <ChevronLeft size={20} className="text-gray-600" />
                        </button>
                    )}
                    <h1 className="text-2xl font-black tracking-tight text-gray-900">
                        {activeChat ? formatPhone(activeChat.phone) : 'Messages'}
                    </h1>
                </div>
                {!activeChat && (
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                        <MessageCircle className="text-blue-600" size={20} />
                    </div>
                )}
            </div>

            <div className="flex flex-1 overflow-hidden relative">

                {/* Conversations List (Sidebar on desktop, full screen on mobile until chat selected) */}
                <div className={`overflow-y-auto w-full sm:w-80 border-r border-gray-200 bg-white ${activeChat ? 'hidden sm:block' : 'block'}`}>
                    {loading && conversations.length === 0 ? (
                        <div className="flex justify-center p-8">
                            <div className="animate-pulse flex flex-col items-center gap-3">
                                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                                <div className="w-24 h-4 bg-gray-200 rounded text-transparent">Loading</div>
                            </div>
                        </div>
                    ) : conversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-60">
                            <MessageCircle size={40} className="mb-4 text-gray-300" strokeWidth={1.5} />
                            <h3 className="text-lg font-bold text-gray-900 mb-1">No messages</h3>
                            <p className="text-sm text-gray-500">When customers text your number, they'll appear here.</p>
                        </div>
                    ) : (
                        conversations.map((chat, idx) => {
                            const lastMsg = chat.history[chat.history.length - 1];
                            const isSelected = activeChat?.phone === chat.phone;
                            return (
                                <button
                                    key={idx}
                                    onClick={() => setActiveChat(chat)}
                                    className={`w-full text-left p-4 border-b border-gray-100 transition-colors flex gap-3
                                        ${isSelected ? 'bg-blue-50/50' : 'hover:bg-gray-50 active:bg-gray-100'}
                                    `}
                                >
                                    <div className="w-12 h-12 bg-gradient-to-tr from-blue-100 to-indigo-100 rounded-full flex items-center justify-center shrink-0">
                                        <User size={20} className="text-blue-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <h3 className="font-bold text-gray-900 text-[15px] truncate">
                                                {formatPhone(chat.phone)}
                                            </h3>
                                            <span className="text-[11px] font-medium text-gray-400 shrink-0">
                                                {formatTime(lastMsg.created_at)}
                                            </span>
                                        </div>
                                        <p className="text-[13px] text-gray-500 truncate font-medium">
                                            {lastMsg.direction.includes('outbound') && <span className="text-blue-500 mr-1">You:</span>}
                                            {lastMsg.content}
                                        </p>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Active Chat View */}
                <div className={`flex-1 flex flex-col bg-slate-50 relative ${!activeChat ? 'hidden sm:flex items-center justify-center bg-gray-50/50' : 'flex'}`}>

                    {!activeChat ? (
                        <div className="hidden sm:flex flex-col items-center justify-center opacity-40">
                            <MessageCircle size={48} className="mb-4 text-gray-300" />
                            <p className="font-bold text-gray-500 text-lg">Select a conversation</p>
                        </div>
                    ) : (
                        <>
                            {/* Chat History */}
                            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                                {activeChat.history.map((msg, idx) => {
                                    const isOutbound = msg.direction.includes('outbound');
                                    const isAi = msg.direction === 'outbound_ai';
                                    return (
                                        <div key={idx} className={`flex w-full ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                                            <div className="flex flex-col max-w-[80%]">
                                                <div
                                                    className={`px-4 py-2.5 rounded-2xl shadow-sm text-[15px] leading-relaxed relative
                                                        ${isOutbound
                                                            ? 'bg-blue-600 text-white rounded-br-sm'
                                                            : 'bg-white border text-gray-900 border-gray-100 rounded-bl-sm'
                                                        }
                                                    `}
                                                >
                                                    {msg.content}
                                                </div>
                                                <div className={`text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-wide flex gap-1
                                                    ${isOutbound ? 'justify-end' : 'justify-start'}
                                                `}>
                                                    {formatTime(msg.created_at)}
                                                    {isAi && <span className="text-blue-400 ml-1">· AI</span>}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Message Input bar */}
                            <div className="bg-white px-4 py-3 border-t border-gray-200">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Type a message..."
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSendMessage();
                                        }}
                                        className="flex-1 bg-gray-100 border-transparent focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-full px-5 py-3 outline-none transition-all"
                                    />
                                    <button
                                        disabled={!replyText.trim() || sending}
                                        onClick={handleSendMessage}
                                        className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-95
                                            ${replyText.trim() && !sending ? 'bg-blue-600 shadow-lg shadow-blue-600/30' : 'bg-blue-300 cursor-not-allowed'}
                                        `}
                                    >
                                        <Send size={18} fill="white" className="text-white ml-0.5" />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>

            </div>
        </div>
    );
}
