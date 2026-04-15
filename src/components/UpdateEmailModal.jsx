import React, { useState } from 'react';
import { X, Mail, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMsg('');

        if (!newEmail || !newEmail.includes('@')) {
            setMsg('Bitte gib eine gültige E-Mail-Adresse ein.');
            setLoading(false);
            return;
        }

        if (!password) {
            setMsg('Bitte gib dein aktuelles Passwort zur Bestätigung ein.');
            setLoading(false);
            return;
        }

        try {
            // 1. Re-authenticate to ensure password is correct
            // Note: Since we are using Supabase Auth, calling signInWithPassword acts as re-auth.
            // If they are logged in with another provider, this might fail, but for email/pass it's standard.
            const currentEmail = session?.user?.email;
            if (!currentEmail) {
                setMsg('Kritischer Fehler: Sitzungs-E-Mail nicht gefunden.');
                setLoading(false);
                return;
            }

            const { error: authError } = await supabase.auth.signInWithPassword({
                email: currentEmail,
                password: password
            });

            if (authError) {
                if (authError.message.includes('Invalid login credentials')) {
                    throw new Error('Falsches Passwort. Bitte versuche es erneut.');
                }
                throw authError;
            }

            // 2. Request Email Update
            const { error: updateError } = await supabase.auth.updateUser({
                email: newEmail
            });

            if (updateError) {
                if (updateError.message.toLowerCase().includes('already registered')) {
                     throw new Error('Diese E-Mail-Adresse wird bereits verwendet.');
                }
                throw updateError;
            }

            // Save pending email to localStorage to show banner
            localStorage.setItem('pending_email_update', newEmail);
            setIsPending(true);

        } catch (error) {
            console.error("Update Email Error:", error);
            setMsg(getSafeErrorMessage(error, 'Fehler beim Ändern der E-Mail.'));
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
                                    E-Mail aktualisieren
                                </h2>
                                <p className="text-muted-foreground text-sm text-center">
                                    Bitte gib deine neue E-Mail-Adresse und dein aktuelles Passwort ein.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-3">
                                    <input 
                                        type="email" 
                                        value={newEmail}
                                        onChange={(e) => setNewEmail(e.target.value)}
                                        placeholder="Neue E-Mail-Adresse"
                                        className="w-full bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                                        autoComplete="off"
                                    />
                                    <div className="animate-in slide-in-from-top-2 fade-in">
                                        <PasswordInput
                                            value={password}
                                            onChange={setPassword}
                                            placeholder="Aktuelles Passwort"
                                            showChecklist={false}
                                        />
                                    </div>
                                </div>

                                {msg && (
                                    <div className="bg-rose-600/10 text-rose-600 text-xs p-3 rounded-xl border border-rose-600/20 flex items-center gap-2 font-medium">
                                        <AlertCircle size={14} className="shrink-0" />
                                        <span>{msg}</span>
                                    </div>
                                )}

                                <button
                                    disabled={loading}
                                    className={`${btnPrimary} w-full flex justify-center items-center gap-2 mt-2`}
                                >
                                    {loading && <Loader2 className="animate-spin" size={18} />}
                                    E-Mail ändern
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="flex flex-col items-center gap-4 py-4 text-center animate-in zoom-in-95 fade-in">
                            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center animate-pulse">
                                <CheckCircle size={40} className="text-emerald-400" />
                            </div>
                            <h2 className="text-xl font-bold text-white mt-2">Fast geschafft!</h2>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Wir haben soeben einen Verifizierungslink an <span className="text-foreground font-bold">{newEmail}</span> gesendet. 
                                Sobald du den Link geklickt hast, ist dein neuer Login aktiv.
                            </p>
                            
                            <button
                                onClick={handleCancel}
                                className="mt-4 w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition"
                            >
                                Schließen
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};
