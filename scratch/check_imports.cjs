const fs = require('fs');
const path = require('path');

const srcDir = path.join(process.cwd(), 'src');

function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);

    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function(file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            if (file.endsWith('.jsx')) {
                arrayOfFiles.push(path.join(dirPath, "/", file));
            }
        }
    });

    return arrayOfFiles;
}

const files = getAllFiles(srcDir);

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    
    // Find all potential lucide-react components used in JSX: <ComponentName
    const usedIcons = new Set();
    const matches = content.matchAll(/<([A-Z][a-zA-Z0-9]*)/g);
    for (const match of matches) {
        usedIcons.add(match[1]);
    }

    // List of known Lucide icons (we'll check against common ones or just see if they are imported)
    // Actually, let's see which ones are imported from 'lucide-react'
    const importMatch = content.match(/import\s*{([^}]+)}\s*from\s*['"]lucide-react['"]/);
    if (importMatch) {
        const importedIcons = importMatch[1].split(',').map(s => s.trim().split(/\s+/)[0]);
        
        // Check if used icons that look like Lucide icons (usually CamelCase) are in the imported list
        // This is a bit fuzzy because it could be local components too.
        // But we can check for common ones like Loader2, Trophy, etc.
        const commonIcons = ['Loader2', 'Trophy', 'CheckCircle', 'CheckCircle2', 'BadgeCheck', 'ChevronLeft', 'ChevronRight', 'Clock', 'Bell', 'Award', 'Shield', 'ShieldCheck', 'ShieldAlert', 'Zap', 'Star', 'User', 'X', 'Check'];
        
        commonIcons.forEach(icon => {
            if (content.includes(`<${icon}`) && !importedIcons.includes(icon)) {
                console.log(`FILE: ${file}`);
                console.log(`  MISSING: ${icon}`);
            }
        });
    } else if (content.includes('<Loader2') || content.includes('<Trophy')) {
        console.log(`FILE: ${file}`);
        console.log(`  NO LUCIDE IMPORT BUT USED Loader2/Trophy`);
    }
});
