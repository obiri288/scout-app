// --- Helper Functions ---

export const getClubStyle = (isIcon) => isIcon ? "border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.4)] ring-2 ring-amber-400/20" : "border-white/10";
export const getClubBorderColor = (club) => club?.color_primary || "#ffffff";

// Calculate age from birth date
export const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
};

// Generate a thumbnail from a video file (client-side)
export const generateVideoThumbnail = (file) => {
    return new Promise((resolve) => {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.src = URL.createObjectURL(file);
        video.muted = true;
        video.playsInline = true;

        const timeout = setTimeout(() => resolve(null), 3000);

        video.onloadeddata = () => {
            video.currentTime = Math.min(1, video.duration / 2);
        };

        video.onseeked = () => {
            clearTimeout(timeout);
            try {
                const canvas = document.createElement("canvas");
                canvas.width = 480;
                canvas.height = 270;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                canvas.toBlob((blob) => {
                    URL.revokeObjectURL(video.src);
                    resolve(blob);
                }, "image/jpeg", 0.7);
            } catch (e) {
                console.error("Thumbnail Error:", e);
                resolve(null);
            }
        };
        video.onerror = () => { clearTimeout(timeout); resolve(null); };
    });
};

// Allowed video extensions for upload validation
export const ALLOWED_VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm', 'avi'];

export const isValidVideoFile = (file) => {
    const ext = file.name.split('.').pop().toLowerCase();
    return ALLOWED_VIDEO_EXTENSIONS.includes(ext) && file.type.startsWith('video/');
};

// --- Gamification: Pro-Readiness Score ---
export const calculateProReadinessScore = (player, highlights = []) => {
    if (!player) return { score: 0, quests: [] };

    let score = 0;
    const quests = [];

    // 1. Profil-Basis (max 40%)
    if (player.avatar_url) score += 10; else quests.push("Lade ein Profilbild hoch (+10%)");
    if (player.position_primary) score += 10; else quests.push("Trage deine primäre Position ein (+10%)");
    if (player.nationality) score += 10; else quests.push("Hinterlege deine Nationalität (+10%)");
    if (player.bio) score += 10; else quests.push("Schreibe eine kurze Bio über dich (+10%)");

    // 2. Video Highlights mit Action Tags (max 30%, 10% per Video with tags)
    let videosWithTags = 0;
    highlights.forEach(h => {
        if (h.action_tags && h.action_tags.length > 0) videosWithTags++;
    });

    const videoScore = Math.min(30, videosWithTags * 10);
    score += videoScore;

    if (videosWithTags === 0) {
        quests.push("Lade ein Video mit einem PlayStyle-Tag (z.B. 'Zweikampf') hoch (+10%)");
    } else if (videosWithTags < 3) {
        quests.push(`Lade noch ${3 - videosWithTags} Video(s) mit PlayStyle-Tags hoch (+${(3 - videosWithTags) * 10}%)`);
    }

    // 3. Verifizierung (max 30%)
    if (player.is_verified) {
        score += 30;
    } else {
        quests.push("Hol dir das Confirmed Badge (Verifizierung) (+30%)");
    }

    return {
        score: Math.min(100, score),
        quests
    };
};
