import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Share2, Link as LinkIcon, User, Loader2, MessageSquare 
} from 'lucide-react';
import { VerificationBadge } from './VerificationBadge';
import { useToast } from '../contexts/ToastContext';
import * as api from '../lib/api';

export const ShareModal = ({ isOpen, onClose, shareText, shareUrl, session }) => {
    const { addToast } = useToast();
    const [partners, setPartners] = useState([]);
    const [loading, setLoading] = useState(false);
    const [sendingTo, setSendingTo] = useState(null); 
    const [sentUsers, setSentUsers] = useState(new Set()); 

    useEffect(() => {
        if (isOpen && session?.user?.id) {
            setLoading(true);
            api.getRecentChatPartners(session.user.id)
                .then(data => setPartners(data))
                .catch(err => console.error("Error fetching chat partners for share:", err))
                .finally(() => setLoading(false));
        } else {
            if (!isOpen) {
               setSentUsers(new Set());
            }
        }
    }, [isOpen, session?.user?.id]);

    const handleNativeShare = async () => {
        try {
            if (navigator.share) {
                await navigator.share({
                    title: 'CAVIOS Scouting',
                    text: shareText,
                    url: shareUrl
                });
            } else {
                handleCopyLink();
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error("Error sharing:", error);
                handleCopyLink();
            }
        }
        onClose();
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
            addToast("Link kopiert!", 'success');
        } catch (err) {
            addToast("Fehler beim Kopieren.", 'error');
        }
        onClose();
    };

    const handleSendInternal = async (partner) => {
        if (!session?.user?.id) return;
        setSendingTo(partner.user_id);
        try {
            const message = `Schau dir dieses Video an: ${shareUrl}`;
            await api.sendMessage(session.user.id, partner.user_id, message);
            setSentUsers(prev => new Set(prev).add(partner.user_id));
            addToast("Gesendet!", 'success');
        } catch (err) {
            addToast("Fehler beim Senden.", 'error');
        } finally {
            setSendingTo(null);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center">
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
                    onClick={onClose}
                />
                
                <motion.div 
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl flex flex-col shadow-2xl border border-border pb-safe max-h-[85vh] overflow-hidden"
                >
                    <div className="w-full flex justify-center pt-3 pb-2 cursor-pointer" onClick={onClose}>
                        <div className="w-12 h-1.5 bg-border rounded-full" />
                    </div>
                    
                    <div className="px-6 pb-4 border-b border-border flex justify-between items-center">
                        <h2 className="text-xl font-black text-foreground">Teilen</h2>
                        <button onClick={onClose} className="p-2 bg-black/5 dark:bg-white/5 rounded-full text-muted-foreground hover:text-foreground transition">
                            <span className="text-xl font-bold leading-none px-1">×</span>
                        </button>
                    </div>

                    <div className="p-4 space-y-3 border-b border-border flex gap-2">
                        <button 
                            onClick={handleNativeShare} 
                            className="flex-1 flex flex-col items-center justify-center gap-2 py-4 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-2xl transition"
                        >
                            <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                                <Share2 size={20} />
                            </div>
                            <span className="text-xs font-bold text-foreground">Extern teilen</span>
                        </button>
                        
                        <button 
                            onClick={handleCopyLink} 
                            className="flex-1 flex flex-col items-center justify-center gap-2 py-4 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-2xl transition"
                        >
                            <div className="w-12 h-12 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-foreground border border-border">
                                <LinkIcon size={20} />
                            </div>
                            <span className="text-xs font-bold text-foreground">Link kopieren</span>
                        </button>
                    </div>

                    {session && (
                        <div className="flex-1 overflow-y-auto min-h-[250px]">
                            <div className="px-6 pt-4 pb-2">
                                <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Im Messenger senden</h3>
                            </div>
                            
                            {loading ? (
                                <div className="flex justify-center items-center py-10">
                                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : partners.length > 0 ? (
                                <div className="px-2 pb-4 space-y-1">
                                    {partners.map(partner => (
                                        <div key={partner.user_id} className="flex items-center justify-between p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-2xl transition">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-2xl overflow-hidden bg-card border border-border flex-shrink-0">
                                                    {partner.avatar_url ? (
                                                        <img src={partner.avatar_url} alt={partner.full_name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <img src="/cavios-icon.png" className="w-full h-full object-contain p-3 opacity-60" />
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[14px] font-bold text-foreground flex items-center gap-1.5">
                                                        {partner.full_name}
                                                        {partner.verification_status && partner.verification_status !== 'unverified' && (
                                                            <VerificationBadge size={14} status={partner.verification_status} verificationStatus={partner.verification_status} />
                                                        )}
                                                    </span>
                                                    <span className="text-[11px] text-muted-foreground">@{partner.username}</span>
                                                </div>
                                            </div>
                                            
                                            <button 
                                                onClick={() => handleSendInternal(partner)}
                                                disabled={sentUsers.has(partner.user_id) || sendingTo === partner.user_id}
                                                className={`px-4 py-2 rounded-xl text-[12px] font-bold transition-all ${
                                                    sentUsers.has(partner.user_id) 
                                                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                                                        : 'bg-blue-600 text-white hover:bg-blue-500 shadow-md'
                                                }`}
                                            >
                                                {sendingTo === partner.user_id ? (
                                                    <Loader2 size={16} className="animate-spin" />
                                                ) : sentUsers.has(partner.user_id) ? (
                                                    'Gesendet'
                                                ) : (
                                                    'Senden'
                                                )}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-10 px-6 text-center text-muted-foreground">
                                    <MessageSquare size={32} className="mb-3 opacity-20" />
                                    <p className="text-sm font-medium">Du hast noch keine Chats.</p>
                                </div>
                            )}
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
