import React from 'react';

export default function AddServiceModal({
    onClose,
    onSave,
    tempService,
    setTempService
}) {
    return (
        <div className="absolute inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
            <div className="bg-white w-full max-w-[28rem] rounded-[2rem] p-8 relative z-10 animate-in zoom-in-95 duration-200 shadow-2xl">
                <h3 className="text-xl font-bold text-gray-900 mb-6 font-['Inter',_sans-serif] tracking-tight">Add Service</h3>

                <div className="space-y-5">
                    {/* Name Field */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-1.5">Name</label>
                        <input
                            autoFocus
                            className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 placeholder-gray-400"
                            placeholder="e.g., Deep Tissue Massage, Free Consultation"
                            value={tempService?.name || ''}
                            onChange={e => setTempService(prev => ({ ...prev, name: e.target.value }))}
                        />
                    </div>

                    {/* Description Field */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                            Description <span className="text-gray-400 font-normal">— optional</span>
                        </label>
                        <textarea
                            className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none text-gray-900 placeholder-gray-400 leading-relaxed"
                            placeholder="Context for the AI: pricing details, what to ask, special rules..."
                            rows={3}
                            value={tempService?.description || ''}
                            onChange={e => setTempService(prev => ({ ...prev, description: e.target.value }))}
                        />
                        <p className="text-[13px] text-gray-400 mt-2">
                            Helps your assistant talk about this service. Not shown to callers.
                        </p>
                    </div>

                    {/* Price and Duration Row */}
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                                Price <span className="text-gray-400 font-normal">— optional</span>
                            </label>
                            <input
                                className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 placeholder-gray-400"
                                placeholder="e.g., $120, Free"
                                value={tempService?.price || ''}
                                onChange={e => setTempService(prev => ({ ...prev, price: e.target.value }))}
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                                Duration <span className="text-gray-400 font-normal">— optional</span>
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 placeholder-gray-400"
                                    placeholder="e.g., 60"
                                    value={tempService?.duration || ''}
                                    onChange={e => setTempService(prev => ({ ...prev, duration: e.target.value }))}
                                />
                                <span className="text-sm text-gray-500 font-medium whitespace-nowrap">min</span>
                            </div>
                        </div>
                    </div>
                    <p className="text-[13px] text-gray-400 mt-2 -mt-1">
                        Set duration if this is a bookable service.
                    </p>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 pt-6">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-xl font-bold text-gray-600 bg-gray-100/80 hover:bg-gray-200/80 transition-colors text-[15px]"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onSave}
                            disabled={!tempService?.name?.trim()}
                            className={`px-6 py-2.5 rounded-xl font-bold text-[15px] transition-colors ${tempService?.name?.trim()
                                    ? 'bg-gray-400 text-white hover:bg-gray-500'
                                    : 'bg-gray-300 text-white cursor-not-allowed opacity-80'
                                }`}
                        >
                            Add
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
