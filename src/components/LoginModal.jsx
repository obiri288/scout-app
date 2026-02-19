import React, { useState } from 'react';
import { X, User, LogIn, AlertCircle, Loader2, ArrowLeft, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { btnPrimary, inputStyle, cardStyle } from '../lib/styles';

export const LoginModal = ({ onClose, onSuccess }) => {
    const [view, setView] = useState('login'); // 'login' | 'register' | 'forgot'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true); setMsg(''); setSuccessMsg('');
        const isSignUp = view === 'register';

        if (isSignUp && password !== confirmPassword) {
            setMsg("Passwörter stimmen nicht überein!");
            setLoading(false);
            return;
        }

        try {
            if (isSignUp) {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { emailRedirectTo: window.location.origin }
                });
                if (error) throw error;
                if (data.user) {
                    setSuccessMsg('✅ Registrierung erfolgreich! Anmeldung...');
                    setTimeout(() => onSuccess({ user: data.user }), 1000);
                    return;
                }
            } else {
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                onSuccess(data.session);
            }
        } catch (error) {
            console.error("Auth Error:", error);
            setMsg(error.message || "Ein Fehler ist aufgetreten.");
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        if (!email) { setMsg("Bitte E-Mail eingeben."); return; }
        setLoading(true); setMsg('');
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/#reset-password`
            });
            if (error) throw error;
            setSuccessMsg('📧 Link zum Zurücksetzen wurde an deine E-Mail gesendet!');
        } catch (error) {
            setMsg(error.message || "Fehler beim Zurücksetzen.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
            <div className={`w-full max-w-sm ${cardStyle} p-8 relative shadow-2xl shadow-blue-900/10`}>
                <button onClick={onClose} className="absolute top-5 right-5 text-zinc-500 hover:text-white transition"><X size={20} /></button>
                <div className="animate-in fade-in slide-in-from-right-5">
                    <div className="flex flex-col items-center gap-3 mb-8">
                        <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                            {view === 'forgot' ? <Mail size={28} className="text-white" /> : <User size={28} className="text-white" />}
                        </div>
                        <h2 className="text-2xl font-bold text-white">
                            {view === 'register' ? 'Account erstellen' : view === 'forgot' ? 'Passwort vergessen' : 'Willkommen zurück'}
                        </h2>
                        <p className="text-zinc-400 text-sm text-center">
                            {view === 'register' ? 'Werde Teil der Community' : view === 'forgot' ? 'Gib deine E-Mail ein, wir senden dir einen Reset-Link' : 'Melde dich an, um fortzufahren'}
                        </p>
                    </div>

                    {successMsg ? (
                        <div className="text-center space-y-4">
                            <div className="bg-green-500/10 text-green-400 p-4 rounded-xl border border-green-500/20 text-sm">{successMsg}</div>
                            {view === 'forgot' && (
                                <button onClick={() => { setView('login'); setSuccessMsg(''); }} className="text-blue-400 text-sm font-bold hover:underline">
                                    Zurück zum Login
                                </button>
                            )}
                        </div>
                    ) : view === 'forgot' ? (
                        <form onSubmit={handlePasswordReset} className="space-y-4">
                            <input type="email" placeholder="E-Mail Adresse" required className={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} />
                            {msg && (<div className="bg-red-500/10 text-red-400 text-xs p-3 rounded-xl border border-red-500/20 flex items-center gap-2"><AlertCircle size={14} /> {msg}</div>)}
                            <button disabled={loading} className={`${btnPrimary} w-full flex justify-center items-center gap-2`}>
                                {loading && <Loader2 className="animate-spin" size={18} />} Reset-Link senden
                            </button>
                            <button type="button" onClick={() => { setView('login'); setMsg(''); }} className="w-full text-zinc-500 text-sm hover:text-white transition flex items-center justify-center gap-2">
                                <ArrowLeft size={14} /> Zurück zum Login
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleAuth} className="space-y-4">
                            <div className="space-y-3">
                                <input type="email" placeholder="E-Mail Adresse" required className={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} />
                                <input type="password" placeholder="Passwort" required className={inputStyle} value={password} onChange={(e) => setPassword(e.target.value)} />
                                {view === 'register' && (<div className="animate-in slide-in-from-top-2 fade-in"><input type="password" placeholder="Passwort bestätigen" required className={inputStyle} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></div>)}
                            </div>
                            {view === 'login' && (
                                <button type="button" onClick={() => { setView('forgot'); setMsg(''); }} className="text-xs text-zinc-500 hover:text-blue-400 transition">
                                    Passwort vergessen?
                                </button>
                            )}
                            {msg && (<div className="bg-red-500/10 text-red-400 text-xs p-3 rounded-xl border border-red-500/20 flex flex-col gap-2"><div className="flex items-center gap-2"><AlertCircle size={14} /> {msg}</div></div>)}
                            <button disabled={loading} className={`${btnPrimary} w-full flex justify-center items-center gap-2 mt-2`}>{loading && <Loader2 className="animate-spin" size={18} />} {view === 'register' ? 'Kostenlos registrieren' : 'Anmelden'}</button>
                        </form>
                    )}
                    {view !== 'forgot' && (
                        <div className="mt-6 pt-6 border-t border-white/5 text-center">
                            <p className="text-zinc-500 text-xs mb-2">{view === 'register' ? 'Du hast schon einen Account?' : 'Neu bei ScoutVision?'}</p>
                            <button type="button" onClick={() => { setView(view === 'login' ? 'register' : 'login'); setMsg(''); }} className="text-white hover:text-blue-400 font-bold text-sm transition">{view === 'register' ? 'Jetzt anmelden' : 'Kostenlos registrieren'}</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
