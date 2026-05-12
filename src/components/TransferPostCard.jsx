import React from 'react';
import { motion } from 'framer-motion';
import { Shield, ChevronRight, Award, Zap, CheckCircle, MapPin, Trophy, Clock } from 'lucide-react';
import { VerificationBadge } from './VerificationBadge';

const TransferPostCard = ({ post, onUserClick }) => {
    const { metadata, players_master, user_id } = post;
    const player = players_master || { 
        full_name: metadata?.player_name || 'Unbekannter Spieler', 
        avatar_url: metadata?.player_avatar 
    };

    return (
        <div className="relative bg-zinc-950 aspect-[4/5] overflow-hidden flex flex-col group">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 via-zinc-950 to-purple-900/40" />
                <div className="absolute inset-0 opacity-20" style={{ 
                    backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)', 
                    backgroundSize: '24px 24px' 
                }} />
                
                {/* Moving Glows */}
                <motion.div 
                    animate={{ 
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.5, 0.3],
                    }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-1/4 -right-1/4 w-full h-full bg-cyan-500/10 blur-[120px] rounded-full"
                />
                <motion.div 
                    animate={{ 
                        scale: [1, 1.3, 1],
                        opacity: [0.2, 0.4, 0.2],
                    }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear", delay: 2 }}
                    className="absolute -bottom-1/4 -left-1/4 w-full h-full bg-purple-500/10 blur-[120px] rounded-full"
                />
            </div>

            {/* Header / Brand */}
            <div className="relative z-10 px-6 pt-8 flex justify-between items-start">
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-full px-3 py-1 flex items-center gap-2">
                    <Zap size={14} className="text-cyan-400 fill-cyan-400" />
                    <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Official Transfer News</span>
                </div>
                <div className="w-10 h-10 bg-white/5 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center">
                    <Award size={20} className="text-amber-400" />
                </div>
            </div>

            {/* Main Content */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 text-center">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6"
                >
                    <h2 className="text-white text-4xl font-black italic uppercase tracking-tighter leading-none mb-2 drop-shadow-2xl">
                        Done Deal
                    </h2>
                    <div className="h-1 w-24 bg-gradient-to-r from-cyan-500 to-purple-500 mx-auto rounded-full" />
                </motion.div>

                {/* Clubs Comparison */}
                <div className="w-full grid grid-cols-[1fr,40px,1fr] gap-4 items-center mb-10">
                    {/* Old Club */}
                    <motion.div 
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="flex flex-col items-center"
                    >
                        <div className="w-20 h-20 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl flex items-center justify-center mb-3 shadow-xl group-hover:border-white/20 transition-all duration-500">
                            <Shield size={40} className="text-zinc-600" />
                        </div>
                        <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1">Abgebend</span>
                        <span className="text-white font-black text-xs truncate w-full px-2">{metadata?.old_club_name || 'Vereinslos'}</span>
                    </motion.div>

                    {/* Arrow */}
                    <div className="flex justify-center">
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white">
                            <ChevronRight size={20} />
                        </div>
                    </div>

                    {/* New Club */}
                    <motion.div 
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="flex flex-col items-center"
                    >
                        <div className="w-24 h-24 bg-cyan-500/10 backdrop-blur-md border border-cyan-500/30 rounded-2xl flex items-center justify-center mb-3 shadow-2xl shadow-cyan-500/20 group-hover:border-cyan-500/50 transition-all duration-500 relative">
                            <Shield size={48} className="text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
                            <div className="absolute -top-2 -right-2 bg-emerald-500 text-white rounded-full p-1 border-2 border-zinc-950">
                                <CheckCircle size={12} fill="currentColor" fillOpacity="0.2" />
                            </div>
                        </div>
                        <span className="text-cyan-400 text-[10px] font-black uppercase tracking-widest mb-1">Aufnehmend</span>
                        <span className="text-white font-black text-sm truncate w-full px-2">{metadata?.new_club_name}</span>
                    </motion.div>
                </div>

                {/* Player Profile */}
                <motion.div 
                    whileHover={{ scale: 1.05 }}
                    onClick={() => onUserClick && onUserClick(player)}
                    className="flex flex-col items-center cursor-pointer mb-8"
                >
                    <div className="w-16 h-16 rounded-full border-2 border-white/20 p-1 mb-2 group-hover:border-cyan-400 transition-colors duration-300">
                        <div className="w-full h-full rounded-full overflow-hidden bg-zinc-800">
                            {player.avatar_url ? (
                                <img src={player.avatar_url} className="w-full h-full object-cover" alt={player.full_name} />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-zinc-600 font-bold">
                                    {player.full_name?.charAt(0)}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="text-white font-bold text-base">{player.full_name}</span>
                        <VerificationBadge size={14} status={player.verification_status} />
                    </div>
                    <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">{metadata?.league || 'Fußballprofi'}</span>
                </motion.div>

                {/* Info Box (Glassmorphism) */}
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 }}
                    className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 grid grid-cols-1 gap-3 text-left relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-bl-full -z-10" />
                    
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                            <MapPin size={16} />
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase text-zinc-500 tracking-widest leading-none mb-1">Position/Rolle</p>
                            <p className="text-white text-xs font-bold">{metadata?.role || 'Profi'}</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-400">
                            <Trophy size={16} />
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase text-zinc-500 tracking-widest leading-none mb-1">Liga</p>
                            <p className="text-white text-xs font-bold">{metadata?.league || 'Wettbewerb'}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                            <Clock size={16} />
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase text-zinc-500 tracking-widest leading-none mb-1">Zeitraum/Vertrag</p>
                            <p className="text-white text-xs font-bold">
                                {metadata?.start_date ? `Ab ${new Date(metadata.start_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}` : 'Sofort'}
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Bottom Glow */}
            <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-cyan-500/20 to-transparent z-0" />
        </div>
    );
};

export default TransferPostCard;
