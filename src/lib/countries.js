export const COUNTRIES = [
    { code: 'DE', name: 'Deutschland', flag: '🇩🇪' },
    { code: 'AT', name: 'Österreich', flag: '🇦🇹' },
    { code: 'CH', name: 'Schweiz', flag: '🇨🇭' },
    { code: 'TR', name: 'Türkei', flag: '🇹🇷' },
    { code: 'PL', name: 'Polen', flag: '🇵🇱' },
    { code: 'IT', name: 'Italien', flag: '🇮🇹' },
    { code: 'FR', name: 'Frankreich', flag: '🇫🇷' },
    { code: 'ES', name: 'Spanien', flag: '🇪🇸' },
    { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
    { code: 'GB', name: 'Großbritannien', flag: '🇬🇧' },
    { code: 'NL', name: 'Niederlande', flag: '🇳🇱' },
    { code: 'BE', name: 'Belgien', flag: '🇧🇪' },
    { code: 'HR', name: 'Kroatien', flag: '🇭🇷' },
    { code: 'RS', name: 'Serbien', flag: '🇷🇸' },
    { code: 'BA', name: 'Bosnien und Herzegowina', flag: '🇧🇦' },
    { code: 'XK', name: 'Kosovo', flag: '🇽🇰' },
    { code: 'AL', name: 'Albanien', flag: '🇦🇱' },
    { code: 'MK', name: 'Nordmazedonien', flag: '🇲🇰' },
    { code: 'GR', name: 'Griechenland', flag: '🇬🇷' },
    { code: 'RO', name: 'Rumänien', flag: '🇷🇴' },
    { code: 'BG', name: 'Bulgarien', flag: '🇧🇬' },
    { code: 'HU', name: 'Ungarn', flag: '🇭🇺' },
    { code: 'CZ', name: 'Tschechien', flag: '🇨🇿' },
    { code: 'SK', name: 'Slowakei', flag: '🇸🇰' },
    { code: 'SI', name: 'Slowenien', flag: '🇸🇮' },
    { code: 'DK', name: 'Dänemark', flag: '🇩🇰' },
    { code: 'SE', name: 'Schweden', flag: '🇸🇪' },
    { code: 'NO', name: 'Norwegen', flag: '🇳🇴' },
    { code: 'FI', name: 'Finnland', flag: '🇫🇮' },
    { code: 'IE', name: 'Irland', flag: '🇮🇪' },
    { code: 'RU', name: 'Russland', flag: '🇷🇺' },
    { code: 'UA', name: 'Ukraine', flag: '🇺🇦' },
    { code: 'US', name: 'USA', flag: '🇺🇸' },
    { code: 'CA', name: 'Kanada', flag: '🇨🇦' },
    { code: 'BR', name: 'Brasilien', flag: '🇧🇷' },
    { code: 'AR', name: 'Argentinien', flag: '🇦🇷' },
    { code: 'CO', name: 'Kolumbien', flag: '🇨🇴' },
    { code: 'UY', name: 'Uruguay', flag: '🇺🇾' },
    { code: 'MX', name: 'Mexiko', flag: '🇲🇽' },
    { code: 'MA', name: 'Marokko', flag: '🇲🇦' },
    { code: 'DZ', name: 'Algerien', flag: '🇩🇿' },
    { code: 'TN', name: 'Tunesien', flag: '🇹🇳' },
    { code: 'EG', name: 'Ägypten', flag: '🇪🇬' },
    { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
    { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
    { code: 'CI', name: 'Elfenbeinküste', flag: '🇨🇮' },
    { code: 'SN', name: 'Senegal', flag: '🇸🇳' },
    { code: 'CM', name: 'Kamerun', flag: '🇨🇲' },
    { code: 'JP', name: 'Japan', flag: '🇯🇵' },
    { code: 'KR', name: 'Südkorea', flag: '🇰🇷' },
    { code: 'CN', name: 'China', flag: '🇨🇳' },
    { code: 'AU', name: 'Australien', flag: '🇦🇺' },
    { code: 'NZ', name: 'Neuseeland', flag: '🇳🇿' },
    { code: 'IR', name: 'Iran', flag: '🇮🇷' },
    { code: 'SA', name: 'Saudi-Arabien', flag: '🇸🇦' },
].sort((a, b) => a.name.localeCompare(b.name, 'de'));

/**
 * Returns the fully formatted string (e.g. "🇩🇪 Deutschland")
 * Fallbacks to the input string if ISO code is not found (for backwards compatibility with old profiles)
 */
export const getFormattedCountry = (codeOrName) => {
    if (!codeOrName) return '';
    const isoString = String(codeOrName).trim().toUpperCase();
    const countryMatch = COUNTRIES.find(c => c.code === isoString);
    
    if (countryMatch) {
        return `${countryMatch.flag} ${countryMatch.name}`;
    }
    
    return codeOrName; // Fallback (e.g., if DB still has "Deutschland" instead of "DE")
};

/**
 * Helper to fetch just the emoji flag of a generic string or ISO code
 */
export const getCountryFlag = (codeOrName) => {
    if (!codeOrName) return '';
    const isoString = String(codeOrName).trim().toUpperCase();
    const countryMatch = COUNTRIES.find(c => c.code === isoString);
    if (countryMatch) return countryMatch.flag;

    // Try finding by name backward mapping
    const matchByName = COUNTRIES.find(c => c.name.toLowerCase() === String(codeOrName).trim().toLowerCase());
    return matchByName ? matchByName.flag : '🌍';
};

/**
 * Helper to fetch just the localized name, without the flag emoji
 */
export const getCountryNameOnly = (codeOrName) => {
    if (!codeOrName) return '';
    const isoString = String(codeOrName).trim().toUpperCase();
    const countryMatch = COUNTRIES.find(c => c.code === isoString);
    if (countryMatch) return countryMatch.name;

    return codeOrName; // Fallback
};
