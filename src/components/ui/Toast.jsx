import React from 'react';

export default function Toast({ toast, toastAction, setToast, setToastAction }) {
    if (!toast) return null;

    return (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-gray-900 text-white pl-6 pr-4 py-3 rounded-full shadow-xl z-[100] animate-in fade-in slide-in-from-top-4 duration-300 flex items-center gap-4">
            <span className="text-sm font-bold">{toast}</span>
            {toastAction && (
                <button
                    onClick={() => {
                        toastAction.run();
                        setToast(null);
                        setToastAction(null);
                    }}
                    className="text-blue-400 font-bold text-xs uppercase tracking-wider hover:text-blue-300 transition-colors"
                >
                    {toastAction.label}
                </button>
            )}
        </div>
    );
}
