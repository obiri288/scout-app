import React from 'react';
import { motion } from 'framer-motion';

/**
 * Reusable animated empty state component.
 * Used across the app to replace plain-text "No data" messages with motivating UX.
 */
export const EmptyState = ({ icon: Icon, title, description, actionLabel, onAction, variant = 'default' }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className={`flex flex-col items-center justify-center text-center ${variant === 'subtle' ? 'py-10' : 'py-16 px-6'}`}
        >
            {Icon && (
                <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.15, type: "spring", stiffness: 300, damping: 20 }}
                    className="mb-5"
                >
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-500/15 to-amber-600/5 border border-amber-500/10 flex items-center justify-center shadow-lg shadow-amber-500/5">
                        <Icon size={36} className="text-amber-400/60" />
                    </div>
                </motion.div>
            )}
            <motion.h3
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}
                className="text-lg font-black text-foreground mb-2"
            >
                {title}
            </motion.h3>
            {description && (
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.35 }}
                    className="text-sm text-muted-foreground max-w-[260px] leading-relaxed mb-5"
                >
                    {description}
                </motion.p>
            )}
            {actionLabel && onAction && (
                <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onAction}
                    className="bg-gradient-to-r from-amber-400 to-orange-500 text-black font-bold text-sm px-6 py-2.5 rounded-xl shadow-lg shadow-amber-900/30 border border-amber-400/20 transition-all"
                >
                    {actionLabel}
                </motion.button>
            )}
        </motion.div>
    );
};
