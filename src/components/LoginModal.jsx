import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, User, LogIn, AlertCircle, Loader2, ArrowLeft, Mail, Check, AtSign } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { checkRateLimit } from '../lib/rateLimiter';
import { getSafeErrorMessage } from '../lib/errorMessages';
import { btnPrimary, cardStyle } from '../lib/styles';
import { Input } from './ui/input';
import { PasswordInput } from './ui/PasswordInput';
import { isUsernameBlocked, validateUsernameFormat } from '../lib/restrictedUsernames';

export const LoginModal = ({ onClose, onSuccess, onLegalOpen }) => {
    const [view, setView] = useState('login'); // 'login' | 'register' | 'forgot' | 'registerSuccess'
    const [identifier, setIdentifier] = useState(''); // E-Mail oder Username
    const [email, setEmail] = useState(''); // Nur für Register & Forgot
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isPasswordValid, setIsPasswordValid] = useState(false);
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // Username state (nur Register)
    const [username, setUsername] = useState('');
    const [usernameStatus, setUsernameStatus] = useState('idle'); // 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'blocked'
    const [usernameError, setUsernameError] = useState('');
    const debounceRef = useRef(null);

    // Live-Validierung: Username (Debounce 500ms)
    const checkUsername = useCallback(async (value) => {
        const lower = value.toLowerCase().trim();

        // Client-seitig: Format prüfen
        const formatResult = validateUsernameFormat(lower);
        if (!formatResult.valid) {
            setUsernameStatus('invalid');
            setUsernameError(formatResult.reason);
            return;
        }

        // Client-seitig: Blocklist prüfen
        const blockResult = isUsernameBlocked(lower);
        if (blockResult.blocked) {
            setUsernameStatus('blocked');
            setUsernameError(blockResult.reason);
            return;
        }

        // Server-seitig: Verfügbarkeit prüfen
        setUsernameStatus('checking');
        setUsernameError('');
        try {
            const { data, error } = await supabase.rpc('check_username_available', { p_username: lower });
            if (error) throw error;
            if (data) {
                setUsernameStatus('available');
                setUsernameError('');
            } else {
                setUsernameStatus('taken');
                setUsernameError('Dieser Username ist bereits vergeben.');
            }
        } catch (err) {
            console.error('Username check error:', err);
            setUsernameStatus('invalid');
            setUsernameError('Prüfung fehlgeschlagen. Versuche es erneut.');
        }
    }, []);

    useEffect(() => {
        if (view !== 'register' || !username) {
            setUsernameStatus('idle');
            setUsernameError('');
            return;
        }
        // Debounce 500ms
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            checkUsername(username);
        }, 500);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [username, view, checkUsername]);

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true); setMsg(''); setSuccessMsg('');
        const isSignUp = view === 'register';

        // Rate Limiting
        const rlIdentifier = isSignUp ? email : identifier;
        const rlKey = isSignUp ? `signup:${rlIdentifier}` : `login:${rlIdentifier}`;
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

        // Registrierung: Username-Checks
        if (isSignUp) {
            const lower = username.toLowerCase().trim();
            const formatResult = validateUsernameFormat(lower);
            if (!formatResult.valid) {
                setMsg(formatResult.reason);
                setLoading(false);
                return;
            }
            const blockResult = isUsernameBlocked(lower);
            if (blockResult.blocked) {
                setMsg(blockResult.reason);
                setLoading(false);
                return;
            }
            if (usernameStatus !== 'available') {
                setMsg("Bitte wähle einen verfügbaren Username.");
                setLoading(false);
                return;
            }
        }

        try {
            if (isSignUp) {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: window.location.origin,
                        data: { username: username.toLowerCase().trim() }
                    }
                });
                if (error) throw error;
                setView('registerSuccess');
                return;
            } else {
                // --- DUAL LOGIN LOGIK ---
                let loginEmail = identifier.trim();

                if (!loginEmail.includes('@')) {
                    // Es ist ein Username → E-Mail via RPC auflösen
                    const { data: resolvedEmail, error: rpcError } = await supabase.rpc(
                        'get_email_by_username',
                        { p_username: loginEmail.toLowerCase() }
                    );
                    if (rpcError) throw rpcError;
                    if (!resolvedEmail) {
                        setMsg('Benutzername nicht gefunden.');
                        setLoading(false);
                        return;
                    }
                    loginEmail = resolvedEmail;
                }

                const { data, error } = await supabase.auth.signInWithPassword({
                    email: loginEmail,
                    password
                });
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
        const resetEmail = email || identifier;
        if (!resetEmail) { setMsg("Bitte E-Mail eingeben."); return; }

        const rl = checkRateLimit(`reset:${resetEmail}`, 3, 3600000);
        if (!rl.allowed) {
            setMsg(`Zu viele Anfragen. Bitte warte ${rl.retryAfterMinutes} Minute(n).`);
            return;
        }

        setLoading(true); setMsg('');
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
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

    // Username-Indikator Inline-Komponente
    const UsernameIndicator = () => {
        if (usernameStatus === 'idle') return null;
        if (usernameStatus === 'checking') {
            return <Loader2 className="animate-spin text-cyan-400" size={16} />;
        }
        if (usernameStatus === 'available') {
            return <Check className="text-emerald-400" size={16} />;
        }
        return <X className="text-rose-500" size={16} />;
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 dark:bg-black/90 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
            <div className={`w-full max-w-sm ${cardStyle} p-8 relative shadow-2xl shadow-blue-900/10`}>
                <button onClick={onClose} className="absolute top-5 right-5 text-muted-foreground hover:text-foreground transition"><X size={20} /></button>
                <div className="animate-in fade-in slide-in-from-right-5">
                    <div className="flex flex-col items-center gap-3 mb-8">
                        <img
                            src="/cavio-icon.png"
                            alt="Cavio"
                            className="h-16 w-16 object-contain mix-blend-screen drop-shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                        />
                        <h2 className="text-2xl font-bold text-foreground">
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
                                <h3 className="text-xl font-bold text-foreground mb-2">Willkommen bei Cavio</h3>
                                <p className="text-muted-foreground text-sm leading-relaxed">
                                    Wir haben dir einen Link geschickt. Bitte bestätige deine E-Mail-Adresse, um den Tresor zu öffnen.
                                </p>
                            </div>
                            <button onClick={onClose} className="w-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-border text-foreground font-bold py-3 rounded-xl transition">
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
                            <Input type="email" placeholder="E-Mail Adresse" required className="bg-white text-slate-950 dark:bg-white/5 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400" value={email || identifier} onChange={(e) => setEmail(e.target.value)} />
                            {msg && (<div className="bg-rose-600/10 text-rose-600 text-xs p-3 rounded-xl border border-rose-600/20 flex items-center gap-2 font-medium"><AlertCircle size={14} /> {msg}</div>)}
                            <button disabled={loading} className={`${btnPrimary} w-full flex justify-center items-center gap-2`}>
                                {loading && <Loader2 className="animate-spin" size={18} />} Reset-Link senden
                            </button>
                            <button type="button" onClick={() => { setView('login'); setMsg(''); }} className="w-full text-muted-foreground text-sm hover:text-foreground transition flex items-center justify-center gap-2">
                                <ArrowLeft size={14} /> Zurück zum Login
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleAuth} className="space-y-4">
                            <div className="space-y-3">
                                {view === 'login' ? (
                                    /* ---- DUAL LOGIN: E-Mail oder Username ---- */
                                    <div className="relative">
                                        <Input
                                            type="text"
                                            placeholder="E-Mail oder Username"
                                            required
                                            className="bg-white text-slate-950 dark:bg-white/5 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 pr-10"
                                            value={identifier}
                                            onChange={(e) => setIdentifier(e.target.value)}
                                            autoComplete="username"
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                            {identifier.includes('@') ? <Mail size={16} /> : <AtSign size={16} />}
                                        </div>
                                    </div>
                                ) : (
                                    /* ---- REGISTER: E-Mail + Username ---- */
                                    <>
                                        <Input
                                            type="email"
                                            placeholder="E-Mail Adresse"
                                            required
                                            className="bg-white text-slate-950 dark:bg-white/5 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                        <div className="animate-in slide-in-from-top-2 fade-in">
                                            <div className="relative">
                                                <Input
                                                    type="text"
                                                    placeholder="Username (z.B. max_mustermann)"
                                                    required
                                                    className={`bg-white text-slate-950 dark:bg-white/5 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 pr-10 ${
                                                        usernameStatus === 'available' ? 'border-emerald-500/50 focus:border-emerald-500' :
                                                        (usernameStatus === 'taken' || usernameStatus === 'invalid' || usernameStatus === 'blocked') ? 'border-rose-500/50 focus:border-rose-500' : ''
                                                    }`}
                                                    value={username}
                                                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                                                    maxLength={20}
                                                    autoComplete="username"
                                                />
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                    <UsernameIndicator />
                                                </div>
                                            </div>
                                            {usernameError && (
                                                <p className="text-rose-500 text-xs mt-1.5 ml-1 font-medium">{usernameError}</p>
                                            )}
                                            {usernameStatus === 'available' && (
                                                <p className="text-emerald-400 text-xs mt-1.5 ml-1 font-medium">Username ist verfügbar ✓</p>
                                            )}
                                        </div>
                                    </>
                                )}
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
                        <div className="mt-6 pt-6 border-t border-border text-center">
                            <p className="text-muted-foreground text-xs mb-2">{view === 'register' ? 'Du hast schon einen Account?' : 'Neu bei Cavio?'}</p>
                            <button type="button" onClick={() => { setView(view === 'login' ? 'register' : 'login'); setMsg(''); setUsername(''); setUsernameStatus('idle'); setUsernameError(''); }} className="text-foreground hover:text-cyan-400 font-bold text-sm transition">{view === 'register' ? 'Jetzt anmelden' : 'Kostenlos registrieren'}</button>
                        </div>
                    )}
                    {/* Legal Links */}
                    <div className="mt-4 pt-4 border-t border-border flex justify-center gap-4">
                        <button type="button" onClick={() => onLegalOpen?.('privacy')} className="text-muted-foreground text-[10px] hover:text-cyan-400 transition">Datenschutz</button>
                        <span className="text-zinc-700 text-[10px]">·</span>
                        <button type="button" onClick={() => onLegalOpen?.('imprint')} className="text-muted-foreground text-[10px] hover:text-cyan-400 transition">Impressum</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
