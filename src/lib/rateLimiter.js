/**
 * Client-side Rate Limiter
 * Provides basic throttling for auth-related actions (login, signup, password reset).
 * NOTE: This is a UX-layer protection only. Real security comes from Supabase Auth's
 * built-in rate limiting and RLS policies.
 */
const attempts = new Map();

/**
 * Check if an action is allowed based on rate limiting rules.
 * @param {string} key - Unique key for the action (e.g. "reset:user@email.com")
 * @param {number} maxAttempts - Max attempts allowed in the window
 * @param {number} windowMs - Time window in milliseconds (default: 1 hour)
 * @returns {{ allowed: boolean, remaining: number, retryAfterMinutes?: number }}
 */
export const checkRateLimit = (key, maxAttempts = 3, windowMs = 3600000) => {
    const now = Date.now();
    const record = attempts.get(key) || { count: 0, firstAttempt: now };

    // Reset window if expired
    if (now - record.firstAttempt > windowMs) {
        attempts.set(key, { count: 1, firstAttempt: now });
        return { allowed: true, remaining: maxAttempts - 1 };
    }

    if (record.count >= maxAttempts) {
        const retryAfter = Math.ceil((record.firstAttempt + windowMs - now) / 60000);
        return { allowed: false, remaining: 0, retryAfterMinutes: retryAfter };
    }

    record.count++;
    attempts.set(key, record);
    return { allowed: true, remaining: maxAttempts - record.count };
};
