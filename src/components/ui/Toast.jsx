import React from 'react';

export default function Toast({ toast, toastAction, setToast, setToastAction }) {
    if (!toast) return null;

    return (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md text-gray-900 px-5 py-3 rounded-2xl shadow-lg border border-gray-200 z-[100] animate-in fade-in slide-in-from-top-2 duration-300 flex items-center gap-3 max-w-sm">
            <span className="text-sm font-medium">{toast}</span>
            {toastAction && (
                <button
                    onClick={() => {
                        toastAction.run();
                        setToast(null);
                        setToastAction(null);
                    }}
                    className="text-blue-600 font-bold text-sm hover:text-blue-700 transition-colors ml-auto"
                >
                    {toastAction.label}
                </button>
            )}
        </div>
    );
}
