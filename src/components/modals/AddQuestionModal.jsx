import React from 'react';

export default function AddQuestionModal({
    onClose,
    onSave,
    tempQuestion,
    setTempQuestion
}) {
    return (
        <div className="absolute inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
            <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 relative z-10 animate-in zoom-in-95 duration-200 shadow-2xl">
                <h3 className="text-xl font-bold text-gray-900 mb-4">New Question</h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Question</label>
                        <input
                            autoFocus
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400/20 focus:bg-white transition-all"
                            placeholder="e.g. Do you have WiFi?"
                            value={tempQuestion.q}
                            onChange={e => setTempQuestion(prev => ({ ...prev, q: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Answer</label>
                        <textarea
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400/20 focus:bg-white transition-all resize-none"
                            placeholder="e.g. Yes, the password is..."
                            rows={3}
                            value={tempQuestion.a}
                            onChange={e => setTempQuestion(prev => ({ ...prev, a: e.target.value }))}
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onSave}
                            className="flex-1 py-3 rounded-xl font-bold text-white bg-blue-500 hover:bg-blue-600 transition-colors shadow-lg shadow-blue-200"
                        >
                            Save
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
