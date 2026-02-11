import React from 'react';

export default function BottomNav({ view, setView }) {
    const tabs = [
        { id: 'inbox', label: 'Inbox', icon: '/pics/bot.png' },
        { id: 'receptionist', label: 'Assistant', icon: '/pics/man-user.png' },
        { id: 'settings', label: 'Settings', icon: '/pics/gear.png' }
    ];

    const isActive = (id) => {
        if (id === 'inbox') return view === 'inbox' || view === 'call-detail';
        return view === id;
    };

    return (
        <div className="fixed bottom-0 left-0 w-full bg-white/80 backdrop-blur-xl border-t border-gray-200/50 flex justify-around items-center py-4 px-6 z-[999] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setView(tab.id)}
                    className="flex flex-col items-center justify-center w-20 transition-all active:scale-95 group"
                >
                    <div className={`w-12 h-12 flex items-center justify-center rounded-[1.2rem] mb-1 transition-all duration-300 ${isActive(tab.id) ? 'bg-blue-50 text-blue-600 shadow-inner' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}>
                        <img src={tab.icon} alt={tab.label} className="w-6 h-6 object-contain drop-shadow-sm" />
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${isActive(tab.id) ? 'text-gray-900' : 'text-gray-400 group-hover:text-gray-600'}`}>{tab.label}</span>
                </button>
            ))}
        </div>
    );
}
