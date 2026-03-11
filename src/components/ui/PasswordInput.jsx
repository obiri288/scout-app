import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Eye, EyeOff } from 'lucide-react';
import { inputStyle } from '../../lib/styles';

export const PasswordInput = ({
    value,
    onChange,
    placeholder = "Passwort",
    required = true,
    showChecklist = false,
    onValidChange
}) => {
    const [showPassword, setShowPassword] = useState(false);

    // Criteria
    const criteria = [
        { id: 'length', text: 'Min. 8 Zeichen', check: (v) => v.length >= 8 },
        { id: 'uppercase', text: 'Min. 1 Großbuchstabe', check: (v) => /[A-Z]/.test(v) },
        { id: 'number', text: 'Min. 1 Zahl', check: (v) => /[0-9]/.test(v) },
        { id: 'special', text: 'Min. 1 Sonderzeichen', check: (v) => /[!@#$%^&*(),.?":{}|<>]/.test(v) },
    ];

    const isValid = criteria.every(c => c.check(value));

    useEffect(() => {
        if (onValidChange) {
            onValidChange(isValid);
        }
    }, [isValid, onValidChange]);

    return (
        <div className="space-y-2 w-full">
            <div className="relative">
                <input
                    type={showPassword ? "text" : "password"}
                    placeholder={placeholder}
                    required={required}
                    className={`${inputStyle} pr-10`}
                    style={{ color: 'var(--input-text, #0f172a)', backgroundColor: 'var(--input-bg, #ffffff)', WebkitTextFillColor: 'var(--input-text, #0f172a)' }}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                />
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-cyan-500 dark:text-slate-400 dark:hover:text-cyan-400 transition-colors"
                >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            </div>

            {showChecklist && (
                <div className="space-y-1.5 mt-2 bg-black/20 p-3 rounded-xl border border-white/5">
                    {criteria.map((c) => {
                        const met = c.check(value);
                        return (
                            <div key={c.id} className="flex items-center gap-2 text-xs">
                                <motion.div
                                    initial={false}
                                    animate={{
                                        color: met ? '#22d3ee' : '#64748b', // Text-cyan-400 vs slate-500
                                        scale: met ? [1, 1.2, 1] : 1
                                    }}
                                    transition={{ duration: 0.3 }}
                                >
                                    {met ? (
                                        <CheckCircle2 size={14} className="text-cyan-400" />
                                    ) : (
                                        <XCircle size={14} className="text-slate-500" />
                                    )}
                                </motion.div>
                                <motion.span
                                    initial={false}
                                    animate={{
                                        color: met ? '#22d3ee' : '#64748b'
                                    }}
                                    transition={{ duration: 0.3 }}
                                >
                                    {c.text}
                                </motion.span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
