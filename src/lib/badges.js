/**
 * Signature Badges — Central Configuration
 * Players can equip up to 3 badges on their profile (like EA FC PlayStyles).
 */
import { Zap, BatteryCharging, Shield, Target, Wand2, Crosshair, Brain, Megaphone, EyeOff, Hand, Radar, ArrowUp } from "lucide-react";

export const BADGE_CATEGORIES = [
    { id: 'physis', label: 'Physis', emoji: '💪' },
    { id: 'technik', label: 'Technik', emoji: '🎯' },
    { id: 'taktik', label: 'Taktik', emoji: '🧠' },
    { id: 'goalkeeper', label: 'Torwart', emoji: '🧤' },
];

/**
 * Pre-computed color class sets for each Tailwind color used.
 * Static strings so Tailwind JIT can detect them during build.
 */
const COLOR = {
    'amber-400':   { text: 'text-amber-400',   border: 'border-amber-400/50',   bg: 'bg-amber-400/10',   glow: 'shadow-amber-400/20' },
    'green-400':   { text: 'text-green-400',   border: 'border-green-400/50',   bg: 'bg-green-400/10',   glow: 'shadow-green-400/20' },
    'red-500':     { text: 'text-red-500',     border: 'border-red-500/50',     bg: 'bg-red-500/10',     glow: 'shadow-red-500/20' },
    'cyan-400':    { text: 'text-cyan-400',    border: 'border-cyan-400/50',    bg: 'bg-cyan-400/10',    glow: 'shadow-cyan-400/20' },
    'purple-400':  { text: 'text-purple-400',  border: 'border-purple-400/50',  bg: 'bg-purple-400/10',  glow: 'shadow-purple-400/20' },
    'orange-500':  { text: 'text-orange-500',  border: 'border-orange-500/50',  bg: 'bg-orange-500/10',  glow: 'shadow-orange-500/20' },
    'blue-400':    { text: 'text-blue-400',    border: 'border-blue-400/50',    bg: 'bg-blue-400/10',    glow: 'shadow-blue-400/20' },
    'yellow-500':  { text: 'text-yellow-500',  border: 'border-yellow-500/50',  bg: 'bg-yellow-500/10',  glow: 'shadow-yellow-500/20' },
    'slate-400':   { text: 'text-slate-400',   border: 'border-slate-400/50',   bg: 'bg-slate-400/10',   glow: 'shadow-slate-400/20' },
    'cyan-300':    { text: 'text-cyan-300',    border: 'border-cyan-300/50',    bg: 'bg-cyan-300/10',    glow: 'shadow-cyan-300/20' },
    'slate-300':   { text: 'text-slate-300',   border: 'border-slate-300/50',   bg: 'bg-slate-300/10',   glow: 'shadow-slate-300/20' },
    'emerald-400': { text: 'text-emerald-400', border: 'border-emerald-400/50', bg: 'bg-emerald-400/10', glow: 'shadow-emerald-400/20' },
    'sky-400':     { text: 'text-sky-400',     border: 'border-sky-400/50',     bg: 'bg-sky-400/10',     glow: 'shadow-sky-400/20' },
};

const FALLBACK_COLOR = COLOR['cyan-400'];

export const SIGNATURE_BADGES = [
    // --- PHYSISCH ---
    { id: 'speed_demon',    name: 'Speed Demon',     description: 'Extremer Antritt & Endgeschwindigkeit.',                        category: 'physis',     icon: Zap,             colorKey: 'amber-400' },
    { id: 'maschine',       name: 'Maschine',         description: 'Unermüdliche Ausdauer (Box-to-Box).',                           category: 'physis',     icon: BatteryCharging, colorKey: 'green-400' },
    { id: 'gladiator',      name: 'Gladiator',        description: 'Physisch dominant, extrem zweikampfstark.',                     category: 'physis',     icon: Shield,          colorKey: 'red-500' },

    // --- TECHNIK ---
    { id: 'maestro',        name: 'Maestro',          description: 'Tödliche Schnittstellenpässe & Spielübersicht.',                category: 'technik',    icon: Target,          colorKey: 'cyan-400' },
    { id: 'strassenkicker', name: 'Straßenkicker',    description: 'Dribbling auf engstem Raum, 1v1 Spezialist.',                   category: 'technik',    icon: Wand2,           colorKey: 'purple-400' },
    { id: 'scharfschuetze', name: 'Scharfschütze',    description: 'Torgefahr aus der Distanz & Standard-Spezialist.',              category: 'technik',    icon: Crosshair,       colorKey: 'orange-500' },

    // --- TAKTIK / MENTAL ---
    { id: 'taktik_fuchs',   name: 'Taktik-Fuchs',    description: 'Perfektes Stellungsspiel & Antizipation.',                      category: 'taktik',     icon: Brain,           colorKey: 'blue-400' },
    { id: 'general',        name: 'General',          description: 'Lautstarker Leader, dirigiert die Mannschaft.',                  category: 'taktik',     icon: Megaphone,       colorKey: 'yellow-500' },
    { id: 'schattenspieler', name: 'Schattenspieler', description: 'Raumdeuter, immer im toten Winkel des Gegners.',                category: 'taktik',     icon: EyeOff,          colorKey: 'slate-400' },

    // --- TORHÜTER ---
    { id: 'die_katze',      name: 'Die Katze',        description: 'Übermenschliche Reflexe auf der Linie.',                        category: 'goalkeeper',  icon: Hand,            colorKey: 'cyan-300' },
    { id: 'die_wand',       name: 'Die Wand',         description: 'Unüberwindbar im 1-gegen-1, macht sich gigantisch groß.',       category: 'goalkeeper',  icon: Shield,          colorKey: 'slate-300' },
    { id: 'sweeper',        name: 'Sweeper',          description: 'Antizipiert Steilpässe, stark am Fuß (11. Feldspieler).',       category: 'goalkeeper',  icon: Radar,           colorKey: 'emerald-400' },
    { id: 'lufthoheit',     name: 'Lufthoheit',       description: 'Dominiert den Fünfmeterraum bei Flanken und Ecken.',            category: 'goalkeeper',  icon: ArrowUp,         colorKey: 'sky-400' },
    { id: 'elfmeter_killer', name: 'Elfmeter-Killer', description: 'Eisern in Drucksituationen und liest den Schützen.',            category: 'goalkeeper',  icon: Crosshair,       colorKey: 'red-500' },
];

export const MAX_BADGES = 3;

/** Get a badge config by id */
export const getBadgeById = (id) => SIGNATURE_BADGES.find(b => b.id === id);

/** Get color classes for a badge (static, Tailwind-safe) */
export const getBadgeColors = (badge) => COLOR[badge.colorKey] || FALLBACK_COLOR;
