import React, { useState } from 'react';
import { X, User, LogIn, AlertCircle, Loader2, ArrowLeft, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { checkRateLimit } from '../lib/rateLimiter';
import { getSafeErrorMessage } from '../lib/errorMessages';
import { btnPrimary, inputStyle, cardStyle } from '../lib/styles';
import { PasswordInput } from './ui/PasswordInput';

export const LoginModal = ({ onClose, onSuccess, onLegalOpen }) => {
    const [view, setView] = useState('login'); // 'login' | 'register' | 'forgot' | 'registerSuccess'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isPasswordValid, setIsPasswordValid] = useState(false);
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true); setMsg(''); setSuccessMsg('');
        const isSignUp = view === 'register';

        // Rate Limiting: Login 5x/15min, Signup 3x/Stunde
        const rlKey = isSignUp ? `signup:${email}` : `login:${email}`;
        const rl = checkRateLimit(rlKey, isSignUp ? 3 : 5, isSignUp ? 3600000 : 900000);
        if (!rl.allowed) {
            setMsg(`Zu viele Versuche. Bitte warte ${rl.retryAfterMinutes} Minute(n).`);
            setLoading(false);
            return;
        }

        if (isSignUp && !isPasswordValid) {
            setMsg("Bitte erfülle alle Passwort-Kriterien!");
            setLoading(false);
            return;
        }

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
                // Double Opt-In success state
                setView('registerSuccess');
                return;
            } else {
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                onSuccess(data.session);
            }
        } catch (error) {
            console.error("Auth Error:", error);
            setMsg(getSafeErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        if (!email) { setMsg("Bitte E-Mail eingeben."); return; }

        // Rate Limiting: max 3 Reset-Mails pro E-Mail pro Stunde
        const rl = checkRateLimit(`reset:${email}`, 3, 3600000);
        if (!rl.allowed) {
            setMsg(`Zu viele Anfragen. Bitte warte ${rl.retryAfterMinutes} Minute(n).`);
            return;
        }

        setLoading(true); setMsg('');
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/#reset-password`
            });
            if (error) throw error;
            setSuccessMsg('📧 Link zum Zurücksetzen wurde an deine E-Mail gesendet!');
        } catch (error) {
            setMsg(getSafeErrorMessage(error, 'Fehler beim Zurücksetzen.'));
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
                        <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-900/20 ring-1 ring-cyan-500/20">
                            <div className="text-lg tracking-tighter flex items-baseline"><span className="font-black text-white">PRO</span><span className="font-semibold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 ml-0.5">BASE</span></div>
                        </div>
                        <h2 className="text-2xl font-bold text-white">
                            {view === 'register' ? 'Account erstellen' : view === 'forgot' ? 'Passwort vergessen' : 'Willkommen zurück'}
                        </h2>
                        <p className="text-muted-foreground text-sm text-center">
                            {view === 'register' ? 'Dein Fundament für den Profifußball.' : view === 'forgot' ? 'Gib deine E-Mail ein, wir senden dir einen Reset-Link' : 'Melde dich an, um fortzufahren'}
                        </p>
                    </div>

                    {view === 'registerSuccess' ? (
                        <div className="text-center space-y-6 animate-in fade-in zoom-in-95 py-6">
                            <div className="w-20 h-20 bg-cyan-500/10 text-cyan-400 rounded-full flex flex-col items-center justify-center mx-auto shadow-[0_0_30px_rgba(34,211,238,0.2)] border border-cyan-500/20">
                                <Mail size={36} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white mb-2">Willkommen bei ProBase</h3>
                                <p className="text-zinc-400 text-sm leading-relaxed">
                                    Wir haben dir einen Link geschickt. Bitte bestätige deine E-Mail-Adresse, um den Tresor zu öffnen.
                                </p>
                            </div>
                            <button onClick={onClose} className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-3 rounded-xl transition">
                                Verstanden
                            </button>
                        </div>
                    ) : successMsg ? (
                        <div className="text-center space-y-4">
                            <div className="bg-green-500/10 text-green-400 p-4 rounded-xl border border-green-500/20 text-sm">{successMsg}</div>
                            {view === 'forgot' && (
                                <button onClick={() => { setView('login'); setSuccessMsg(''); }} className="text-cyan-400 text-sm font-bold hover:underline">
                                    Zurück zum Login
                                </button>
                            )}
                        </div>
                    ) : view === 'forgot' ? (
                        <form onSubmit={handlePasswordReset} className="space-y-4">
                            <input type="email" placeholder="E-Mail Adresse" required className={inputStyle} style={{ color: 'var(--input-text, #0f172a)', backgroundColor: 'var(--input-bg, #ffffff)', WebkitTextFillColor: 'var(--input-text, #0f172a)' }} value={email} onChange={(e) => setEmail(e.target.value)} />
                            {msg && (<div className="bg-rose-600/10 text-rose-600 text-xs p-3 rounded-xl border border-rose-600/20 flex items-center gap-2 font-medium"><AlertCircle size={14} /> {msg}</div>)}
                            <button disabled={loading} className={`${btnPrimary} w-full flex justify-center items-center gap-2`}>
                                {loading && <Loader2 className="animate-spin" size={18} />} Reset-Link senden
                            </button>
                            <button type="button" onClick={() => { setView('login'); setMsg(''); }} className="w-full text-muted-foreground text-sm hover:text-white transition flex items-center justify-center gap-2">
                                <ArrowLeft size={14} /> Zurück zum Login
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleAuth} className="space-y-4">
                            <div className="space-y-3">
                                <input type="email" placeholder="E-Mail Adresse" required className={inputStyle} style={{ color: 'var(--input-text, #0f172a)', backgroundColor: 'var(--input-bg, #ffffff)', WebkitTextFillColor: 'var(--input-text, #0f172a)' }} value={email} onChange={(e) => setEmail(e.target.value)} />
                                <PasswordInput
                                    value={password}
                                    onChange={setPassword}
                                    showChecklist={view === 'register'}
                                    onValidChange={setIsPasswordValid}
                                    placeholder="Passwort"
                                />
                                {view === 'register' && (
                                    <div className="animate-in slide-in-from-top-2 fade-in">
                                        <PasswordInput
                                            value={confirmPassword}
                                            onChange={setConfirmPassword}
                                            placeholder="Passwort bestätigen"
                                            showChecklist={false}
                                        />
                                    </div>
                                )}
                            </div>
                            {view === 'login' && (
                                <button type="button" onClick={() => { setView('forgot'); setMsg(''); }} className="text-xs text-muted-foreground hover:text-cyan-400 transition">
                                    Passwort vergessen?
                                </button>
                            )}
                            {msg && (
                                <div className="bg-rose-600/10 text-rose-600 text-xs p-3 rounded-xl border border-rose-600/20 flex flex-col gap-2 font-medium">
                                    <div className="flex items-center gap-2"><AlertCircle size={14} /> {msg}</div>
                                </div>
                            )}
                            <button disabled={loading} className={`${btnPrimary} w-full flex justify-center items-center gap-2 mt-2`}>{loading && <Loader2 className="animate-spin" size={18} />} {view === 'register' ? 'Kostenlos registrieren' : 'Anmelden'}</button>
                        </form>
                    )}
                    {(view !== 'forgot' && view !== 'registerSuccess') && (
                        <div className="mt-6 pt-6 border-t border-white/5 text-center">
                            <p className="text-muted-foreground text-xs mb-2">{view === 'register' ? 'Du hast schon einen Account?' : 'Neu bei ProBase?'}</p>
                            <button type="button" onClick={() => { setView(view === 'login' ? 'register' : 'login'); setMsg(''); }} className="text-white hover:text-cyan-400 font-bold text-sm transition">{view === 'register' ? 'Jetzt anmelden' : 'Kostenlos registrieren'}</button>
                        </div>
                    )}
                    {/* Legal Links */}
                    <div className="mt-4 pt-4 border-t border-white/5 flex justify-center gap-4">
                        <button type="button" onClick={() => onLegalOpen?.('privacy')} className="text-muted-foreground text-[10px] hover:text-cyan-400 transition">Datenschutz</button>
                        <span className="text-zinc-700 text-[10px]">·</span>
                        <button type="button" onClick={() => onLegalOpen?.('imprint')} className="text-muted-foreground text-[10px] hover:text-cyan-400 transition">Impressum</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
