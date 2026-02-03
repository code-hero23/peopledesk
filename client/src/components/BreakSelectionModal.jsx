import React from 'react';
import { Coffee, Utensils, Briefcase, Users, X } from 'lucide-react';

const BreakSelectionModal = ({ isOpen, onClose, onSelect }) => {
    if (!isOpen) return null;

    const breakOptions = [
        { id: 'TEA', label: 'Tea Break', icon: <Coffee className="w-6 h-6" />, color: 'bg-orange-100 text-orange-600 border-orange-200' },
        { id: 'LUNCH', label: 'Lunch Break', icon: <Utensils className="w-6 h-6" />, color: 'bg-green-100 text-green-600 border-green-200' },
        { id: 'CLIENT_MEETING', label: 'Client Meeting', icon: <Briefcase className="w-6 h-6" />, color: 'bg-blue-100 text-blue-600 border-blue-200' },
        { id: 'BH_MEETING', label: 'BH Meeting', icon: <Users className="w-6 h-6" />, color: 'bg-purple-100 text-purple-600 border-purple-200' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="p-6">
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Pause Work</h3>
                    <p className="text-slate-500 mb-6">Select a reason for taking a break or meeting.</p>

                    <div className="grid grid-cols-2 gap-4">
                        {breakOptions.map((option) => (
                            <button
                                key={option.id}
                                onClick={() => onSelect(option.id)}
                                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all hover:scale-105 active:scale-95 ${option.color.replace('bg-', 'hover:bg-opacity-80 ').replace('border-', 'border-')}`}
                            >
                                <div className={`p-3 rounded-full bg-white shadow-sm mb-3`}>
                                    {option.icon}
                                </div>
                                <span className="font-bold text-sm text-slate-700">{option.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BreakSelectionModal;
