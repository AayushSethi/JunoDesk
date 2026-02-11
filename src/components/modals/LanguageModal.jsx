import React from 'react';
import { Check } from 'lucide-react';

export default function LanguageModal({
    onClose,
    onSave,
    languages,
    setLanguages,
    LANGUAGES
}) {
    return (
        <div className="fixed inset-0 z-[2000] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-sm rounded-[1.5rem] p-5 shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[80vh]">
                <div className="flex justify-between items-center mb-4 shrink-0">
                    <button onClick={onClose} className="text-gray-400 font-bold text-sm hover:text-gray-600 transition-colors">Cancel</button>
                    <h3 className="text-lg font-black text-gray-900">Languages</h3>
                    <button
                        onClick={onSave}
                        className="text-[#2563EB] font-bold text-sm hover:text-blue-700 transition-colors"
                    >
                        Save
                    </button>
                </div>

                <p className="text-xs text-gray-500 font-medium mb-4 leading-relaxed shrink-0">
                    Select supported languages.
                </p>

                <div className="grid grid-cols-3 gap-2 overflow-y-auto pr-1 pb-1">
                    {LANGUAGES.map(l => {
                        const isSelected = languages.includes(l.name);
                        return (
                            <button
                                key={l.name}
                                onClick={() => {
                                    if (isSelected) {
                                        setLanguages(prev => prev.filter(x => x !== l.name));
                                    } else {
                                        setLanguages(prev => [...prev, l.name]);
                                    }
                                }}
                                className={`flex flex-col items-center justify-center py-2 px-2 rounded-xl border transition-all active:scale-95 ${isSelected ? 'border-[#2563EB] bg-blue-50/50 shadow-inner' : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'}`}
                            >
                                <div className="relative mb-1">
                                    <span className="text-2xl drop-shadow-sm filter grayscale-[0.2] transition-all duration-300 transform group-hover:scale-110">{l.flag}</span>
                                    {isSelected && (
                                        <div className="absolute -top-1 -right-2 bg-[#2563EB] text-white rounded-full p-[2px] shadow-sm animate-in zoom-in duration-200">
                                            <Check size={8} strokeWidth={4} />
                                        </div>
                                    )}
                                </div>
                                <span className={`text-[10px] font-bold ${isSelected ? 'text-[#2563EB]' : 'text-gray-600'}`}>{l.name}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
