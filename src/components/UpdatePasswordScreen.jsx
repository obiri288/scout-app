import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Key, AlertCircle, Loader2, CheckCircle, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getSafeErrorMessage } from '../lib/errorMessages';
import { btnPrimary, cardStyle } from '../lib/styles';
import { PasswordInput } from './ui/PasswordInput';

const UpdatePasswordScreen = () => {
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
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;

            setIsSuccess(true);
            setTimeout(() => {
                window.location.href = '/';
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
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            {/* Background Glow */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`w-full max-w-md ${cardStyle} p-8 relative shadow-2xl shadow-cyan-900/10 border border-white/5 backdrop-blur-xl z-10`}
            >
                <div className="animate-in fade-in slide-in-from-bottom-4">
                    {!isSuccess && (
                        <div className="flex flex-col items-center gap-4 mb-8">
                            <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-900/20 ring-1 ring-cyan-500/20 text-cyan-400">
                                <Key size={32} />
                            </div>
                            <div className="text-center">
                                <h2 className="text-2xl font-bold text-white">
                                    Neues Passwort setzen
                                </h2>
                                <p className="text-muted-foreground text-sm mt-2">
                                    Sichere deinen Account mit einem neuen Passwort.
                                </p>
                            </div>
                        </div>
                    )}

                    {isSuccess ? (
                        <div className="flex flex-col items-center gap-6 py-6 text-center animate-in zoom-in-95 fade-in">
                            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center animate-bounce">
                                <CheckCircle size={40} className="text-emerald-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white mt-2">Passwort geändert!</h2>
                                <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                                    Dein neues Passwort ist aktiv. Du wirst gleich zum Feed weitergeleitet.
                                </p>
                            </div>
                            
                            <button
                                onClick={() => { window.location.href = '/'; }}
                                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3.5 rounded-xl transition flex justify-center items-center gap-2 group"
                            >
                                Sofort weiter <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
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
                            
                            <button
                                type="button"
                                onClick={() => { window.location.href = '/'; }}
                                className="w-full text-zinc-500 text-sm hover:text-white transition py-2"
                            >
                                Abbrechen
                            </button>
                        </form>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default UpdatePasswordScreen;
