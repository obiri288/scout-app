import React, { useState } from 'react';
import { Flag, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cardStyle } from '../lib/styles';
import { useToast } from '../contexts/ToastContext';

export const ReportModal = ({ targetId, targetType, onClose, session }) => {
    const [reason, setReason] = useState('Spam');
    const [loading, setLoading] = useState(false);
    const { addToast } = useToast();

    const handleReport = async () => {
        setLoading(true);
        try {
            const { error } = await supabase.from('reports').insert({
                reporter_id: session.user.id,
                target_id: targetId,
                target_type: targetType,
                reason: reason,
                status: 'pending'
            });
            if (error) throw error;
            addToast("Vielen Dank! Wir prüfen die Meldung.", 'success');
            onClose();
        } catch (e) {
            addToast("Fehler beim Melden.", 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className={`w-full max-w-xs ${cardStyle} p-5`}>
                <h3 className="font-bold text-foreground mb-4 flex items-center gap-2"><Flag size={18} className="text-red-500" /> Inhalt melden</h3>
                <div className="bg-slate-50 dark:bg-zinc-900/50 p-1 rounded-xl mb-4 border border-border">
                    <select value={reason} onChange={e => setReason(e.target.value)} className="w-full bg-transparent text-foreground p-2 text-sm outline-none">
                        <option>Spam / Werbung</option>
                        <option>Unangemessener Inhalt</option>
                        <option>Beleidigung</option>
                        <option>Fake Profil</option>
                    </select>
                </div>
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 bg-black/5 dark:bg-white/5 text-muted-foreground dark:text-zinc-400 py-2.5 rounded-xl font-bold text-xs hover:text-foreground transition">Abbruch</button>
                    <button onClick={handleReport} disabled={loading} className="flex-1 bg-red-600/90 hover:bg-red-600 text-white py-2.5 rounded-xl font-bold text-xs transition">Melden</button>
                </div>
            </div>
        </div>
    );
};
