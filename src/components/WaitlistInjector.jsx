import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Mail, CheckCircle, AlertCircle } from 'lucide-react';

export const WaitlistInjector = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null); // { type: 'success' | 'error', text: string }

    const handleInvite = async (e) => {
        e.preventDefault();
        setMessage(null);

        const trimmedEmail = email.trim();
        if (!trimmedEmail || !trimmedEmail.includes('@')) {
            setMessage({ type: 'error', text: 'Bitte gib eine gültige E-Mail-Adresse ein.' });
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase
                .from('waitlist')
                .insert({ email: trimmedEmail.toLowerCase() });

            if (error) {
                if (error.code === '23505') {
                    setMessage({
                        type: 'error',
                        text: 'Diese E-Mail steht bereits auf der Warteliste.'
                    });
                } else {
                    setMessage({
                        type: 'error',
                        text: error.message || 'Ein Fehler ist aufgetreten.'
                    });
                }
            } else {
                setMessage({
                    type: 'success',
                    text: 'Erfolgreich eingetragen. Einladung wird verarbeitet.'
                });
                setEmail('');
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Netzwerkfehler. Bitte versuche es erneut.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-500">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
                <Mail size={18} className="text-cyan-400" />
                <h3 className="font-bold text-foreground text-sm uppercase tracking-wider">
                    Partner & Athleten direkt einladen
                </h3>
            </div>

            {/* Description */}
            <p className="text-muted-foreground text-xs mb-4 leading-relaxed">
                Trage neue Kontakte direkt in das System ein. Sie erhalten umgehend Zugang zum geschlossenen Bereich.
            </p>

            {/* Message Alert */}
            {message && (
                <div
                    className={`p-3 rounded-lg mb-4 text-xs flex items-start gap-2 border animate-in fade-in zoom-in-95 ${
                        message.type === 'success'
                            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                            : 'bg-rose-500/10 border-rose-500/25 text-rose-400'
                    }`}
                >
                    {message.type === 'success' ? (
                        <CheckCircle size={14} className="shrink-0 mt-0.5" />
                    ) : (
                        <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    )}
                    <span className="leading-normal">{message.text}</span>
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleInvite} className="space-y-3">
                <div className="relative">
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="partner@email.com"
                        required
                        disabled={loading}
                        className="w-full bg-black/40 border border-slate-800 text-slate-200 rounded-xl px-4 py-3 outline-none text-sm placeholder:text-slate-600 disabled:opacity-50 transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading || !email}
                    className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(34,211,238,0.2)]"
                >
                    {loading ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            Eintragen...
                        </>
                    ) : (
                        'VIP-Zugang gewähren'
                    )}
                </button>
            </form>
        </div>
    );
};
