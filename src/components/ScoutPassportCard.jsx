import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const ScoutPassportCard = ({ fullName, scoutTitle, agencyName, agencyLogo, isAccredited, className = '' }) => {
    return (
        <div className={`flex justify-center perspective-1000 ${className}`}>
            <motion.div 
                className={`w-80 h-48 rounded-2xl p-5 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border backdrop-blur-xl shadow-2xl relative overflow-hidden flex flex-col justify-between group transition-colors duration-500 ${isAccredited ? 'border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.3)]' : 'border-slate-700/50'}`}
                initial={{ rotateX: 10, rotateY: -10, opacity: 0 }}
                animate={{ rotateX: 0, rotateY: 0, opacity: 1 }}
                transition={{ duration: 0.6, type: "spring" }}
            >
                {/* Background Effect */}
                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#22d3ee 1px, transparent 1px), linear-gradient(90deg, #22d3ee 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-[40px] pointer-events-none"></div>

                {/* Top Row */}
                <div className="flex justify-between items-start z-10">
                    <div>
                        <div className="flex items-center gap-1.5 opacity-90">
                            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                            <span className="text-[10px] font-black tracking-[0.2em] text-slate-300">CAVIO</span>
                        </div>
                        <div className="text-[10px] tracking-widest text-slate-500 font-semibold mt-1">SCOUT PASSPORT</div>
                    </div>
                    
                    {/* Agency Logo or Placeholder */}
                    <div className="w-10 h-10 rounded-full bg-slate-900/80 border border-slate-700 flex items-center justify-center overflow-hidden relative">
                        {agencyLogo ? (
                            <img src={agencyLogo} alt="Agency Logo" className="w-full h-full object-cover" />
                        ) : agencyName ? (
                            <span className="text-cyan-400 font-bold text-xs uppercase">{agencyName.substring(0,2)}</span>
                        ) : (
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/20 to-transparent animate-[scan_2s_ease-in-out_infinite]"></div>
                        )}
                    </div>
                </div>

                {/* Bottom Row */}
                <div className="z-10 mt-auto">
                    <p className="text-lg font-black text-slate-100 uppercase tracking-wide truncate">
                        {fullName || 'Name'}
                    </p>
                    <p className="text-cyan-400 text-[10px] font-bold tracking-widest uppercase mt-0.5 truncate">
                        {scoutTitle || 'Authorized Scout'}
                    </p>
                    {agencyName && (
                        <p className="text-slate-400 text-xs mt-2 truncate">
                            @ {agencyName}
                        </p>
                    )}
                </div>
                
                {/* Accredited Overlay Flash */}
                <AnimatePresence>
                    {isAccredited && (
                        <motion.div 
                            className="absolute inset-0 bg-cyan-400/10 z-20 pointer-events-none flex items-center justify-center backdrop-blur-[2px]"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <motion.div 
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="px-4 py-2 bg-slate-950/80 border border-cyan-400 rounded-lg text-cyan-400 text-sm font-bold tracking-widest uppercase shadow-[0_0_20px_rgba(34,211,238,0.4)]"
                            >
                                Akkreditiert
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};
