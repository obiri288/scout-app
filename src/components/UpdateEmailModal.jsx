import React, { useState } from 'react';
import { 
    X, Mail, AlertCircle, Loader2, CheckCircle 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getSafeErrorMessage } from '../lib/errorMessages';
import { btnPrimary, cardStyle } from '../lib/styles';
import { PasswordInput } from './ui/PasswordInput';
import { useToast } from '../contexts/ToastContext';

export const UpdateEmailModal = ({ onClose, session }) => {
    const [newEmail, setNewEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState('');
    const [isPending, setIsPending] = useState(false);
    const { addToast } = useToast();

    // Check if user is an email/password user
    const isEmailUser = session?.user?.app_metadata?.provider === 'email';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMsg('');

        if (!newEmail || !newEmail.includes('@')) {
            setMsg('Bitte gib eine gültige E-Mail-Adresse ein.');
            setLoading(false);
            return;
        }

        // Only require password for email users
        if (isEmailUser && !password) {
            setMsg('Bitte gib dein aktuelles Passwort zur Bestätigung ein.');
            setLoading(false);
            return;
        }

        try {
            const currentEmail = session?.user?.email;
            if (!currentEmail) {
                throw new Error('Sitzungs-E-Mail nicht gefunden.');
            }

            if (newEmail.toLowerCase() === currentEmail.toLowerCase()) {
                throw new Error('Die neue E-Mail ist identisch mit der aktuellen.');
            }

            // 1. Re-authenticate if user has a password
            if (isEmailUser) {
                const { error: authError } = await supabase.auth.signInWithPassword({
                    email: currentEmail,
                    password: password
                });

                if (authError) {
                    // Let getSafeErrorMessage handle "Invalid login credentials"
                    throw authError;
                }
            }

            // 2. Request Email Update
            const { error: updateError } = await supabase.auth.updateUser({
                email: newEmail
            });

            if (updateError) {
                throw updateError;
            }

            // Save pending email to localStorage to show banner
            localStorage.setItem('pending_email_update', newEmail);
            setIsPending(true);

        } catch (error) {
            console.error("Update Email Error:", error);
            // Use getSafeErrorMessage without a hard fallback first to allow re-thrown German errors to pass
            setMsg(getSafeErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
            <div className={`w-full max-w-sm ${cardStyle} p-8 relative shadow-2xl shadow-cyan-900/10`}>
                <button onClick={onClose} className="absolute top-5 right-5 text-zinc-500 hover:text-white transition">
                    <X size={20} />
                </button>
                <div className="animate-in fade-in slide-in-from-bottom-4">
                    
                    {!isPending ? (
                        <>
                            <div className="flex flex-col items-center gap-3 mb-8">
                                <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-900/20 ring-1 ring-cyan-500/20 text-cyan-400">
                                    <Mail size={32} />
                                </div>
                                <h2 className="text-2xl font-bold text-white text-center">
                                    E-Mail ändern
                                </h2>
                                <p className="text-muted-foreground text-sm text-center">
                                    {isEmailUser 
                                        ? 'Bitte gib deine neue E-Mail-Adresse und dein Passwort ein.' 
                                        : 'Gib deine neue E-Mail-Adresse ein. Da du einen Social-Login nutzt, ist kein Passwort nötig.'}
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Neue E-Mail</label>
                                        <input 
                                            type="email" 
                                            value={newEmail}
                                            onChange={(e) => setNewEmail(e.target.value)}
                                            placeholder="max@beispiel.de"
                                            className="w-full bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                                            autoComplete="off"
                                        />
                                    </div>
                                    
                                    {isEmailUser && (
                                        <div className="space-y-1 animate-in slide-in-from-top-2 fade-in">
                                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Passwort bestätigen</label>
                                            <PasswordInput
                                                value={password}
                                                onChange={setPassword}
                                                placeholder="Dein aktuelles Passwort"
                                                showChecklist={false}
                                            />
                                        </div>
                                    )}
                                </div>

                                {msg && (
                                    <div className="bg-rose-600/10 text-rose-600 text-xs p-3 rounded-xl border border-rose-600/20 flex items-center gap-2 font-medium animate-in shake-1">
                                        <AlertCircle size={14} className="shrink-0" />
                                        <span>{msg}</span>
                                    </div>
                                )}

                                <button
                                    disabled={loading}
                                    className={`${btnPrimary} w-full flex justify-center items-center gap-2 mt-2`}
                                >
                                    {loading && <Loader2 className="animate-spin" size={18} />}
                                    Änderung anfordern
                                </button>
                                
                                <p className="text-[10px] text-zinc-500 text-center leading-relaxed px-4">
                                    Aus Sicherheitsgründen musst du den Link in den E-Mails bestätigen, die wir an beide Adressen senden.
                                </p>
                            </form>
                        </>
                    ) : (
                        <div className="flex flex-col items-center gap-4 py-4 text-center animate-in zoom-in-95 fade-in">
                            <div className="w-20 h-20 bg-cyan-500/20 rounded-full flex items-center justify-center animate-pulse">
                                <CheckCircle size={40} className="text-cyan-400" />
                            </div>
                            <h2 className="text-xl font-bold text-white mt-2">Bestätigung ausstehend</h2>
                            <p className="text-sm text-muted-foreground leading-relaxed px-2">
                                Deine Anfrage für <span className="text-cyan-400 font-medium">{newEmail}</span> wurde registriert.
                            </p>
                            
                            <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl text-left w-full space-y-3">
                                <div className="flex items-start gap-2">
                                    <div className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold text-cyan-400">1</div>
                                    <p className="text-xs text-zinc-300">Prüfe dein Postfach (ggf. Spam).</p>
                                </div>
                                <div className="flex items-start gap-2">
                                    <div className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold text-cyan-400">2</div>
                                    <p className="text-xs text-zinc-300">Klicke auf den Bestätigungslink in der E-Mail.</p>
                                </div>
                                <div className="p-2.5 bg-amber-500/10 rounded-lg border border-amber-500/20">
                                    <p className="text-[10px] text-amber-300/80 leading-tight">
                                        <strong>Hinweis:</strong> Standardmäßig sendet Supabase Links an <u>beide</u> Adressen. Du musst ggf. beide bestätigen, bevor die Änderung aktiv wird.
                                    </p>
                                </div>
                            </div>
                            
                            <button
                                onClick={handleCancel}
                                className="mt-4 w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition active:scale-95"
                            >
                                Verstanden
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};
