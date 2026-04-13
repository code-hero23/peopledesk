import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import {
    Cpu,
    Bot,
    FileText,
    Layers,
    ChevronRight,
    Sparkles,
    Construction,
    Zap,
    MessageSquare,
    TrendingUp,
    Globe,
    ShieldCheck,
    BarChart3,
    Network,
    Terminal,
    ArrowUpRight
} from 'lucide-react';

const DecoraAI = () => {
    const { scrollYProgress } = useScroll();
    const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '20%']);
    const orbScale = useTransform(scrollYProgress, [0, 1], [1, 1.5]);
    const textOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
    const textScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.9]);

    useEffect(() => {
        const handleMouseMove = (e) => {
            setMousePos({
                x: (e.clientX / window.innerWidth - 0.5) * 40,
                y: (e.clientY / window.innerHeight - 0.5) * 40
            });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    const AnimatedText = ({ text, delay = 0 }) => {
        const characters = Array.from(text);
        return (
            <motion.span className="inline-block whitespace-nowrap">
                {characters.map((char, i) => (
                    <motion.span
                        key={i}
                        initial={{ opacity: 0, y: 50, rotateX: -90 }}
                        animate={{ opacity: 1, y: 0, rotateX: 0 }}
                        transition={{
                            duration: 0.8,
                            delay: delay + i * 0.05,
                            ease: [0.22, 1, 0.36, 1]
                        }}
                        className="inline-block"
                        style={{ transformOrigin: "bottom" }}
                    >
                        {char === " " ? "\u00A0" : char}
                    </motion.span>
                ))}
            </motion.span>
        );
    };

    const features = [
// ... (rest of features stays same, I will use multi_replace for cleaner edits if needed, but for now focusing on Hero)
        {
            title: "Neural CRM Matrix",
            icon: Bot,
            description: "Autonomously manage customer relationships with predictive churn analysis and self-optimizing lead scoring.",
            color: "blue",
            tech: "Deep Learning • NLP"
        },
        {
            title: "Quantum Quote Engine",
            icon: FileText,
            description: "Proprietary algorithmic pricing that generates multi-variable quotations in less than 200ms.",
            color: "purple",
            tech: "Parallel Processing"
        },
        {
            title: "Employee Synapse Bot",
            icon: MessageSquare,
            description: "Real-time semantic training assistant that builds custom knowledge graphs for every team member.",
            color: "emerald",
            tech: "GPT-4o Optimized"
        },
        {
            title: "Orbix Flux Integration",
            icon: Layers,
            description: "Live-sync infrastructure with Orbix Project system for multi-dimensional resource allocation.",
            color: "rose",
            tech: "Real-time Protocol"
        }
    ];

    const stats = [
        { label: "Efficiency Gain", value: "85%", icon: TrendingUp },
        { label: "Data Points/Sec", value: "2.4M", icon: Zap },
        { label: "Predictive Power", value: "99.2%", icon: Target },
    ];

    return (
        <div className="min-h-screen bg-[#020617] text-white selection:bg-blue-500/30 overflow-x-hidden relative font-['Inter']">
            {/* Dynamic Neural Parallax Background */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <motion.div style={{ y: bgY }} className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(59,130,246,0.05)_0%,rgba(2,6,23,1)_100%)]" />
                
                {/* Neural Filament Tracers */}
                <svg className="absolute inset-0 w-full h-full opacity-20">
                    <motion.path
                        d="M 100,0 Q 150,500 100,1000"
                        stroke="url(#filament-gradient)"
                        strokeWidth="1"
                        fill="none"
                        initial={{ pathLength: 0 }}
                        style={{ pathLength: scrollYProgress }}
                    />
                    <defs>
                        <linearGradient id="filament-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
                            <stop offset="50%" stopColor="#6366f1" stopOpacity="1" />
                            <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                </svg>

                <motion.div
                    style={{ 
                        x: mousePos.x * 0.5, 
                        y: mousePos.y * 0.5,
                        scale: orbScale 
                    }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05] contrast-150 mix-blend-overlay"
                />

                {/* Pulsing Neural Orbs */}
                <motion.div
                    style={{ scale: orbScale, y: useTransform(scrollYProgress, [0, 1], [0, -200]) }}
                    animate={{
                        opacity: [0.1, 0.2, 0.1],
                    }}
                    transition={{ duration: 10, repeat: Infinity }}
                    className="absolute -top-[10%] -left-[10%] w-[80%] h-[80%] bg-blue-600/10 rounded-full blur-[160px]"
                />
                <motion.div
                    style={{ scale: orbScale, y: useTransform(scrollYProgress, [0, 1], [0, 100]) }}
                    animate={{
                        opacity: [0.05, 0.15, 0.05],
                    }}
                    transition={{ duration: 15, repeat: Infinity }}
                    className="absolute -bottom-[20%] -right-[10%] w-[70%] h-[70%] bg-purple-600/10 rounded-full blur-[160px]"
                />
            </div>

            {/* Premium Navigation */}
            <header className="sticky top-0 left-0 w-full z-40 px-8 py-6 backdrop-blur-md bg-slate-950/40 border-b border-white/5">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-4 group"
                    >
                        <div className="relative">
                            <div className="absolute inset-0 bg-blue-500 blur-lg opacity-40 group-hover:opacity-80 transition-opacity" />
                            <div className="relative p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-2xl">
                                <Cpu size={26} className="text-white" />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-xl font-black tracking-tighter uppercase italic flex items-center gap-2">
                                Decora <span className="text-blue-500 not-italic">AI</span>
                                <span className="hidden sm:inline text-xs font-medium text-slate-500 italic not-italic tracking-normal mt-1 border-l border-slate-800 pl-3">Neural Core Engine</span>
                            </h1>
                        </div>
                    </motion.div>

                    <nav className="hidden md:flex items-center gap-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        {['Architecture', 'Neural Network', 'Flux Core', 'Integration'].map((item) => (
                            <button key={item} className="hover:text-blue-400 transition-colors relative group">
                                {item}
                                <span className="absolute -bottom-1 left-0 w-0 h-px bg-blue-400 transition-all group-hover:w-full" />
                            </button>
                        ))}
                    </nav>

                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Protocol Active</span>
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="bg-white text-black px-6 py-2.5 rounded-full font-black text-[10px] uppercase tracking-widest transition-all shadow-2xl shadow-white/5 flex items-center gap-2"
                        >
                            Coming Soon <ChevronRight size={14} strokeWidth={3} />
                        </motion.button>
                    </div>
                </div>
            </header>

            {/* Hero Section v2 */}
            <main className="relative z-10 pt-48">
                <section className="px-6 text-center max-w-6xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 px-5 py-2 rounded-full text-blue-400 text-[10px] font-black uppercase tracking-[0.3em] mb-12 shadow-[0_0_30px_rgba(59,130,246,0.1)]"
                    >
                        <Sparkles size={14} className="text-yellow-400" /> Decora AI Alpha Release Phase
                    </motion.div>

                    <div className="relative inline-block mb-10 overflow-hidden">
                        <motion.h2
                            style={{ opacity: textOpacity, scale: textScale }}
                            className="text-6xl md:text-[10rem] font-black leading-[0.85] tracking-tight perspective-[1000px]"
                        >
                            <AnimatedText text="FUTURE" delay={0.2} /> <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 drop-shadow-[0_10px_20px_rgba(99,102,241,0.2)]">
                                <AnimatedText text="INTELLIGENCE" delay={0.6} />
                            </span>
                        </motion.h2>
                        <motion.div
                            initial={{ width: 0, opacity: 0 }}
                            whileInView={{ width: '100%', opacity: 0.5 }}
                            transition={{ delay: 1.5, duration: 2 }}
                            className="absolute -bottom-4 left-0 h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent"
                        />
                    </div>

                    <motion.p
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-xl md:text-2xl text-slate-400 font-medium max-w-3xl mx-auto leading-relaxed mt-8"
                    >
                        Experience the convergence of architectural design and neural processing.
                        Cookscape's ecosystem is evolving into a self-optimizing digital organism.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="mt-16 flex flex-wrap justify-center gap-6"
                    >
                        <button className="relative group">
                            <div className="absolute inset-0 bg-blue-500 blur-xl opacity-30 group-hover:opacity-60 transition-opacity" />
                            <div className="relative flex items-center gap-3 bg-blue-600 px-12 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] shadow-xl transition-all hover:-translate-y-1 active:scale-95">
                                Join Beta Protocol <ArrowUpRight size={18} />
                            </div>
                        </button>
                        <button className="flex items-center gap-3 bg-slate-900 border border-slate-800 px-12 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-slate-800 transition-all group active:scale-95">
                            Read Manifesto <Terminal size={18} className="text-blue-400 group-hover:rotate-12 transition-transform" />
                        </button>
                    </motion.div>
                </section>

                {/* Dashboard Preview Simulation */}
                <section className="mt-32 px-8 max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1 }}
                        className="relative p-1 bg-gradient-to-br from-white/10 via-transparent to-blue-500/10 rounded-[3rem] overflow-hidden"
                    >
                        <div className="bg-slate-950/80 backdrop-blur-3xl rounded-[2.9rem] p-4 md:p-8 border border-white/5">
                            {/* Mock Terminal Header */}
                            <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-6">
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-rose-500/50" />
                                    <div className="w-3 h-3 rounded-full bg-amber-500/50" />
                                    <div className="w-3 h-3 rounded-full bg-emerald-500/50" />
                                </div>
                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white/5 px-4 py-1.5 rounded-full border border-white/10">
                                    decora_core_0.9.1.sh
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-12">
                                <div className="space-y-8">
                                    <div className="space-y-4">
                                        <h4 className="text-3xl font-black tracking-tight">System Status</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            {[
                                                { label: "Neural Load", val: "14%", color: "blue" },
                                                { label: "Context Window", val: "128k", color: "purple" },
                                                { label: "Sync Latency", val: "4ms", color: "emerald" },
                                                { label: "UPTIME", val: "99.98%", color: "rose" }
                                            ].map((s) => (
                                                <div key={s.label} className="bg-white/5 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors group">
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{s.label}</p>
                                                    <p className={`text-xl font-black text-${s.color}-400 group-hover:scale-105 transition-transform`}>{s.val}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="bg-blue-600/5 p-6 rounded-3xl border border-blue-500/10 relative overflow-hidden">
                                        <Bot className="absolute -right-4 -bottom-4 text-blue-500/10" size={120} />
                                        <h5 className="font-black text-lg mb-2">Live Training Active</h5>
                                        <p className="text-slate-400 text-sm leading-relaxed">AI Bot currently processing 2,400 internal knowledge documents for upcoming release.</p>
                                        <div className="mt-4 flex gap-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                                            <motion.div
                                                animate={{ width: ['0%', '100%'] }}
                                                transition={{ duration: 4, repeat: Infinity }}
                                                className="bg-blue-500 h-full"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <h4 className="text-3xl font-black tracking-tight">Active Matrix</h4>
                                    <div className="bg-slate-900/50 p-6 rounded-[2rem] border border-white/5 relative overflow-hidden group/terminal">
                                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent" />
                                        
                                        {/* Scanning Line Effect */}
                                        <motion.div 
                                            animate={{ top: ['-10%', '110%'] }}
                                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                            className="absolute left-0 w-full h-1 bg-blue-500/10 blur-xl z-0"
                                        />

                                        <div className="relative space-y-4">
                                            {[
                                                "INITIALIZING NEURAL WEIGHTS...",
                                                "SYNCING CRM PROTOCOLS...",
                                                "OPTIMIZING QUOTATION ENGINE...",
                                                "ORBIX FLUX READY.",
                                            ].map((line, i) => (
                                                <motion.div 
                                                    key={i} 
                                                    whileHover={{ x: 10, backgroundColor: 'rgba(59, 130, 246, 0.05)' }}
                                                    className="flex gap-4 font-mono text-xs p-2 rounded-lg transition-colors cursor-default"
                                                >
                                                    <span className="text-slate-600">[{100 + i * 24}]</span>
                                                    <span className={i === 3 ? "text-emerald-400 font-black" : "text-blue-400/80"}>
                                                        {line}
                                                        {i === 3 && <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ duration: 0.8, repeat: Infinity }}>_</motion.span>}
                                                    </span>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button className="bg-white flex items-center justify-center gap-3 py-4 rounded-2xl text-black font-black text-[10px] uppercase tracking-widest">
                                            Run Diagnostics
                                        </button>
                                        <button className="bg-slate-800 flex items-center justify-center gap-3 py-4 rounded-2xl text-white font-black text-[10px] uppercase tracking-widest">
                                            View Logs
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </section>

                {/* Evolution Cards */}
                <section className="px-8 py-40 max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-20">
                        <div className="max-w-xl">
                            <h3 className="text-4xl md:text-5xl font-black tracking-tighter mb-6">EVOLUTIONARY <br /> CAPABILITIES</h3>
                            <p className="text-slate-400 font-medium">Four core pillars of the Decora AI ecosystem designed to redefine operational speed and precision.</p>
                        </div>
                        <div className="flex gap-4">
                            <div className="h-12 w-12 rounded-full border border-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-colors cursor-pointer"><ChevronRight size={24} className="rotate-180" /></div>
                            <div className="h-12 w-12 rounded-full border border-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-colors cursor-pointer"><ChevronRight size={24} /></div>
                        </div>
                    </div>

                    <motion.div
                        variants={{
                            hidden: { opacity: 0 },
                            visible: {
                                opacity: 1,
                                transition: { staggerChildren: 0.1 }
                            }
                        }}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
                    >
                        {features.map((feature, idx) => {
                            const Icon = feature.icon;
                            return (
                                <motion.div
                                    key={idx}
                                    variants={{
                                        hidden: { y: 30, opacity: 0 },
                                        visible: { y: 0, opacity: 1 }
                                    }}
                                    whileHover={{ y: -12 }}
                                    className="group relative bg-[#0f172a]/20 backdrop-blur-2xl p-0.5 rounded-[3rem] overflow-hidden transition-all duration-500"
                                >
                                    {/* Rotating Border Effect */}
                                    <div className="absolute inset-x-0 top-0 h-1/2 w-full bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity blur-md animate-pulse" />
                                    
                                    <div className="relative bg-slate-950/60 h-full w-full rounded-[3rem] p-8 border border-white/5 group-hover:border-blue-500/20 transition-all overflow-hidden">
                                        <div className={`absolute -right-8 -top-8 p-16 bg-${feature.color}-500/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity`} />

                                        <div className="relative z-10">
                                            <motion.div 
                                                whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                                                className={`p-4 bg-${feature.color}-500/10 rounded-2xl w-fit mb-8 border border-${feature.color}-500/20 shadow-inner`}
                                            >
                                                <Icon className={`text-${feature.color}-400`} size={32} />
                                            </motion.div>
                                            <h3 className="text-xl font-black mb-4 tracking-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-blue-400 transition-all duration-500">{feature.title}</h3>
                                            <p className="text-slate-400 text-sm font-medium leading-relaxed mb-6 group-hover:text-slate-300 transition-colors">
                                                {feature.description}
                                            </p>
                                            <div className="pt-6 border-t border-white/5 flex justify-between items-center">
                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] group-hover:text-blue-400 transition-colors">{feature.tech}</span>
                                                <Zap size={14} className="text-slate-500 group-hover:text-yellow-400 transition-colors animate-pulse" />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                </section>

                {/* Construction Callout v2 */}
                <section className="relative px-8 py-40 overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    <div className="max-w-4xl mx-auto text-center relative z-10">
                        <motion.div
                            initial={{ opacity: 0, rotate: 0 }}
                            whileInView={{ opacity: 1, rotate: 360 }}
                            viewport={{ once: true }}
                            transition={{ duration: 2, ease: "linear", repeat: Infinity }}
                            className="bg-gradient-to-br from-blue-500 to-indigo-600 h-1 w-1 mx-auto mb-10 shadow-[0_0_50px_rgba(59,130,246,1)]"
                        />
                        <h3 className="text-5xl md:text-7xl font-black mb-10 tracking-tighter">THE NEURAL <br /> PROTOCOL</h3>
                        <p className="text-slate-400 text-xl font-medium leading-relaxed max-w-2xl mx-auto">
                            "Decora AI is not just a tool; it is the structural integrity of our future growth. We are engineering a system that thinks with us, optimizes for us, and scales beyond us."
                        </p>
                        <div className="mt-16 flex justify-center gap-12 grayscale opacity-30 hover:grayscale-0 hover:opacity-100 transition-all duration-700">
                            <Globe size={40} />
                            <BarChart3 size={40} />
                            <ShieldCheck size={40} />
                            <Network size={40} />
                        </div>
                    </div>
                </section>

                {/* Footer v2 */}
                <footer className="px-8 pt-20 pb-40 border-t border-white/5 bg-slate-950/20">
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.4em] text-slate-500 mb-2">Developed By</p>
                            <p className="text-2xl font-black tracking-tighter">ORBIX PROJECTS AI</p>
                        </div>
                        <div className="text-center md:text-right">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 mb-2 underline cursor-pointer">Security Protocol v4.0.1</p>
                            <p className="text-xs font-medium text-slate-600 max-w-xs leading-relaxed">
                                Decora AI Neural Engine is currently in restricted access alpha. Some modules may require secondary authorization.
                            </p>
                        </div>
                    </div>
                </footer>
            </main>
        </div>
    );
};

const Target = ({ className, size }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
    </svg>
);

export default DecoraAI;
