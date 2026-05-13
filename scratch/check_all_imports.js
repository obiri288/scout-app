import fs from 'fs';
import path from 'path';

const srcDir = './src';

// Common lucide icons to check for
const lucideIcons = new Set([
    'Trophy', 'Loader2', 'CheckCircle', 'BadgeCheck', 'ChevronLeft', 'ChevronRight', 
    'Clock', 'Bell', 'Award', 'Zap', 'Star', 'Crown', 'Shield', 'Sword', 'Briefcase', 
    'Target', 'Globe', 'Check', 'X', 'Trash2', 'Play', 'Menu', 'Plus', 'Archive', 
    'Eye', 'EyeOff', 'RefreshCw', 'MoreHorizontal', 'Flag', 'Ban', 'Copy', 'ShieldCheck',
    'MessageSquare', 'Video', 'Info', 'Building', 'TrendingUp', 'Users', 'AlertOctagon',
    'UserCheck', 'XCircle', 'BarChart', 'ShieldAlert', 'AlertTriangle', 'Search',
    'ArrowLeft', 'ArrowRight', 'Sparkles', 'Upload', 'AtSign', 'Crosshair', 'ClipboardList',
    'Binoculars', 'User', 'Camera', 'Heart', 'UserPlus', 'MessageCircle', 'Bookmark',
    'BookmarkCheck', 'Database', 'Instagram', 'Youtube', 'Share2', 'Mail', 'LogIn',
    'Lock', 'Key', 'FileText', 'Hand', 'ArrowUp', 'BatteryCharging', 'Wand2', 'Brain',
    'Megaphone', 'Radar', 'Download'
]);

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.jsx') || file.endsWith('.js')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk(srcDir);

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    
    // Find all lucide-react imports
    const importRegex = /import\s*{([^}]*)}\s*from\s*['"]lucide-react['"]/g;
    let match;
    const importedIcons = new Set();
    while ((match = importRegex.exec(content)) !== null) {
        match[1].split(',').forEach(icon => {
            const name = icon.trim().split(/\s+as\s+/)[0];
            if (name) importedIcons.add(name);
        });
    }

    // Find all JSX tags
    const tagRegex = /<([A-Z][a-zA-Z0-9]*)\b/g;
    while ((match = tagRegex.exec(content)) !== null) {
        const tagName = match[1];
        if (lucideIcons.has(tagName) && !importedIcons.has(tagName)) {
            console.log(`Potential issue in ${file}: <${tagName} /> used but not imported from lucide-react`);
        }
    }
    
    // Check for icon={IconName} pattern
    const propRegex = /icon={([A-Z][a-zA-Z0-9]*)}/g;
    while ((match = propRegex.exec(content)) !== null) {
        const iconName = match[1];
        if (lucideIcons.has(iconName) && !importedIcons.has(iconName)) {
            console.log(`Potential issue in ${file}: icon={${iconName}} used but not imported from lucide-react`);
        }
    }

    // Check for icon: IconName pattern (in objects)
    const objectRegex = /icon:\s*([A-Z][a-zA-Z0-9]*)\b/g;
    while ((match = objectRegex.exec(content)) !== null) {
        const iconName = match[1];
        if (lucideIcons.has(iconName) && !importedIcons.has(iconName)) {
            console.log(`Potential issue in ${file}: icon: ${iconName} used in object but not imported from lucide-react`);
        }
    }
});
