import { inject } from '@vercel/analytics';

export const initializeAnalytics = () => {
    // Only initialize once
    if (window.__ANALYTICS_INITIALIZED__) return;
    window.__ANALYTICS_INITIALIZED__ = true;
    
    
    // Vercel Analytics integrieren
    inject();
    
    // Beispiel für Google Analytics:
    // const script = document.createElement('script');
    // script.src = 'https://www.googletagmanager.com/gtag/js?id=DEIN_ID';
    // script.async = true;
    // document.head.appendChild(script);
};
