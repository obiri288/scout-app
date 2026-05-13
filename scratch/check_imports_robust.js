import fs from 'fs';
import path from 'path';

const srcDir = './src';

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
            importedIcons.add(icon.trim().split(/\s+as\s+/)[0]);
        });
    }

    // Find all JSX tags starting with an uppercase letter
    const tagRegex = /<([A-Z][a-zA-Z0-9]*)\b/g;
    while ((match = tagRegex.exec(content)) !== null) {
        const tagName = match[1];
        // If it looks like a lucide icon (not a local component or common React component)
        // This is a heuristic. Let's check against a known list or just common sense.
        // For now, let's just check if it's NOT in importedIcons but is likely a lucide icon.
        // Actually, let's just check Trophy and Loader2 specifically.
        if ((tagName === 'Trophy' || tagName === 'Loader2') && !importedIcons.has(tagName)) {
            console.log(`Potential issue in ${file}: <${tagName} /> used but not imported from lucide-react`);
        }
    }
    
    // Check for icon={IconName} pattern
    const propRegex = /icon={([A-Z][a-zA-Z0-9]*)}/g;
    while ((match = propRegex.exec(content)) !== null) {
        const iconName = match[1];
        if ((iconName === 'Trophy' || iconName === 'Loader2') && !importedIcons.has(iconName)) {
            console.log(`Potential issue in ${file}: icon={${iconName}} used but not imported from lucide-react`);
        }
    }
});
