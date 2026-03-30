/**
 * Cavio Username Blocklist & Validation
 * Nuclear blocklist + format validation for username registration.
 */

export const RESTRICTED_USERNAMES = [
  // 1. Reservierte System- & Marken-Namen
  "admin", "administrator", "root", "system", "support", "help", "info", "contact",
  "cavio", "cavioapp", "probase", "moderator", "mod", "staff", "official", "verified",
  "team", "security", "bot", "noreply", "billing", "api", "test", "tester", "demo",
  // 2. Unsinnige Tasten-Kombinationen & Dummys
  "asdf", "asdfgh", "qwertz", "qwerty", "1234", "123456", "user", "guest", "null",
  "undefined", "void", "anonymous", "nobody", "unknown", "player", "spieler",
  // 3. Beleidigungen, NS-Vokabular & Anstößiges (Deutsch/Englisch)
  "hitler", "nazi", "ss", "sa", "gestapo", "heil", "adolf", "osama", "terrorist",
  "fuck", "fucker", "shit", "bitch", "cunt", "dick", "cock", "pussy", "asshole",
  "bastard", "slut", "whore", "nigger", "nigga", "faggot", "retard", "rape", "pedophile",
  "hurensohn", "fotze", "schlampe", "wichser", "wixer", "missgeburt",
  "kanake", "neger", "spast", "spasti", "schwuchtel", "arschloch", "nutte", "hure"
];

// Substring-Elemente: Wenn der Username eines dieser Wörter ENTHÄLT, blockieren
const SUBSTRING_BLOCKLIST = [
  "hitler", "nazi", "gestapo", "heil", "terrorist",
  "nigger", "nigga", "faggot", "pedophile",
  "hurensohn", "fotze", "wichser", "wixer", "missgeburt",
  "kanake", "neger", "schwuchtel"
];

/**
 * Prüft ob ein Username blockiert ist (exakte Übereinstimmung ODER Substring-Match).
 * @param {string} username - Der zu prüfende Username (wird automatisch lowercased)
 * @returns {{ blocked: boolean, reason?: string }}
 */
export function isUsernameBlocked(username) {
  const lower = username.toLowerCase().trim();

  // Exakte Übereinstimmung
  if (RESTRICTED_USERNAMES.includes(lower)) {
    return { blocked: true, reason: "Dieser Username ist nicht zulässig." };
  }

  // Substring-Check
  for (const word of SUBSTRING_BLOCKLIST) {
    if (lower.includes(word)) {
      return { blocked: true, reason: "Dieser Username ist nicht zulässig." };
    }
  }

  return { blocked: false };
}

/**
 * Validiert das Format eines Usernamens.
 * @param {string} username
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateUsernameFormat(username) {
  if (!username || username.length < 3) {
    return { valid: false, reason: "Mindestens 3 Zeichen erforderlich." };
  }
  if (username.length > 20) {
    return { valid: false, reason: "Maximal 20 Zeichen erlaubt." };
  }
  if (!/^[a-z0-9_]+$/.test(username)) {
    return { valid: false, reason: "Nur Kleinbuchstaben, Zahlen und _ erlaubt." };
  }
  return { valid: true };
}
