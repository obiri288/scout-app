import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Instagram } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Footer } from '../components/Footer';
import logoImg from '../assets/image.png';
import { SECRET_ACCESS_PATH } from '../lib/config';

/**
 * WaitlistLanding — Premium Glassmorphism pre-launch landing page.
 * 
 * Design: Midnight Slate + Electric Cyan + Glassmorphism
 * Features:
 *   - Framer Motion fade-in/slide-up animations
 *   - Ambient cyan glow background effect
 *   - Glass-card with backdrop blur
 *   - Email capture → Supabase 'waitlist' table
 *   - Success/error state handling
 *   - Login bypass link for verified members
 */
export const WaitlistLanding = () => {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('idle'); // idle | loading | success | error | duplicate
    const [errorMsg, setErrorMsg] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false); // Spam-Cooldown (5s)

    // Honeypot state — must remain empty; bots fill it automatically
    const [honeypot, setHoneypot] = useState('');

    // Team Invite States
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteStatus, setInviteStatus] = useState('idle'); // idle | loading | success | error
    const [inviteError, setInviteError] = useState('');
    const [isInviteSubmitting, setIsInviteSubmitting] = useState(false); // Invite-Cooldown (5s)

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email || !email.includes('@')) return;

        // 🛡️ Honeypot check — bots fill hidden fields, humans don't
        if (honeypot) return;

        // 🛡️ Cooldown check — prevent spam-clicking
        if (isSubmitting) return;

        setIsSubmitting(true);
        setStatus('loading');
        setErrorMsg('');

        // Re-enable button after 5 seconds regardless of outcome
        setTimeout(() => setIsSubmitting(false), 5000);

        try {
            const { error } = await supabase
                .from('waitlist')
                .insert({ email: email.trim().toLowerCase() });

            if (error) {
                // Unique constraint violation = duplicate email
                if (error.code === '23505') {
                    setStatus('duplicate');
                } else {
                    setStatus('error');
                    setErrorMsg(error.message || 'Ein Fehler ist aufgetreten.');
                }
            } else {
                setStatus('success');
            }
        } catch (err) {
            setStatus('error');
            setErrorMsg('Netzwerkfehler. Bitte versuche es erneut.');
        }
    };

    const handleInvite = async (e) => {
        e.preventDefault();
        if (!inviteEmail || !inviteEmail.includes('@')) return;

        // 🛡️ Cooldown check — prevent spam-clicking
        if (isInviteSubmitting) return;

        setIsInviteSubmitting(true);
        setInviteStatus('loading');
        setInviteError('');

        // Re-enable button after 5 seconds
        setTimeout(() => setIsInviteSubmitting(false), 5000);

        try {
            // Try with referred_by field
            let { error } = await supabase
                .from('waitlist')
                .insert({ 
                    email: inviteEmail.trim().toLowerCase(), 
                    referred_by: email.trim().toLowerCase() 
                });
            
            // If the column referred_by doesn't exist (PGRST204 or 42703), retry without it
            if (error && (error.code === '42703' || error.code === 'PGRST204')) {
                const retry = await supabase
                    .from('waitlist')
                    .insert({ email: inviteEmail.trim().toLowerCase() });
                error = retry.error;
            }

            if (error) {
                if (error.code === '23505') {
                    setInviteStatus('error');
                    setInviteError('Diese E-Mail steht bereits auf der Liste.');
                } else {
                    setInviteStatus('error');
                    setInviteError(error.message || 'Ein Fehler ist aufgetreten.');
                }
            } else {
                setInviteStatus('success');
                setInviteEmail(''); // clear field
                // Timeout to reset success message after a few seconds so user can invite more
                setTimeout(() => setInviteStatus('idle'), 4000);
            }
        } catch (err) {
            setInviteStatus('error');
            setInviteError('Netzwerkfehler. Bitte versuche es erneut.');
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden font-sans">

            {/* === Ambient Glow Effects === */}
            <div
                className="absolute pointer-events-none"
                style={{
                    top: '20%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '700px',
                    height: '700px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(34,211,238,0.07) 0%, rgba(6,182,212,0.03) 40%, transparent 70%)',
                }}
            />
            <div
                className="absolute pointer-events-none"
                style={{
                    bottom: '10%',
                    right: '15%',
                    width: '400px',
                    height: '400px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(34,211,238,0.04) 0%, transparent 60%)',
                }}
            />

            {/* === Floating Particles (decorative) === */}
            {[...Array(6)].map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute rounded-full pointer-events-none"
                    style={{
                        width: `${2 + i * 1.5}px`,
                        height: `${2 + i * 1.5}px`,
                        background: `rgba(34,211,238,${0.15 + i * 0.05})`,
                        left: `${15 + i * 13}%`,
                        top: `${20 + i * 10}%`,
                    }}
                    animate={{
                        y: [0, -20, 0],
                        opacity: [0.3, 0.7, 0.3],
                    }}
                    transition={{
                        duration: 3 + i * 0.8,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: i * 0.4,
                    }}
                />
            ))}

            {/* === Main Content Container === */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col items-center z-10 px-4 w-full"
            >
                {/* Exclusive Access Badge */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                    className="flex items-center gap-2 mb-6"
                >
                    <span
                        className="inline-block rounded-full"
                        style={{
                            width: '6px',
                            height: '6px',
                            backgroundColor: '#22d3ee',
                            boxShadow: '0 0 10px rgba(34,211,238,0.6)',
                            animation: 'waitlistPulse 2s ease-in-out infinite',
                        }}
                    />
                    <span className="text-xs font-semibold tracking-[0.25em] uppercase text-slate-500">
                        Exklusiver Zugang
                    </span>
                </motion.div>

                {/* Logo Image */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    className="mb-8 flex justify-center"
                >
                    <img 
                        src={logoImg} 
                        alt="CAVIOS Logo" 
                        className="h-16 sm:h-20 w-auto object-contain filter drop-shadow-[0_0_12px_rgba(34,211,238,0.2)]"
                    />
                </motion.div>

                {/* === Glass Card === */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    className="backdrop-blur-xl bg-slate-900/50 border border-slate-700/50 rounded-2xl p-8 max-w-md w-full text-center"
                    style={{
                        boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 60px rgba(34,211,238,0.03)',
                    }}
                >
                    <AnimatePresence mode="wait">
                        {status === 'success' ? (
                            /* === Success State === */
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.5 }}
                                className="py-4"
                            >
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 12 }}
                                    className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                                    style={{
                                        background: 'rgba(34,211,238,0.15)',
                                        border: '1px solid rgba(34,211,238,0.3)',
                                    }}
                                >
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                </motion.div>
                                <h2 className="text-xl font-bold text-slate-100 mb-2">
                                    Du bist auf der VIP-Warteliste! 🚀
                                </h2>
                                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                                    Wir benachrichtigen dich, sobald CAVIOS live geht.
                                </p>

                                {/* Referral Section */}
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4 }}
                                    className="bg-slate-950/50 border border-slate-800 rounded-xl p-6 mt-4 text-left"
                                >
                                    <h3 className="text-lg font-bold text-cyan-400 mb-2">
                                        Bringe dein Team an den Start
                                    </h3>
                                    <p className="text-slate-400 text-xs sm:text-sm mb-4 leading-relaxed">
                                        CAVIOS schaltet Vereins-Hubs priorisiert frei, sobald sich mehrere Spieler eines Teams registrieren. Nominiere deine Teamkollegen, um euren Kader schneller freizuschalten.
                                    </p>

                                    <form onSubmit={handleInvite} className="space-y-3">
                                        <div className="relative">
                                            <input
                                                type="email"
                                                value={inviteEmail}
                                                onChange={(e) => setInviteEmail(e.target.value)}
                                                placeholder="kollege@email.com"
                                                required
                                                disabled={inviteStatus === 'loading'}
                                                className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 text-slate-200 rounded-xl px-4 py-3 outline-none text-sm transition-all placeholder:text-slate-600 disabled:opacity-50"
                                            />
                                        </div>
                                        
                                        {inviteError && (
                                            <p className="text-rose-400 text-xs mt-1">{inviteError}</p>
                                        )}
                                        
                                        {inviteStatus === 'success' && (
                                            <p className="text-emerald-400 text-xs mt-1">Erfolgreich eingetragen. Weiteren Kollegen einladen...</p>
                                        )}

                                        <button
                                            type="submit"
                                            disabled={inviteStatus === 'loading' || !inviteEmail}
                                            className="w-full bg-slate-800 hover:bg-slate-700 text-cyan-400 font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                                        >
                                            {inviteStatus === 'loading' ? (
                                                <span className="flex items-center gap-2">
                                                    <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                                                    Lade ein...
                                                </span>
                                            ) : (
                                                'Kollegen nominieren'
                                            )}
                                        </button>
                                    </form>
                                </motion.div>
                            </motion.div>
                        ) : status === 'duplicate' ? (
                            /* === Duplicate State === */
                            <motion.div
                                key="duplicate"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.5 }}
                                className="py-4"
                            >
                                <div
                                    className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                                    style={{
                                        background: 'rgba(34,211,238,0.1)',
                                        border: '1px solid rgba(34,211,238,0.2)',
                                    }}
                                >
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                                        <path d="m9 12 2 2 4-4" />
                                    </svg>
                                </div>
                                <h2 className="text-xl font-bold text-cyan-400 mb-2">
                                    Du bist bereits auf der Liste! 🚀
                                </h2>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    Wir melden uns bald bei dir. Halte Ausschau nach unserer offiziellen Launch-Benachrichtigung.
                                </p>
                            </motion.div>
                        ) : (
                            /* === Form State === */
                            <motion.div
                                key="form"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <h2 className="text-2xl sm:text-3xl font-bold text-slate-100 mb-2">
                                    Die Zukunft des Scoutings.
                                </h2>
                                <p className="text-slate-400 text-sm sm:text-base mt-2 mb-6 leading-relaxed">
                                    CAVIOS bereitet den offiziellen Launch vor.<br />
                                    Sichere dir exklusiven Vorabzugang.
                                </p>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    {/* 🛡️ Honeypot — invisible to humans, bots fill it → silent abort */}
                                    <input
                                        type="text"
                                        name="b_confirm_fax"
                                        value={honeypot}
                                        onChange={(e) => setHoneypot(e.target.value)}
                                        tabIndex={-1}
                                        autoComplete="off"
                                        aria-hidden="true"
                                        style={{ display: 'none' }}
                                    />
                                    <div className="relative">
                                        <input
                                            id="waitlist-email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="deine@email.com"
                                            required
                                            disabled={status === 'loading'}
                                            className="w-full bg-slate-950/50 border border-slate-700 text-slate-200 rounded-lg px-4 py-3 outline-none transition-all placeholder:text-slate-600 disabled:opacity-50"
                                            style={{
                                                fontSize: '0.95rem',
                                            }}
                                            onFocus={(e) => {
                                                e.target.style.borderColor = '#22d3ee';
                                                e.target.style.boxShadow = '0 0 0 3px rgba(34,211,238,0.1)';
                                            }}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = '';
                                                e.target.style.boxShadow = '';
                                            }}
                                        />
                                    </div>

                                    {/* Error message */}
                                    <AnimatePresence>
                                        {status === 'error' && (
                                            <motion.p
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="text-red-400 text-sm text-left"
                                            >
                                                {errorMsg}
                                            </motion.p>
                                        )}
                                    </AnimatePresence>

                                    <motion.button
                                        id="waitlist-submit"
                                        type="submit"
                                        disabled={status === 'loading' || !email || isSubmitting}
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="w-full mt-4 bg-cyan-500 text-slate-950 font-bold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        style={{
                                            boxShadow: '0 0 15px rgba(34,211,238,0.3)',
                                        }}
                                        onMouseEnter={(e) => {
                                            if (status !== 'loading') {
                                                e.currentTarget.style.backgroundColor = '#22d3ee';
                                                e.currentTarget.style.boxShadow = '0 0 25px rgba(34,211,238,0.5)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = '';
                                            e.currentTarget.style.boxShadow = '0 0 15px rgba(34,211,238,0.3)';
                                        }}
                                    >
                                        {status === 'loading' ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <motion.span
                                                    animate={{ rotate: 360 }}
                                                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                                    className="inline-block w-5 h-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full"
                                                />
                                                Wird eingetragen...
                                            </span>
                                        ) : (
                                            'Platz sichern'
                                        )}
                                    </motion.button>
                                    <p className="text-[11px] text-slate-500 mt-3 text-center">
                                        Mit dem Eintragen stimmst du unserer <a href="/datenschutz" className="text-cyan-500 hover:text-cyan-400 underline">Datenschutzerklärung</a> zu. Abmeldung jederzeit möglich.
                                    </p>
                                </form>

                                {/* Social proof / counter */}
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.8, duration: 0.6 }}
                                    className="text-slate-600 text-xs mt-4"
                                >
                                    🔒 Kein Spam. Nur Launch-Updates.
                                </motion.p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1, duration: 0.6 }}
                    className="mt-8 flex flex-col items-center gap-0"
                >
                    <a
                        href={SECRET_ACCESS_PATH}
                        id="waitlist-login-link"
                        className="text-sm transition-colors"
                        style={{
                            color: 'rgba(100,116,139,0.7)',
                        }}
                        onMouseEnter={(e) => (e.target.style.color = '#22d3ee')}
                        onMouseLeave={(e) => (e.target.style.color = 'rgba(100,116,139,0.7)')}
                    >
                        Bereits verifiziertes Mitglied? Login
                    </a>

                    {/* === Instagram Link === */}
                    <a
                        href="https://www.instagram.com/cavios.de/"
                        target="_blank"
                        rel="noopener noreferrer"
                        id="waitlist-instagram-link"
                        className="flex items-center justify-center gap-2 mt-6 text-sm text-slate-400 hover:text-cyan-400 transition-colors"
                    >
                        <Instagram size={16} />
                        @cavios.de
                    </a>
                </motion.div>
            </motion.div>

            <style>{`
                @keyframes waitlistPulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.4; transform: scale(0.8); }
                }
            `}</style>

            <Footer />
        </div>
    );
};

export default WaitlistLanding;
