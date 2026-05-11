/**
 * Saved Accounts — localStorage-based quick-login system.
 *
 * Stores up to MAX_ACCOUNTS recently-logged-in accounts so the user
 * doesn't have to re-enter credentials after logging out.
 *
 * Passwords are Base64-encoded (NOT encrypted). This provides minimal
 * protection against casual shoulder-surfing but is NOT secure storage.
 */

const STORAGE_KEY = 'saved_accounts';
const MAX_ACCOUNTS = 3;

/* ── Helpers ───────────────────────────────── */

const encode = (str) => {
    try { return btoa(unescape(encodeURIComponent(str))); }
    catch { return btoa(str); }
};

const decode = (str) => {
    try { return decodeURIComponent(escape(atob(str))); }
    catch { try { return atob(str); } catch { return ''; } }
};

/* ── CRUD ──────────────────────────────────── */

/**
 * Returns all saved accounts (newest first).
 * @returns {Array<{ identifier: string, displayName?: string, avatarUrl?: string, hasPassword: boolean, password?: string, savedAt: string }>}
 */
export const getSavedAccounts = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

/**
 * Save or update an account in the list.
 * If the identifier already exists, its entry is updated and moved to the front.
 * The list is capped at MAX_ACCOUNTS (oldest entries are dropped).
 *
 * @param {{ identifier: string, displayName?: string, avatarUrl?: string, savePassword?: boolean, password?: string }} opts
 */
export const saveAccount = ({ identifier, displayName, avatarUrl, savePassword = false, password }) => {
    if (!identifier) return;

    const accounts = getSavedAccounts().filter(
        (a) => a.identifier.toLowerCase() !== identifier.toLowerCase()
    );

    const entry = {
        identifier,
        displayName: displayName || '',
        avatarUrl: avatarUrl || '',
        hasPassword: !!(savePassword && password),
        ...(savePassword && password ? { password: encode(password) } : {}),
        savedAt: new Date().toISOString(),
    };

    accounts.unshift(entry);

    // Keep max entries
    const trimmed = accounts.slice(0, MAX_ACCOUNTS);

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch (e) {
        console.warn('Failed to save account to localStorage:', e);
    }
};

/**
 * Remove a single account from the saved list.
 * @param {string} identifier
 */
export const removeAccount = (identifier) => {
    if (!identifier) return;
    const accounts = getSavedAccounts().filter(
        (a) => a.identifier.toLowerCase() !== identifier.toLowerCase()
    );
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
    } catch { /* noop */ }
};

/**
 * Clear all saved accounts.
 */
export const clearAllAccounts = () => {
    try { localStorage.removeItem(STORAGE_KEY); }
    catch { /* noop */ }
};

/**
 * Decode a stored password.
 * @param {string} encoded
 * @returns {string}
 */
export const decodePassword = (encoded) => decode(encoded);
