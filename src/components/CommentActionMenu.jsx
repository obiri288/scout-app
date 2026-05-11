import React from 'react';
import { motion } from 'framer-motion';
import { Trash2, Flag, X } from 'lucide-react';

export const CommentActionMenu = ({ comment, session, videoCreatorId, isOpen, onClose, onDelete, onReport }) => {
    if (!isOpen || !comment) return null;

    const isMyComment = session?.user?.id === comment.user_id;
    const isVideoOwner = session?.user?.id === videoCreatorId;
    const canDelete = isMyComment || isVideoOwner;

    return (
        <div className="fixed inset-0 z-[11000] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="relative w-full max-w-md bg-zinc-900 rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl p-8 pb-12 sm:pb-8"
            >
                <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-8 sm:hidden" />
                
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-xl font-black text-white">Kommentar-Optionen</h3>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-1">Aktionen & Sicherheit</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-zinc-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-3">
                    {canDelete && (
                        <button 
                            onClick={() => { onDelete(comment.id); onClose(); }}
                            className="w-full flex items-center gap-4 p-5 rounded-3xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all font-black text-left"
                        >
                            <div className="w-10 h-10 rounded-2xl bg-red-500/10 flex items-center justify-center">
                                <Trash2 size={20} />
                            </div>
                            <div className="flex-1">
                                <span>Löschen</span>
                                <p className="text-[10px] opacity-60 font-bold uppercase tracking-tight">Unwiderruflich entfernen</p>
                            </div>
                        </button>
                    )}
                    
                    {!isMyComment && (
                        <button 
                            onClick={() => { onReport(comment); onClose(); }}
                            className="w-full flex items-center gap-4 p-5 rounded-3xl bg-white/5 text-white hover:bg-white/10 transition-all font-black text-left"
                        >
                            <div className="w-10 h-10 rounded-2xl bg-zinc-800 flex items-center justify-center text-red-500">
                                <Flag size={20} />
                            </div>
                            <div className="flex-1">
                                <span>🚩 Kommentar melden</span>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tight">An Moderation senden</p>
                            </div>
                        </button>
                    )}

                    <button 
                        onClick={onClose}
                        className="w-full py-4 text-zinc-500 font-bold hover:text-white transition-colors text-sm mt-4"
                    >
                        Abbrechen
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
