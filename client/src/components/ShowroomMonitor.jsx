import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Monitor, Building2 } from 'lucide-react';

const ShowroomMonitor = ({ showrooms, entries }) => {
    const [people, setPeople] = useState([]);

    useEffect(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todaysEntries = entries.filter(e => {
            // Client is gone if outTime is present or visit is CANCELLED
            if (e.visitStatus === 'CANCELLED' || (e.outTime && e.outTime.trim() !== '')) return false;
            const eDate = new Date(e.dateOfVisit);
            eDate.setHours(0, 0, 0, 0);
            return eDate.getTime() === today.getTime();
        });

        const newPeople = todaysEntries.map((entry, idx) => ({
            id: `${entry.id}-${idx}`,
            showroom: entry.showroom,
            name: entry.clientName,
            x: Math.random() * 180 + 30,
            y: Math.random() * 80 + 40,
            dx: (Math.random() * 2 - 1) * 0.4,
            dy: (Math.random() * 2 - 1) * 0.4,
            speed: 0.15 + Math.random() * 0.25
        }));
        setPeople(newPeople);
    }, [entries]);

    useEffect(() => {
        let animationFrameId;
        const move = () => {
            setPeople(prevPeople => prevPeople.map(person => {
                let { x, y, dx, dy, speed } = person;
                
                // Repulsion logic
                prevPeople.forEach(other => {
                    if (other.id === person.id || other.showroom !== person.showroom) return;
                    const distX = x - other.x;
                    const distY = y - other.y;
                    const dist = Math.sqrt(distX * distX + distY * distY);
                    if (dist < 30) {
                        dx += (distX / dist) * 0.05;
                        dy += (distY / dist) * 0.05;
                    }
                });

                // Movement
                x += dx * speed * 0.5; // Slow down for smoothness
                y += dy * speed * 0.5;

                // Bounce with more margin
                if (x < 15 || x > 255) dx *= -1.02; // Add slight kick on bounce
                if (y < 20 || y > 120) dy *= -1.02;

                // Random small adjustments instead of total random turns
                if (Math.random() < 0.02) {
                    dx += (Math.random() * 0.2 - 0.1);
                    dy += (Math.random() * 0.2 - 0.1);
                    // Cap speed
                    const currentSpeed = Math.sqrt(dx*dx + dy*dy);
                    if (currentSpeed > 1) {
                        dx /= currentSpeed;
                        dy /= currentSpeed;
                    }
                }

                return { ...person, x, y, dx, dy };
            }));
            animationFrameId = requestAnimationFrame(move);
        };
        animationFrameId = requestAnimationFrame(move);
        return () => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
        };
    }, []);

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
                <div key={name} className="relative h-44 bg-slate-800/30 rounded-3xl border border-slate-700/50 overflow-hidden backdrop-blur-sm group hover:border-blue-500/30 transition-all">
                    <div className="absolute top-4 left-4 z-10 flex flex-col gap-0.5">
                        <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">{name}</p>
                        <p className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">
                            {people.filter(p => p.showroom === name).length} Active
                        </p>
                    </div>
                    {people.filter(p => p.showroom === name).map(p => {
                        const angle = Math.atan2(p.dy, p.dx) * 180 / Math.PI;
                        return (
                            <div 
                                key={p.id}
                                className="absolute"
                                style={{ 
                                    left: p.x, 
                                    top: p.y,
                                    transition: 'left 0.1s linear, top 0.1s linear',
                                    transform: `rotate(${angle}deg)`
                                }}
                            >
                                <div className="flex flex-col items-center">
                                    <motion.span 
                                        animate={{ scale: [1, 1.1, 1], opacity: [0.8, 1, 0.8] }}
                                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                                        className="text-[8px] font-black text-white bg-blue-600/80 px-2 py-0.5 rounded-full uppercase whitespace-nowrap shadow-lg" 
                                        style={{ transform: `rotate(${-angle}deg)` }}
                                    >
                                        {p.name}
                                    </motion.span>
                                </div>
                            </div>
                        )
                    })}
                    {people.filter(p => p.showroom === name).length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                            <Users size={40} className="text-white" />
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default ShowroomMonitor;
