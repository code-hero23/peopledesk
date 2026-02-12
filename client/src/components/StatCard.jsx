import { motion } from 'framer-motion';

const StatCard = ({ title, value, icon, color, onClick }) => {
    const colorMap = {
        blue: {
            gradient: 'from-indigo-500 via-blue-500 to-cyan-500',
            shadow: 'shadow-blue-300/50',
            glow: 'group-hover:shadow-blue-400/60'
        },
        teal: {
            gradient: 'from-teal-400 via-emerald-500 to-green-500',
            shadow: 'shadow-teal-300/50',
            glow: 'group-hover:shadow-teal-400/60'
        },
        amber: {
            gradient: 'from-amber-400 via-orange-500 to-red-500',
            shadow: 'shadow-amber-300/50',
            glow: 'group-hover:shadow-amber-400/60'
        },
        purple: {
            gradient: 'from-purple-500 via-fuchsia-500 to-pink-500',
            shadow: 'shadow-purple-300/50',
            glow: 'group-hover:shadow-purple-400/60'
        },
        green: {
            gradient: 'from-green-400 via-emerald-500 to-teal-500',
            shadow: 'shadow-green-300/50',
            glow: 'group-hover:shadow-green-400/60'
        },
        orange: {
            gradient: 'from-orange-400 via-red-500 to-pink-500',
            shadow: 'shadow-orange-300/50',
            glow: 'group-hover:shadow-orange-400/60'
        },
    };

    const colors = colorMap[color] || colorMap.blue;

    return (
        <motion.div
            whileHover={{
                scale: 1.05,
                y: -8,
                rotateY: 5,
            }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 30, rotateX: -15 }}
            animate={{
                opacity: 1,
                y: 0,
                rotateX: 0,
            }}
            transition={{
                duration: 0.5,
                ease: [0.34, 1.56, 0.64, 1],
                type: "spring",
                stiffness: 100
            }}
            onClick={onClick}
            className={`bg-gradient-to-br ${colors.gradient} p-6 rounded-3xl shadow-xl ${colors.shadow} hover:shadow-2xl ${colors.glow} transition-all duration-500 ${onClick ? 'cursor-pointer' : ''} group relative overflow-hidden`}
            style={{ transformStyle: 'preserve-3d' }}
        >
            {/* Shimmer effect */}
            <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20"
                animate={{
                    x: ['-100%', '100%'],
                }}
                transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    repeatDelay: 3,
                    ease: "easeInOut"
                }}
            />

            {/* Floating particles effect */}
            <div className="absolute inset-0 opacity-20">
                {[...Array(3)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-2 h-2 bg-white rounded-full"
                        style={{
                            left: `${20 + i * 30}%`,
                            top: `${30 + i * 20}%`,
                        }}
                        animate={{
                            y: [-10, -20, -10],
                            opacity: [0.3, 0.6, 0.3],
                        }}
                        transition={{
                            duration: 2 + i * 0.5,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: i * 0.3,
                        }}
                    />
                ))}
            </div>

            {/* Pulsing glow */}
            <motion.div
                className="absolute inset-0 bg-white rounded-3xl opacity-0 group-hover:opacity-10"
                animate={{
                    scale: [1, 1.05, 1],
                    opacity: [0.05, 0.15, 0.05],
                }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />

            <div className="relative z-10 flex items-center justify-between">
                <div>
                    <motion.p
                        className="text-white/90 text-sm font-bold uppercase tracking-wider mb-1"
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        {title}
                    </motion.p>
                    <motion.p
                        className="text-5xl font-black text-white drop-shadow-lg"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{
                            delay: 0.3,
                            type: "spring",
                            stiffness: 200,
                            damping: 10
                        }}
                        whileHover={{
                            scale: 1.1,
                            transition: { duration: 0.2 }
                        }}
                    >
                        {value}
                    </motion.p>
                </div>
                <motion.div
                    className="text-6xl filter drop-shadow-2xl"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                        delay: 0.4,
                        type: "spring",
                        stiffness: 150
                    }}
                    whileHover={{
                        rotate: [0, -15, 15, -15, 0],
                        scale: 1.3,
                        transition: { duration: 0.6 }
                    }}
                >
                    {icon}
                </motion.div>
            </div>
        </motion.div>
    );
};

export default StatCard;
