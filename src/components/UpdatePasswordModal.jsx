import React, { useState } from 'react';
import { X, Key, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getSafeErrorMessage } from '../lib/errorMessages';
import { btnPrimary, cardStyle } from '../lib/styles';
import { PasswordInput } from './ui/PasswordInput';

export const UpdatePasswordModal = ({ onClose, onSuccess }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isPasswordValid, setIsPasswordValid] = useState(false);
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMsg('');

        if (!isPasswordValid) {
            setMsg("Bitte erfülle alle Passwort-Kriterien!");
            setLoading(false);
            return;
        }

        if (password !== confirmPassword) {
            setMsg("Passwörter stimmen nicht überein!");
            setLoading(false);
            return;
        }

        try {
            // Verify we have an active session before attempting update
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setMsg('Deine Sitzung ist abgelaufen. Bitte fordere einen neuen Reset-Link an.');
                setLoading(false);
                return;
            }

            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;

            setIsSuccess(true);
            setTimeout(() => {
                if (onSuccess) onSuccess();
                else onClose();
            }, 3000);
        } catch (error) {
            console.error("Update Password Error:", error);
            const message = error?.message || '';
            if (message.includes('session') || message.includes('token') || message.includes('expired')) {
                setMsg('Der Reset-Link ist abgelaufen. Bitte fordere einen neuen an.');
            } else {
                setMsg(getSafeErrorMessage(error, 'Fehler beim Aktualisieren des Passworts.'));
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
            <div className={`w-full max-w-sm ${cardStyle} p-8 relative shadow-2xl shadow-cyan-900/10`}>
                <button onClick={onClose} className="absolute top-5 right-5 text-zinc-500 hover:text-white transition">
                    <X size={20} />
                </button>
                <div className="animate-in fade-in slide-in-from-bottom-4">
                    {!isSuccess && (
                        <div className="flex flex-col items-center gap-3 mb-8">
                            <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-900/20 ring-1 ring-cyan-500/20 text-cyan-400">
                                <Key size={32} />
                            </div>
                            <h2 className="text-2xl font-bold text-white text-center">
                                Neues Passwort setzen
                            </h2>
                            <p className="text-muted-foreground text-sm text-center">
                                Bitte wähle ein neues, sicheres Passwort für deinen Account.
                            </p>
                        </div>
                    )}

                    {isSuccess ? (
                        <div className="flex flex-col items-center gap-4 py-4 text-center animate-in zoom-in-95 fade-in">
                            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center animate-pulse">
                                <CheckCircle size={40} className="text-emerald-400" />
                            </div>
                            <h2 className="text-xl font-bold text-white mt-2">Passwort geändert!</h2>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Dein neues Passwort ist ab sofort aktiv. Viel Erfolg bei deinem nächsten Match!
                            </p>
                            
                            <button
                                onClick={() => { if (onSuccess) onSuccess(); else onClose(); }}
                                className="mt-4 w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3.5 rounded-xl transition flex justify-center items-center gap-2 group"
                            >
                                Weiter zur App
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-3">
                                <PasswordInput
                                    value={password}
                                    onChange={setPassword}
                                    showChecklist={true}
                                    onValidChange={setIsPasswordValid}
                                    placeholder="Neues Passwort"
                                />
                                <div className="animate-in slide-in-from-top-2 fade-in">
                                    <PasswordInput
                                        value={confirmPassword}
                                        onChange={setConfirmPassword}
                                        placeholder="Passwort bestätigen"
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
                                Passwort speichern
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};
