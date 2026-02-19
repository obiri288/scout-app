import React, { useState, useEffect } from 'react';
import { X, Bookmark, Trash2, User, Loader2, Pencil } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cardStyle } from '../lib/styles';
import { useToast } from '../contexts/ToastContext';

export const WatchlistModal = ({ session, onClose, onUserClick }) => {
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingNote, setEditingNote] = useState(null);
    const [noteText, setNoteText] = useState("");
    const { addToast } = useToast();

    const fetchWatchlist = async () => {
        setLoading(true);
        try {
            const { data } = await supabase.from('scout_watchlist')
                .select('*, players_master(*, clubs(*))')
                .eq('scout_id', session.user.id)
                .order('created_at', { ascending: false });
            setList(data || []);
        } catch (e) {
            addToast("Merkliste konnte nicht geladen werden.", 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchWatchlist(); }, []);

    const handleRemove = async (playerId) => {
        try {
            const { error } = await supabase.from('scout_watchlist').delete().match({ scout_id: session.user.id, player_id: playerId });
            if (error) throw error;
            setList(prev => prev.filter(item => item.player_id !== playerId));
            addToast("Spieler von Merkliste entfernt.", 'success');
        } catch (e) {
            addToast("Fehler beim Entfernen.", 'error');
        }
    };

    const handleSaveNote = async (itemId) => {
        try {
            const { error } = await supabase.from('scout_watchlist').update({ note: noteText }).eq('id', itemId);
            if (error) throw error;
            setList(prev => prev.map(item => item.id === itemId ? { ...item, note: noteText } : item));
            setEditingNote(null);
            addToast("Notiz gespeichert.", 'success');
        } catch (e) {
            addToast("Fehler beim Speichern der Notiz.", 'error');
        }
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className={`w-full sm:max-w-md ${cardStyle} h-[80vh] flex flex-col border-t border-zinc-700 rounded-t-3xl sm:rounded-2xl shadow-2xl`}>
                <div className="flex justify-between items-center p-6 border-b border-white/5">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2"><Bookmark className="text-blue-500" fill="currentColor" size={20} /> Merkliste</h2>
                    <button onClick={onClose}><X className="text-zinc-500 hover:text-white" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {loading ? <div className="text-center py-10"><Loader2 className="animate-spin mx-auto text-zinc-500" /></div> : (
                        list.length === 0 ? <div className="text-center text-zinc-500 py-10">Noch keine Spieler gemerkt.</div> :
                            list.map(item => (
                                <div key={item.id} className="bg-zinc-800/50 p-3 rounded-xl border border-white/5">
                                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => onUserClick(item.players_master)}>
                                        <div className="w-12 h-12 rounded-full bg-zinc-700 overflow-hidden shrink-0">
                                            {item.players_master?.avatar_url ? <img src={item.players_master.avatar_url} className="w-full h-full object-cover" /> : <User className="m-3 text-zinc-500" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-white truncate">{item.players_master?.full_name}</h4>
                                            <div className="flex items-center gap-2 text-xs text-zinc-400">
                                                <span className="bg-white/10 px-1.5 rounded">{item.players_master?.position_primary}</span>
                                                <span>{item.players_master?.clubs?.name}</span>
                                            </div>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); handleRemove(item.player_id); }} className="p-2 text-zinc-500 hover:text-red-500"><Trash2 size={16} /></button>
                                    </div>

                                    {/* Note area */}
                                    <div className="mt-3 pt-2 border-t border-white/5">
                                        {editingNote === item.id ? (
                                            <div className="flex gap-2">
                                                <input
                                                    autoFocus
                                                    className="flex-1 bg-black/30 text-xs text-white p-2 rounded-lg outline-none border border-blue-500/50"
                                                    value={noteText}
                                                    onChange={e => setNoteText(e.target.value)}
                                                    placeholder="Notiz für diesen Spieler..."
                                                />
                                                <button onClick={() => handleSaveNote(item.id)} className="text-blue-500 font-bold text-xs">OK</button>
                                            </div>
                                        ) : (
                                            <div
                                                onClick={() => { setEditingNote(item.id); setNoteText(item.note || ""); }}
                                                className="text-xs text-zinc-500 flex items-center gap-2 cursor-pointer hover:text-zinc-300"
                                            >
                                                <Pencil size={12} /> {item.note || "Notiz hinzufügen..."}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                    )}
                </div>
            </div>
        </div>
    );
};
