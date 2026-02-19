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
