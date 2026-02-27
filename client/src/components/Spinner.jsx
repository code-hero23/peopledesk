import React from 'react';
import { motion } from 'framer-motion';

const Spinner = () => {
    return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="relative">
                {/* Outer Ring */}
                <motion.div
                    animate={{
                        rotate: 360,
                        transition: { duration: 1.5, repeat: Infinity, ease: "linear" }
                    }}
                    className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full"
                />

                {/* Inner Ring (Pulsing) */}
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.6, 0.3],
                        transition: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                    }}
                    className="absolute inset-0 m-auto w-8 h-8 bg-blue-500/20 rounded-full"
                />

                {/* Central Dot */}
                <div className="absolute inset-0 m-auto w-2 h-2 bg-blue-600 rounded-full" />
            </div>
        </div>
    );
};

export default Spinner;
