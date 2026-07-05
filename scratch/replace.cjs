const fs = require('fs');
const path = require('path');

const filesToUpdate = [
    '.env',
    'supabase/functions/send-welcome-email/index.ts',
    'supabase/functions/send-waitlist-email/index.ts',
    'src/App.jsx',
    'src/pages/WaitlistLanding.jsx',
    'src/components/Datenschutz.jsx',
    'src/components/EditProfileModal.jsx',
    'src/components/FollowingListModal.jsx',
    'src/components/FollowerListModal.jsx',
    'src/components/Impressum.jsx',
    'src/components/InboxScreen.jsx',
    'src/components/MapScreen.jsx',
    'src/components/ProfileScreen.jsx',
    'src/components/SearchScreen.jsx',
    'src/components/SettingsScreen.jsx',
    'src/components/SimilarPlayers.jsx',
    'src/components/WatchlistModal.jsx',
    'src/lib/helpers.js'
];

let changedFiles = [];

filesToUpdate.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('cavio.me')) {
            const newContent = content.replace(/cavio\.me/g, 'cavios.de');
            fs.writeFileSync(filePath, newContent, 'utf8');
            changedFiles.push(file);
        }
    }
});

console.log(JSON.stringify(changedFiles, null, 2));
