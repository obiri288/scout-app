import React, { useState } from 'react';
import { ShieldOff, X, AlertTriangle, Loader2 } from 'lucide-react';
import { cardStyle } from '../lib/styles';
import { useToast } from '../contexts/ToastContext';
import * as api from '../lib/api';

export const BlockUserModal = ({ targetUser, session, onClose, onBlocked }) => {
    const [loading, setLoading] = useState(false);
    const { addToast } = useToast();

    const handleBlock = async () => {
        setLoading(true);
        try {
            await api.blockUser(session.user.id, targetUser.user_id);
            addToast(`${targetUser.full_name} wurde blockiert.`, 'success');
            onBlocked?.();
            onClose();
        } catch (e) {
            addToast("Fehler beim Blockieren.", 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className={`w-full max-w-sm ${cardStyle} p-6 border border-red-500/20`}>
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-red-500/20 rounded-xl">
                            <ShieldOff size={22} className="text-red-500" />
                        </div>
                        <h3 className="font-bold text-foreground text-lg">Nutzer blockieren</h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground transition">
                        <X size={18} />
                    </button>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-5 flex items-start gap-3">
                    <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-sm text-muted-foreground dark:text-zinc-300">
                        <strong className="text-foreground">{targetUser.full_name}</strong> wird blockiert.
                        Du wirst keine Nachrichten, Inhalte oder Profile dieser Person mehr sehen.
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 bg-black/5 dark:bg-white/5 text-muted-foreground dark:text-zinc-400 py-3 rounded-xl font-bold text-sm hover:text-foreground hover:bg-black/10 dark:hover:bg-white/10 transition"
                    >
                        Abbrechen
                    </button>
                    <button
                        onClick={handleBlock}
                        disabled={loading}
                        className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white py-3 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2"
                    >
                        {loading && <Loader2 size={16} className="animate-spin" />}
                        Blockieren
                    </button>
                </div>
            </div>
        </div>
    );
};
