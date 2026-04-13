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
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [activeTab, setActiveTab] = useState(0);
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

    // Phase 2: 3D-Simulated Neural Core
    const NeuralCore = () => {
        const coreScale = useTransform(scrollYProgress, [0, 0.3], [1, 2.5]);
        const coreRotate = useTransform(scrollYProgress, [0, 1], [0, 360]);

        return (
            <motion.div 
                style={{ scale: coreScale, rotate: coreRotate }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 pointer-events-none opacity-20"
            >
                <div className="relative w-[300px] h-[300px] md:w-[600px] md:h-[600px]">
                    {[...Array(5)].map((_, i) => (
                        <motion.div
                            key={i}
                            animate={{
                                rotate: [0, 360],
                                scale: [1, 1.1, 1],
                            }}
                            transition={{
                                duration: 10 + i * 5,
                                repeat: Infinity,
                                ease: "linear"
                            }}
                            style={{
                                border: `1px border-${['blue', 'purple', 'indigo', 'emerald', 'blue'][i]}-500/20`,
                                width: '100%',
                                height: '100%',
                                borderRadius: '40% 60% 70% 30% / 40% 50% 60% 50%',
                                position: 'absolute',
                                filter: 'blur(1px)'
                            }}
                            className={`border border-${['blue', 'indigo', 'purple', 'cyan', 'blue'][i]}-500/10`}
                        />
                    ))}
                    <div className="absolute inset-x-0 inset-y-0 m-auto w-4 h-4 bg-blue-400 rounded-full blur-[20px] shadow-[0_0_40px_rgba(59,130,246,1)]" />
                </div>
            </motion.div>
        );
    };

    // Phase 2: Data Dust Particle System
    const DataParticles = () => {
        const particles = [...Array(30)];
        return (
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                {particles.map((_, i) => (
                    <motion.div
                        key={i}
                        initial={{ 
                            x: Math.random() * 100 + "%", 
                            y: Math.random() * 100 + "%",
                            opacity: 0 
                        }}
                        animate={{ 
                            y: [null, "-20%"],
                            opacity: [0, 0.4, 0],
                            scale: [0, 1, 0.5]
                        }}
                        transition={{ 
                            duration: 10 + Math.random() * 20,
                            repeat: Infinity,
                            delay: Math.random() * 10
                        }}
                        className="absolute w-0.5 h-0.5 bg-blue-400 rounded-full blur-[0.5px]"
                    />
                ))}
            </div>
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
                <DataParticles />
                
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

                <NeuralCore />

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

                {/* Phase 2: Horizontal Evolution Section */}
                <section className="h-[300vh] relative z-10" id="evolution">
                    <div className="sticky top-0 h-screen overflow-hidden">
                        <motion.div 
                            style={{ x: useTransform(scrollYProgress, [0.6, 0.9], ['0%', '-66.6%']) }}
                            className="flex h-full w-[300%]"
                        >
                            {/* Panel 1: Binary Data */}
                            <div className="w-screen h-full flex items-center justify-center p-20 relative">
                                <div className="absolute inset-0 bg-blue-900/5 backdrop-blur-3xl" />
                                <div className="relative z-10 max-w-4xl grid md:grid-cols-2 gap-20 items-center">
                                    <div>
                                        <motion.div 
                                            initial={{ opacity: 0, x: -50 }}
                                            whileInView={{ opacity: 1, x: 0 }}
                                            className="text-xs font-black text-blue-500 uppercase tracking-[0.5em] mb-4"
                                        >
                                            Phase 01: Raw Ingestion
                                        </motion.div>
                                        <h3 className="text-5xl md:text-7xl font-black mb-8 leading-tight">BINARY <br /> FOUNDATIONS</h3>
                                        <p className="text-slate-400 text-lg leading-relaxed">
                                            Every micro-interaction within Orbix contributes to a massive data pool. 
                                            Decora AI begins its journey by structuring 2.4M bits of unstructured metadata per second.
                                        </p>
                                    </div>
                                    <div className="relative aspect-square bg-slate-900/50 rounded-[3rem] border border-white/5 flex items-center justify-center p-10 overflow-hidden group">
                                        <div className="grid grid-cols-4 gap-4 opacity-20 group-hover:opacity-40 transition-opacity">
                                            {[...Array(16)].map((_, i) => (
                                                <div key={i} className="w-4 h-4 bg-blue-500 rounded-sm animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
                                            ))}
                                        </div>
                                        <Zap className="absolute text-blue-400" size={60} />
                                    </div>
                                </div>
                            </div>

                            {/* Panel 2: Neural Processing */}
                            <div className="w-screen h-full flex items-center justify-center p-20 relative border-l border-white/5">
                                <div className="absolute inset-0 bg-purple-900/5 backdrop-blur-3xl" />
                                <div className="relative z-10 max-w-4xl grid md:grid-cols-2 gap-20 items-center">
                                    <div className="order-2 md:order-1 relative aspect-square bg-slate-900/50 rounded-[3rem] border border-white/5 flex items-center justify-center p-10 overflow-hidden">
                                        <Network className="text-purple-400 absolute" size={120} />
                                        <motion.div 
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                                            className="absolute inset-0 border-2 border-dashed border-purple-500/20 rounded-full m-10"
                                        />
                                    </div>
                                    <div className="order-1 md:order-2">
                                        <motion.div 
                                            initial={{ opacity: 0, x: 50 }}
                                            whileInView={{ opacity: 1, x: 0 }}
                                            className="text-xs font-black text-purple-500 uppercase tracking-[0.5em] mb-4"
                                        >
                                            Phase 02: Neural Synthesis
                                        </motion.div>
                                        <h3 className="text-5xl md:text-7xl font-black mb-8 leading-tight">THE SYNAPSE <br /> ENGINE</h3>
                                        <p className="text-slate-400 text-lg leading-relaxed">
                                            Data is weighted and processed through our proprietary neural matrix. 
                                            Context is established across HR, Project Management, and Client Relations.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Panel 3: Human Synergy */}
                            <div className="w-screen h-full flex items-center justify-center p-20 relative border-l border-white/5">
                                <div className="absolute inset-0 bg-emerald-900/5 backdrop-blur-3xl" />
                                <div className="relative z-10 max-w-4xl text-center">
                                    <motion.div 
                                        initial={{ opacity: 0, y: 30 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        className="text-xs font-black text-emerald-500 uppercase tracking-[0.5em] mb-4"
                                    >
                                        Final Phase: Harmonic Output
                                    </motion.div>
                                    <h3 className="text-5xl md:text-9xl font-black mb-8 leading-tight tracking-tighter">HUMAN <br /> SYNERGY</h3>
                                    <p className="text-slate-400 text-xl leading-relaxed max-w-2xl mx-auto mb-12">
                                        The end result is not just data, but direct human enhancement. 
                                        Orbix becomes more than a tool—it becomes a partner.
                                    </p>
                                    <button className="bg-white text-black px-12 py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-transform active:scale-95">
                                        Initialize Protocol
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
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

                {/* Construction Callout v2 with Reveal */}
                <section className="relative px-8 py-60 overflow-hidden bg-slate-950">
                    <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    
                    <motion.div 
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        transition={{ duration: 2 }}
                        className="max-w-4xl mx-auto text-center relative z-10"
                    >
                        <div className="relative inline-block overflow-hidden">
                            <motion.h3 
                                whileHover={{ scale: 1.05 }}
                                className="text-6xl md:text-[8rem] font-black mb-10 tracking-tighter leading-[0.8] text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-800"
                            >
                                THE NEURAL <br /> PROTOCOL
                            </motion.h3>
                            <motion.div 
                                animate={{ left: ['-100%', '200%'] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                className="absolute top-0 w-1/4 h-full bg-blue-500/20 blur-[60px] -skew-x-12"
                            />
                        </div>
                        
                        <p className="text-slate-500 text-xl md:text-2xl font-medium leading-relaxed max-w-2xl mx-auto italic mt-12 mb-20 opacity-60 hover:opacity-100 transition-opacity duration-1000">
                            "Decora AI is not just a tool; it is the structural integrity of our future growth. We are engineering a system that thinks with us, optimizes for us, and scales beyond us."
                        </p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-2xl mx-auto">
                            {[
                                { icon: Globe, label: "Global Sync" },
                                { icon: BarChart3, label: "Neural Meta" },
                                { icon: ShieldCheck, label: "Safe Access" },
                                { icon: Network, label: "Synapse Link" }
                            ].map((item, i) => (
                                <motion.div 
                                    key={i}
                                    whileHover={{ y: -10 }}
                                    className="flex flex-col items-center gap-4 group"
                                >
                                    <div className="p-6 bg-slate-900 rounded-[2rem] border border-white/5 group-hover:border-blue-500/30 group-hover:bg-blue-500/5 transition-all">
                                        <item.icon className="text-slate-600 group-hover:text-blue-400" size={32} />
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-700 group-hover:text-slate-400">{item.label}</span>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
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
