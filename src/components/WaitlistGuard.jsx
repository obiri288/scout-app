import React, { useState, useEffect } from 'react';
import { WaitlistLanding } from '../pages/WaitlistLanding';
import { supabase } from '../lib/supabase';
import Impressum from './Impressum';
import Datenschutz from './Datenschutz';

/**
 * WaitlistGuard — Sustainable Access Control Architecture.
 * 
 * Logic:
 * 1. Unauthenticated visitors -> Render WaitlistLanding (landing page with waitlist signup & login modal).
 * 2. Authenticated users (logged in via Google OAuth or Email) -> Always grant full access to CAVIOS app!
 * 3. Static legal routes (/impressum, /datenschutz) -> Accessible directly.
 */
const WaitlistGuard = ({ children }) => {
    const [hasSession, setHasSession] = useState(false);
    const [sessionChecked, setSessionChecked] = useState(false);

    // VIP Beta Bypass parameter check
    useEffect(() => {
        const url = new URL(window.location.href);
        const betaParam = url.searchParams.get('beta');
        if (betaParam === 'CAVIOS-vip' || betaParam === 'vip') {
            localStorage.setItem('CAVIOS_beta_access', 'true');
        }
    }, []);

    // Session Listener
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setHasSession(!!session?.user);
            setSessionChecked(true);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setHasSession(!!session?.user);
            setSessionChecked(true);
        });

        return () => subscription?.unsubscribe();
    }, []);

    const path = window.location.pathname;
    const isImpressumRoute = path === '/impressum' || path === '/privacy';
    const isDatenschutzRoute = path === '/datenschutz' || path === '/imprint';

    // Loading Spinner while initializing session
    if (!sessionChecked) {
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
