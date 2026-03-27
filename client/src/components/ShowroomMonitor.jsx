import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Monitor, Building2 } from 'lucide-react';

const ShowroomMonitor = ({ showrooms, entries }) => {
    const [people, setPeople] = useState([]);

    useEffect(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todaysEntries = entries.filter(e => {
            if (e.visitStatus === 'CANCELLED' || (e.outTime && e.outTime.trim() !== '')) return false;
            const eDate = new Date(e.dateOfVisit);
            eDate.setHours(0, 0, 0, 0);
            return eDate.getTime() === today.getTime();
        });

        const newPeople = todaysEntries.map((entry, idx) => ({
            id: `${entry.id}-${idx}`,
            showroom: entry.showroom,
            name: entry.clientName
        }));
        setPeople(newPeople);
    }, [entries]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 bg-slate-900 p-8 rounded-[2.5rem] mt-8 shadow-2xl border border-slate-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
                <Building2 size={120} className="text-white" />
            </div>
            <div className="lg:col-span-4 flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                        <Monitor size={20} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-white tracking-tight">Showroom Live View</h2>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Real-time Client Flow Monitoring ({new Date().toLocaleDateString(undefined, { dateStyle: 'medium' })})</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">System Active</span>
                    </div>
                </div>
            </div>
            {showrooms.map(name => (
                <div key={name} className="relative min-h-44 bg-slate-800/30 rounded-3xl border border-slate-700/50 overflow-hidden backdrop-blur-sm group hover:border-blue-500/30 transition-all flex flex-col">
                    <div className="p-4 flex flex-col gap-0.5 border-b border-slate-700/30 bg-slate-800/20">
                        <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">{name}</p>
                        <p className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">
                            {people.filter(p => p.showroom === name).length} Active
                        </p>
                    </div>
                    
                    <div className="flex-1 p-6 flex flex-wrap content-start items-center justify-center gap-4">
                        {people.filter(p => p.showroom === name).map(p => {
                            return (
                                <div 
                                    key={p.id}
                                    className="relative flex items-center justify-center"
                                >
                                    {/* Subdued Stationary Heartbeat Glow */}
                                    <motion.div 
                                        animate={{ 
                                            scale: [1, 1.4, 1, 1.2, 1],
                                            opacity: [0.2, 0.4, 0.2, 0.3, 0.2]
                                        }}
                                        transition={{ 
                                            duration: 2.5, 
                                            repeat: Infinity, 
                                            ease: "easeInOut",
                                            times: [0, 0.2, 0.4, 0.6, 1]
                                        }}
                                        className="absolute w-12 h-12 bg-blue-500/10 rounded-full blur-xl"
                                    />

                                    <motion.div 
                                        animate={{ 
                                            scale: [1, 1.08, 1, 1.04, 1] 
                                        }}
                                        transition={{ 
                                            duration: 2.5, 
                                            repeat: Infinity, 
                                            ease: "easeInOut",
                                            times: [0, 0.2, 0.4, 0.6, 1]
                                        }}
                                        className="relative z-10"
                                    >
                                        <span className="text-[9px] font-black text-white bg-blue-600 px-3 py-1.5 rounded-full uppercase whitespace-nowrap shadow-[0_0_15px_rgba(59,130,246,0.5)] border border-white/20 select-none cursor-default">
                                            {p.name}
                                        </span>
                                    </motion.div>
                                </div>
                            )
                        })}
                        {people.filter(p => p.showroom === name).length === 0 && (
                            <div className="flex flex-col items-center justify-center opacity-10 pointer-events-none mt-4">
                                <Users size={32} className="text-white" />
                                <p className="text-[8px] font-black uppercase tracking-tighter mt-1">Empty</p>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ShowroomMonitor;
