import React, { useState, useEffect } from 'react';
import { Database, ShieldAlert, Trash2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { inputStyle, cardStyle } from '../lib/styles';
import { useToast } from '../contexts/ToastContext';

export const AdminDashboard = ({ session }) => {
    const [tab, setTab] = useState('clubs');
    const [pendingClubs, setPendingClubs] = useState([]);
    const [reports, setReports] = useState([]);
    const [editingClub, setEditingClub] = useState(null);
    const [editForm, setEditForm] = useState({ logo_url: '', league: '' });
    const { addToast } = useToast();

    const fetchPending = async () => {
        try {
            const { data } = await supabase.from('clubs').select('*').eq('is_verified', false);
            setPendingClubs(data || []);
        } catch (e) {
            addToast("Fehler beim Laden der Vereine.", 'error');
        }
    };

    const fetchReports = async () => {
        try {
            const { data } = await supabase.from('reports').select('*').eq('status', 'pending');
            setReports(data || []);
        } catch (e) {
            addToast("Fehler beim Laden der Meldungen.", 'error');
        }
    };

    useEffect(() => { fetchPending(); fetchReports(); }, []);

    const handleVerify = async (club) => {
        if (!editForm.logo_url || !editForm.league) {
            addToast("Bitte Logo und Liga ausfüllen.", 'error');
            return;
        }
        try {
            const { error } = await supabase.from('clubs').update({ is_verified: true, logo_url: editForm.logo_url, league: editForm.league }).eq('id', club.id);
            if (error) throw error;
            setEditingClub(null);
            addToast(`${club.name} verifiziert! ✅`, 'success');
            fetchPending();
        } catch (e) {
            addToast(e.message, 'error');
        }
    };

    const handleDelete = async (clubId) => {
        try {
            const { error } = await supabase.from('clubs').delete().eq('id', clubId);
            if (error) throw error;
            addToast("Verein gelöscht.", 'success');
            fetchPending();
        } catch (e) {
            addToast("Fehler beim Löschen: " + e.message, 'error');
        }
    };

    const handleResolveReport = async (id) => {
        try {
            const { error } = await supabase.from('reports').update({ status: 'resolved' }).eq('id', id);
            if (error) throw error;
            addToast("Meldung als erledigt markiert.", 'success');
            fetchReports();
        } catch (e) {
            addToast(e.message, 'error');
        }
    };

    return (
        <div className="pb-24 pt-8 px-4 max-w-md mx-auto min-h-screen">
            <h2 className="text-3xl font-black text-white mb-6 flex items-center gap-3"><Database className="text-blue-500" /> Admin</h2>
            <div className="flex gap-4 mb-6 border-b border-zinc-800 pb-2">
                <button onClick={() => setTab('clubs')} className={`text-sm font-bold pb-2 px-2 ${tab === 'clubs' ? 'text-white border-b-2 border-blue-500' : 'text-zinc-500'}`}>Vereine ({pendingClubs.length})</button>
                <button onClick={() => setTab('reports')} className={`text-sm font-bold pb-2 px-2 ${tab === 'reports' ? 'text-white border-b-2 border-blue-500' : 'text-zinc-500'}`}>Meldungen ({reports.length})</button>
            </div>

            {tab === 'clubs' && (
                <div className="space-y-4">
                    {pendingClubs.length === 0 && <div className="text-zinc-500 text-center py-10">Keine offenen Vereine. Gute Arbeit! 🧹</div>}
                    {pendingClubs.map(c => (
                        <div key={c.id} className={`p-4 ${cardStyle}`}>
                            <div className="flex justify-between items-start mb-4">
                                <div><h3 className="font-bold text-white">{c.name}</h3><span className="text-xs text-zinc-500 font-mono">ID: {c.id.slice(0, 8)}</span></div>
                                <ShieldAlert className="text-amber-500" size={20} />
                            </div>
                            {editingClub === c.id ? (
                                <div className="space-y-3">
                                    <input placeholder="Logo URL" value={editForm.logo_url} onChange={e => setEditForm({ ...editForm, logo_url: e.target.value })} className={inputStyle} />
                                    <select value={editForm.league} onChange={e => setEditForm({ ...editForm, league: e.target.value })} className={inputStyle}>
                                        <option value="">Liga wählen...</option>
                                        <option>1. Bundesliga</option><option>2. Bundesliga</option><option>3. Liga</option>
                                        <option>Regionalliga</option><option>Oberliga</option><option>Verbandsliga</option>
                                        <option>Landesliga</option><option>Bezirksliga</option><option>Kreisliga</option>
                                    </select>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleVerify(c)} className="bg-green-600 text-white text-xs font-bold px-3 py-3 rounded-xl flex-1 flex items-center justify-center gap-1">Verifizieren</button>
                                        <button onClick={() => setEditingClub(null)} className="bg-zinc-700 text-white text-xs px-3 py-3 rounded-xl">Abbruch</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <button onClick={() => { setEditingClub(c.id); setEditForm({ logo_url: c.logo_url || '', league: c.league || '' }); }} className="bg-blue-600 text-white text-xs font-bold px-4 py-3 rounded-xl flex-1">Bearbeiten</button>
                                    <button onClick={() => handleDelete(c.id)} className="bg-red-900/30 text-red-500 text-xs font-bold px-3 py-3 rounded-xl border border-red-500/20"><Trash2 size={16} /></button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {tab === 'reports' && (
                <div className="space-y-4">
                    {reports.map(r => (
                        <div key={r.id} className={`p-4 border-red-900/30 ${cardStyle}`}>
                            <div className="flex justify-between items-start mb-3">
                                <span className="text-red-400 text-xs font-bold uppercase bg-red-900/20 px-2 py-1 rounded-md border border-red-500/20">{r.reason}</span>
                                <span className="text-xs text-zinc-500">{new Date(r.created_at).toLocaleDateString()}</span>
                            </div>
                            <p className="text-white text-sm mb-4">Gemeldetes Objekt: <span className="font-mono text-zinc-400 bg-black/30 px-1 rounded">{r.target_type} {r.target_id.slice(0, 6)}...</span></p>
                            <div className="flex gap-2">
                                <button onClick={() => handleResolveReport(r.id)} className="flex-1 bg-zinc-800 text-white text-xs font-bold py-3 rounded-xl hover:bg-zinc-700">Als erledigt markieren</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
