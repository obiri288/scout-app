import React, { useState, useEffect } from 'react';
import { WaitlistLanding } from '../pages/WaitlistLanding';
import { supabase } from '../lib/supabase';
import ImprintScreen from './ImprintScreen';
import PrivacyScreen from './PrivacyScreen';

/**
 * WaitlistGuard — Intelligent routing component for pre-launch phase.
 * 
 * 4 logic layers:
 * 1. Status-Check:  Is the app in waitlist mode? (VITE_APP_STATUS === 'waitlist')
 * 2. VIP-Bypass:    ?beta=cavio-vip URL parameter → persisted in localStorage
 * 3. Session-Check: Active Supabase session → user gets full access
 * 4. Login-Route:   /login path is always accessible (for the subtle link on WaitlistLanding)
 * 
 * If ALL conditions block → show WaitlistLanding
 * Otherwise → render children (full app)
 */
const WaitlistGuard = ({ children }) => {
    const [hasSession, setHasSession] = useState(false);
    const [sessionChecked, setSessionChecked] = useState(false);

    // --- Layer 1: Status Check ---
    const isWaitlistMode = import.meta.env.VITE_APP_STATUS === 'waitlist';

    // --- Layer 2: VIP Beta Bypass ---
    useEffect(() => {
        const url = new URL(window.location.href);
        const betaParam = url.searchParams.get('beta');
        if (betaParam === 'cavio-vip') {
            localStorage.setItem('cavio_beta_access', 'true');
            // Clean the URL to hide the beta parameter
            url.searchParams.delete('beta');
            window.history.replaceState({}, document.title, url.pathname + url.hash);
        }
    }, []);

    const hasBetaAccess = localStorage.getItem('cavio_beta_access') === 'true';

    // --- Layer 3: Session Check (Supabase) ---
    useEffect(() => {
        // Only bother checking session if we're actually in waitlist mode
        if (!isWaitlistMode) {
            setSessionChecked(true);
            return;
        }

        const checkSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                setHasSession(!!session);
            } catch (e) {
                console.warn('[WaitlistGuard] Session check failed:', e);
                setHasSession(false);
            } finally {
                setSessionChecked(true);
            }
        };

        checkSession();

        // Listen for auth state changes (e.g., login while on waitlist page)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setHasSession(!!session);
        });

        return () => subscription?.unsubscribe();
    }, [isWaitlistMode]);

    // --- Layer 4: Routing & Gatekeeper Logic ---
    const path = window.location.pathname;
    const isWaitlistRoute = path === '/waitlist';
    const isLoginRoute = path === '/login';
    const isResetPasswordRoute = path === '/reset-password';
    const isImpressumRoute = path === '/impressum';
    const isDatenschutzRoute = path === '/datenschutz';
    
    const isPublicRoute = isWaitlistRoute || isLoginRoute || isResetPasswordRoute || isImpressumRoute || isDatenschutzRoute;

    // Redirect logic
    useEffect(() => {
        if (!sessionChecked) return;

        // Bypass logic if not in waitlist mode, though typically we always want auth guards.
        // Assuming WaitlistGuard is our primary AuthGuard for pre-launch:
        if (!hasSession && !isPublicRoute && !hasBetaAccess) {
            // Regel A: User is not logged in and tries to access protected route -> redirect to /waitlist
            window.location.replace('/waitlist');
        } else if (hasSession && (isWaitlistRoute || isLoginRoute)) {
            // Regel C: User is logged in and tries to access /waitlist or /login -> redirect to inside the app (/)
            window.location.replace('/');
        }
    }, [sessionChecked, hasSession, isPublicRoute, hasBetaAccess, isWaitlistRoute, isLoginRoute]);

    // --- Wait for session check or redirect to complete before rendering ---
    if (!sessionChecked || (!hasSession && !isPublicRoute && !hasBetaAccess) || (hasSession && (isWaitlistRoute || isLoginRoute))) {
        // Fallback / Ladezustand (Regel 3)
        return (
            <div style={{
                minHeight: '100vh',
                background: '#020617', // Midnight Slate
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                <img 
                    src="/cavio-icon.png" 
                    alt="CAVIO Loading" 
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

    // --- Final Render Decision ---
    if (isImpressumRoute) return <ImprintScreen />;
    if (isDatenschutzRoute) return <PrivacyScreen />;

    // If they are legitimately on the waitlist route and not logged in (Regel B)
    if (isWaitlistRoute && !hasSession) {
        return <WaitlistLanding />;
    }

    // All other cases (e.g. they are logged in on a protected route, or on /login): let the user through
    return <>{children}</>;
};

export default WaitlistGuard;
