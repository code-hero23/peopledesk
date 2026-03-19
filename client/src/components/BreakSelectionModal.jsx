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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in transition-all">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in relative border border-white/20 dark:border-slate-800 transition-colors">
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all z-10"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="p-8">
                    <div className="mb-6">
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Pause Work</h3>
                        <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1">Select a reason for taking a break or meeting.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {breakOptions.map((option) => (
                            <button
                                key={option.id}
                                onClick={() => onSelect(option.id)}
                                className={`group flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all hover:scale-[1.02] active:scale-95 ${option.color.replace('bg-', 'hover:bg-opacity-80 dark:bg-opacity-10 ').replace('border-', 'border-')} dark:border-opacity-10`}
                            >
                                <div className={`p-4 rounded-2xl bg-white dark:bg-slate-800 shadow-sm mb-4 group-hover:shadow-md group-hover:-translate-y-1 transition-all`}>
                                    {React.cloneElement(option.icon, { className: "w-7 h-7" })}
                                </div>
                                <span className="font-black text-xs uppercase tracking-wider text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{option.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BreakSelectionModal;
