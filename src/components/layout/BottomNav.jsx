import React from 'react';
import { Mail, Sparkles, Settings as SettingsIcon, MessageSquare } from 'lucide-react';

export default function BottomNav({ view, setView }) {
    const tabs = [
        { id: 'inbox', label: 'Inbox', icon: Mail },
        { id: 'receptionist', label: 'Receptionist', icon: Sparkles },
        { id: 'settings', label: 'Settings', icon: SettingsIcon }
    ];

    const isActive = (id) => {
        if (id === 'inbox') return view === 'inbox' || view === 'call-detail';
        return view === id;
    };

    return (
        <div className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-2xl border-t border-gray-100 flex justify-around items-center pt-3 pb-8 px-6 z-[999]">
            {tabs.map(tab => {
                const active = isActive(tab.id);
                const Icon = tab.icon;

                return (
                    <button
                        key={tab.id}
                        onClick={() => setView(tab.id)}
                        className="flex flex-col items-center justify-center w-20 transition-all active:scale-90"
                    >
                        <div className={`mb-1 transition-colors duration-300 ${active ? 'text-[#007FFF]' : 'text-gray-400'}`}>
                            <Icon
                                size={24}
                                strokeWidth={active ? 2.5 : 2}
                                className="transition-all"
                            />
                        </div>
                        <span className={`text-[10px] font-bold tracking-tight transition-colors ${active ? 'text-[#007FFF]' : 'text-gray-400'}`}>
                            {tab.label}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
