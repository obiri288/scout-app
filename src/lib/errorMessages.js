/**
 * Safe Error Message Mapping
 * Maps raw Supabase/internal error messages to user-friendly German messages.
 * Prevents leaking stack traces, DB structure, or internal details to end users.
 */

const ERROR_MAP = {
    // Auth errors
    'Invalid login credentials': 'E-Mail oder Passwort ist falsch.',
    'User already registered': 'Diese E-Mail ist bereits registriert.',
    'Email not confirmed': 'Bitte bestätige zuerst deine E-Mail-Adresse.',
    'Password should be at least 6 characters': 'Das Passwort muss mindestens 6 Zeichen lang sein.',
    'Signup requires a valid password': 'Bitte gib ein gültiges Passwort ein.',
    'Unable to validate email address: invalid format': 'Bitte gib eine gültige E-Mail-Adresse ein.',
    'Email rate limit exceeded': 'Zu viele Anfragen. Bitte versuche es später erneut.',
    'For security purposes, you can only request this after 60 seconds.': 'Bitte warte einen Moment, bevor du es erneut versuchst.',
    'New email address is the same as the old one': 'Die neue E-Mail ist identisch mit der aktuellen.',
    'Identity already linked': 'Dieses Konto ist bereits mit einem anderen Nutzer verknüpft.',

    // Storage errors
    'The resource already exists': 'Diese Datei existiert bereits.',
    'Payload too large': 'Die Datei ist zu groß.',
    'Invalid MIME type': 'Dieses Dateiformat wird nicht unterstützt.',

    // Generic
    'FetchError': 'Netzwerkfehler — bitte prüfe deine Internetverbindung.',
};

/**
 * Returns a safe, user-facing error message.
 * @param {Error|object} error - The error object
 * @param {string} fallback - Fallback message if no mapping found. If null, returns the original message if no mapping exists.
 * @returns {string} A safe German error message
 */
export const getSafeErrorMessage = (error, fallback = 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.') => {
    const msg = error?.message || '';

    // If the message contains German-specific characters, it's likely already translated
    const isLikelyGerman = /[äöüßÄÖÜ]/.test(msg) || msg.includes('E-Mail') || msg.includes('Passwort');
    
    // Check for exact match
    if (ERROR_MAP[msg]) return ERROR_MAP[msg];

    // Check for partial match
    for (const [key, value] of Object.entries(ERROR_MAP)) {
        if (msg.toLowerCase().includes(key.toLowerCase())) return value;
    }

    // Network errors
    if (msg.includes('fetch') || msg.includes('network') || msg.includes('Failed to fetch')) {
        return 'Netzwerkfehler — bitte prüfe deine Internetverbindung.';
    }

    // If no mapping found but it looks like it's already German, return it
    if (isLikelyGerman) return msg;

    return fallback || msg;
};
