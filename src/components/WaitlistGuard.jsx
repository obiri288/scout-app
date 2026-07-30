import React, { useState, useEffect } from 'react';
import { WaitlistLanding } from '../pages/WaitlistLanding';
import { supabase } from '../lib/supabase';
import { SECRET_ACCESS_PATH } from '../lib/config';
import Impressum from './Impressum';
import Datenschutz from './Datenschutz';

/**
 * WaitlistGuard — Intelligent routing component for pre-launch phase.
 * 
 * 4 logic layers:
 * 1. Status-Check:  Is the app in waitlist mode? (VITE_APP_STATUS === 'waitlist')
 * 2. VIP-Bypass:    ?beta=CAVIOS-vip URL parameter → persisted in localStorage
 * 3. Session-Check: Active Supabase session → user gets full access
 * 4. Login-Route:   /login path is always accessible (for the subtle link on WaitlistLanding)
 * 
 * If ALL conditions block → show WaitlistLanding
 * Otherwise → render children (full app)
 */
const WaitlistGuard = ({ children }) => {
    const [hasSession, setHasSession] = useState(false);
    const [sessionChecked, setSessionChecked] = useState(false);
    const [isApproved, setIsApproved] = useState(false);
    const [approvalChecked, setApprovalChecked] = useState(false);
    const [userEmail, setUserEmail] = useState('');

    // --- Layer 1: Status Check ---
    const isWaitlistMode = import.meta.env.VITE_APP_STATUS === 'waitlist';

    // --- Layer 2: VIP Beta Bypass ---
    useEffect(() => {
        const url = new URL(window.location.href);
        const betaParam = url.searchParams.get('beta');
        if (betaParam === 'CAVIOS-vip') {
            localStorage.setItem('CAVIOS_beta_access', 'true');
            url.searchParams.delete('beta');
            window.history.replaceState({}, document.title, url.pathname + url.hash);
        }
    }, []);

    const hasBetaAccess = localStorage.getItem('CAVIOS_beta_access') === 'true';

    // --- Layer 3: Session & Waitlist Approval Check (Supabase) ---
    useEffect(() => {
        if (!isWaitlistMode) {
            setSessionChecked(true);
            setApprovalChecked(true);
            setIsApproved(true);
            return;
        }

        const verifyUserApproval = async (session) => {
            if (!session?.user) {
                setHasSession(false);
                setIsApproved(false);
                setUserEmail('');
                setSessionChecked(true);
                setApprovalChecked(true);
                return;
            }

            setHasSession(true);
            const email = (session.user.email || '').toLowerCase();
            setUserEmail(email);

            // Admins are always approved
            const ADMIN_EMAILS = ['bordomobiri@gmail.com', 'kontakt@cavios.de'];
            if (ADMIN_EMAILS.includes(email) || hasBetaAccess) {
                setIsApproved(true);
                setSessionChecked(true);
                setApprovalChecked(true);
                return;
            }

            try {
                const cleanEmail = email.trim().toLowerCase();

                // Check 1: Does user already have a player profile in players_master?
                const { data: profile } = await supabase
                    .from('players_master')
                    .select('id')
                    .eq('user_id', session.user.id)
                    .maybeSingle();

                if (profile) {
                    setIsApproved(true);
                    setSessionChecked(true);
                    setApprovalChecked(true);
                    return;
                }

                // Check 2: Query waitlist table for matching email
                const { data: waitlistEntries, error: wlError } = await supabase
                    .from('waitlist')
                    .select('status, email')
                    .or(`email.ilike.${cleanEmail},email.eq.${cleanEmail}`);

                if (wlError) {
                    console.warn('[WaitlistGuard] Waitlist query error:', wlError);
                    setIsApproved(true);
                    return;
                }

                if (waitlistEntries && waitlistEntries.length > 0) {
                    const isAnyApproved = waitlistEntries.some(
                        e => e.status === 'approved' || e.status === 'invited'
                    );
                    setIsApproved(isAnyApproved);
                } else {
                    // New logged-in user auto-approval
                    await supabase.from('waitlist').insert({ email: cleanEmail, status: 'approved' }).catch(() => {});
                    setIsApproved(true);
                }
            } catch (e) {
                console.warn('[WaitlistGuard] Approval check error:', e);
                setIsApproved(true);
            } finally {
                setSessionChecked(true);
                setApprovalChecked(true);
            }
        };

        supabase.auth.getSession().then(({ data: { session } }) => {
            verifyUserApproval(session);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            verifyUserApproval(session);
        });

        return () => subscription?.unsubscribe();
    }, [isWaitlistMode, hasBetaAccess]);

    // --- Layer 4: Routing & Gatekeeper Logic ---
    const path = window.location.pathname;
    const isWaitlistRoute = path === '/waitlist';
    const isLoginRoute = path === SECRET_ACCESS_PATH || path === '/login' || path === '/partner-access';
    const isResetPasswordRoute = path === '/reset-password';
    const isImpressumRoute = path === '/impressum' || path === '/privacy';
    const isDatenschutzRoute = path === '/datenschutz' || path === '/imprint';
    const isAuthCallbackRoute = path === '/auth-callback' || path === '/welcome' || path.startsWith('/auth/');

    const hasOAuthToken = typeof window !== 'undefined' && (
        window.location.hash.includes('access_token=') ||
        window.location.hash.includes('refresh_token=') ||
        window.location.hash.includes('error=') ||
        window.location.search.includes('code=')
    );
    
    const isPublicRoute = isWaitlistRoute || isLoginRoute || isResetPasswordRoute || isImpressumRoute || isDatenschutzRoute || isAuthCallbackRoute || hasOAuthToken;

    // Loading State
    if (!sessionChecked || !approvalChecked) {
        return (
            <div style={{
                minHeight: '100vh',
                background: '#020617',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                <img 
                    src="/cavios-icon.png" 
                    alt="CAVIOS Loading" 
                    style={{
                        width: '64px',
                        height: '64px',
                        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                        filter: 'drop-shadow(0 0 15px rgba(34, 211, 238, 0.4))'
                    }} 
                />
                <style>{`@keyframes pulse { 50% { opacity: .5; transform: scale(0.95); } }`}</style>
            </div>
        );
    }

    // Static Legal Pages
    if (isImpressumRoute && path === '/impressum') return <Impressum />;
    if (isDatenschutzRoute && path === '/datenschutz') return <Datenschutz />;

    // Unauthenticated user attempting to access protected route -> show WaitlistLanding
    if (!hasSession) {
        if (isPublicRoute) {
            if (isWaitlistRoute) return <WaitlistLanding />;
            return <>{children}</>;
        }
        return <WaitlistLanding />;
    }

    // Logged-in User but NOT approved yet
    if (hasSession && !isApproved && isWaitlistMode && !hasBetaAccess) {
        return (
            <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
                <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-xl shadow-2xl space-y-6">
                    <div className="w-16 h-16 bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center mx-auto border border-amber-500/20">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                        </svg>
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold">Warteliste ausstehend</h2>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Deine E-Mail <span className="text-cyan-400 font-medium">{userEmail}</span> ist registriert, wurde jedoch noch nicht freigeschaltet.
                        </p>
                        <p className="text-slate-400 text-xs leading-relaxed">
                            Wir schalten schrittweise neue Kontingente frei. Du erhältst eine Benachrichtigung, sobald dein Zugang freigeschaltet ist.
                        </p>
                    </div>
                    <button
                        onClick={async () => {
                            await supabase.auth.signOut();
                            window.location.href = '/waitlist';
                        }}
                        className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition text-sm border border-white/10"
                    >
                        Mit anderem Account anmelden
                    </button>
                </div>
            </div>
        );
    }

    // User is logged in and approved -> Grant full access to app
    return <>{children}</>;
};

export default WaitlistGuard;
