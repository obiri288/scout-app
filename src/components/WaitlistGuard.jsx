import React, { useState, useEffect } from 'react';
import { WaitlistLanding } from '../pages/WaitlistLanding';
import { supabase } from '../lib/supabase';
import Impressum from './Impressum';
import Datenschutz from './Datenschutz';

/**
 * WaitlistGuard — Bulletproof Access Control Architecture.
 * 
 * 1. Checks URL for OAuth tokens/hashes (#access_token, ?code=, ?login=true).
 * 2. While verifying auth or during OAuth redirect exchange -> shows branded loading screen ("Verifizierung läuft...").
 * 3. Authenticated users -> Always enter CAVIOS app / Onboarding Wizard directly.
 * 4. Unauthenticated visitors -> Render WaitlistLanding.
 */
const WaitlistGuard = ({ children }) => {
    const [hasSession, setHasSession] = useState(false);
    const [sessionChecked, setSessionChecked] = useState(false);
    const [isVerifyingOAuth, setIsVerifyingOAuth] = useState(() => {
        if (typeof window === 'undefined') return false;
        const hash = window.location.hash || '';
        const search = window.location.search || '';
        return hash.includes('access_token=') || hash.includes('refresh_token=') || search.includes('code=') || search.includes('auth_callback=');
    });

    // VIP Beta Bypass parameter check
    useEffect(() => {
        const url = new URL(window.location.href);
        const betaParam = url.searchParams.get('beta');
        if (betaParam === 'CAVIOS-vip' || betaParam === 'vip') {
            localStorage.setItem('CAVIOS_beta_access', 'true');
        }
    }, []);

    // Session & Auth State Listener
    useEffect(() => {
        let isMounted = true;

        const checkSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (isMounted) {
                    setHasSession(!!session?.user);
                    setSessionChecked(true);
                    if (session?.user) {
                        setIsVerifyingOAuth(false);
                    }
                }
            } catch (e) {
                if (isMounted) {
                    setSessionChecked(true);
                    setIsVerifyingOAuth(false);
                }
            }
        };

        checkSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (isMounted) {
                setHasSession(!!session?.user);
                setSessionChecked(true);
                if (session?.user) {
                    setIsVerifyingOAuth(false);
                }
            }
        });

        // 3.5s safety fallback timeout for OAuth callback
        const timeout = setTimeout(() => {
            if (isMounted) {
                setSessionChecked(true);
                setIsVerifyingOAuth(false);
            }
        }, 3500);

        return () => {
            isMounted = false;
            subscription?.unsubscribe();
            clearTimeout(timeout);
        };
    }, []);

    const path = window.location.pathname;
    const isImpressumRoute = path === '/impressum' || path === '/privacy';
    const isDatenschutzRoute = path === '/datenschutz' || path === '/imprint';

    // Loading Spinner while initializing session or verifying OAuth token
    if (!sessionChecked || isVerifyingOAuth) {
        return (
            <div style={{
                minHeight: '100vh',
                background: '#020617',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px',
                fontFamily: 'sans-serif'
            }}>
                <img 
                    src="/cavios-icon.png" 
                    alt="CAVIOS Loading" 
                    style={{
                        width: '64px',
                        height: '64px',
                        animation: 'pulse 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                        filter: 'drop-shadow(0 0 20px rgba(34, 211, 238, 0.5))'
                    }} 
                />
                <p style={{ color: '#94a3b8', fontSize: '14px', fontWeight: 600, letterSpacing: '0.05em' }}>
                    Dein VIP-Zugang wird verifiziert... 🚀
                </p>
                <style>{`@keyframes pulse { 50% { opacity: .5; transform: scale(0.95); } }`}</style>
            </div>
        );
    }

    // Static Legal Pages
    if (isImpressumRoute) return <Impressum />;
    if (isDatenschutzRoute) return <Datenschutz />;

    // Unauthenticated Visitor -> Render Waitlist Landing Page
    if (!hasSession) {
        return <WaitlistLanding />;
    }

    // Authenticated User -> Full App Access!
    return <>{children}</>;
};

export default WaitlistGuard;
