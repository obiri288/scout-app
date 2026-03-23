import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, UploadCloud, Loader2, Trash2, AlertTriangle, FileVideo, Zap, Wind, Crosshair, ArrowUpRight, Swords, ShieldCheck, Gauge, CircleDot, Flame, Hand } from 'lucide-react';
import { supabase, MAX_FILE_SIZE } from '../lib/supabase';
import { btnPrimary, inputStyle, cardStyle } from '../lib/styles';
import { generateVideoThumbnail, isValidVideoFile, ALLOWED_VIDEO_EXTENSIONS } from '../lib/helpers';
import { getSafeErrorMessage } from '../lib/errorMessages';
import { useToast } from '../contexts/ToastContext';

// Available skill tags for videos
const SKILL_TAGS = ['Schnelligkeit', 'Beidfüßig', 'Kopfball', 'Technik', 'Spielverständnis', 'Dribbling', 'Schusskraft', 'Flanken', 'Defensivstärke', 'Spielaufbau'];

// PlayStyle action tags with icons
const ACTION_TAGS = [
    { label: 'Traumpass', icon: Zap },
    { label: 'Dribbling', icon: Wind },
    { label: 'Abschluss', icon: Crosshair },
    { label: 'Flanke', icon: ArrowUpRight },
    { label: 'Zweikampf', icon: Swords },
    { label: 'Balleroberung', icon: ShieldCheck },
    { label: 'Speed', icon: Gauge },
    { label: 'Ballkontrolle', icon: CircleDot },
    { label: 'Einsatz', icon: Flame },
    { label: 'Parade', icon: Hand },
];

export const UploadModal = ({ player, onClose, onUploadComplete }) => {
    const [uploading, setUploading] = useState(false);
    const [category, setCategory] = useState("Training");
    const [description, setDescription] = useState("");
    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [progress, setProgress] = useState(0);
    const [errorMsg, setErrorMsg] = useState("");
    const [isDragOver, setIsDragOver] = useState(false);
    const [selectedTags, setSelectedTags] = useState([]);
    const [selectedActionTags, setSelectedActionTags] = useState([]);
    const { addToast } = useToast();

    const handleDragOver = (e) => { e.preventDefault(); setIsDragOver(true); };
    const handleDragLeave = () => setIsDragOver(false);
    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) processFile(droppedFile);
    };

    const processFile = (selectedFile) => {
        if (selectedFile.size > MAX_FILE_SIZE) {
            setErrorMsg("Datei zu groß! Max 50 MB.");
            return;
        }
        if (!isValidVideoFile(selectedFile)) {
            setErrorMsg(`Nur Videodateien erlaubt (${ALLOWED_VIDEO_EXTENSIONS.join(', ').toUpperCase()}).`);
            return;
        }
        setErrorMsg("");
        setFile(selectedFile);
        setPreviewUrl(URL.createObjectURL(selectedFile));
    };

    const handleFileSelect = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) processFile(selectedFile);
    };

    const toggleTag = (tag) => {
        setSelectedTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    const toggleActionTag = (tag) => {
        setSelectedActionTags(prev => {
            if (prev.includes(tag)) return prev.filter(t => t !== tag);
            if (prev.length >= 2) { addToast('Maximal 2 Action-Tags erlaubt.', 'info'); return prev; }
            return [...prev, tag];
        });
    };

    const handleUpload = async () => {
        if (!player?.user_id || !file) {
            setErrorMsg("Bitte Profil erst vervollständigen.");
            return;
        }


        setUploading(true);
        setProgress(10);

        const progressInterval = setInterval(() => {
            setProgress(p => Math.min(p + Math.random() * 5, 90));
        }, 500);

        const maxRetries = 1;
        let attempts = 0;

        const attemptUpload = async () => {
            try {
                const fileExt = file.name.split('.').pop();
                const fileName = `${player.user_id}/${Date.now()}.${fileExt}`;
                const thumbName = `${player.user_id}/${Date.now()}_thumb.jpg`;

                // 1. Thumbnail generation & upload
                let thumbUrl = null;
                try {
                    const thumbBlob = await generateVideoThumbnail(file);
                    if (thumbBlob) {
                        await supabase.storage.from('player-videos').upload(thumbName, thumbBlob);
                        const { data } = supabase.storage.from('player-videos').getPublicUrl(thumbName);
                        thumbUrl = data.publicUrl;
                    }
                } catch (e) {
                    console.warn("Thumbnail failed", e);
                    thumbUrl = "https://placehold.co/600x400/18181b/ffffff/png?text=Video";
                }

                // 2. Video Upload
                const { error: upErr } = await supabase.storage.from('player-videos').upload(fileName, file);
                if (upErr) throw upErr;

                const { data: { publicUrl } } = supabase.storage.from('player-videos').getPublicUrl(fileName);

                // 3. Database entry
                const { error: dbErr } = await supabase.from('media_highlights').insert({
                    player_id: player.id,
                    video_url: publicUrl,
                    thumbnail_url: thumbUrl,
                    category_tag: category,
                    description: description || null,
                    skill_tags: selectedTags.length > 0 ? selectedTags : null,
                    action_tags: selectedActionTags.length > 0 ? selectedActionTags : [],
                    created_at: new Date().toISOString()
                });

                if (dbErr) throw dbErr;

                clearInterval(progressInterval);
                setProgress(100);
                addToast("Video erfolgreich hochgeladen! 🎉", 'success');
                setTimeout(() => {
                    onUploadComplete();
                    onClose();
                }, 800);

            } catch (error) {
                attempts++;
                if (attempts <= maxRetries && (error.message?.includes('network') || error.message?.includes('fetch'))) {
                    addToast("Verbindungsproblem, neuer Versuch...", 'info');
                    await new Promise(r => setTimeout(r, 2000));
                    return attemptUpload();
                }
                console.error(error);
                const safeMsg = getSafeErrorMessage(error, 'Upload fehlgeschlagen.');
                setErrorMsg(safeMsg);
                addToast(safeMsg, 'error');
                setUploading(false);
                clearInterval(progressInterval);
            }
        };

        await attemptUpload();
    };

    useEffect(() => {
        return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }
    }, [previewUrl]);

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className={`w-full sm:max-w-md ${cardStyle} p-6 border-t border-border shadow-2xl relative mb-20 sm:mb-0`}>
                <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold text-foreground flex items-center gap-2"><UploadCloud className="text-blue-500" /> Clip hochladen</h3><button onClick={onClose}><X className="text-muted-foreground hover:text-foreground" /></button></div>

                {uploading ? (
                    <div className="text-center py-8 space-y-4">
                        <div className="w-full bg-slate-200 dark:bg-zinc-800 rounded-full h-2.5 overflow-hidden">
                            <motion.div
                                className="bg-blue-600 h-2.5 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.3 }}
                            />
                        </div>
                        <div className="flex items-center justify-center gap-2 text-muted-foreground font-medium text-sm">
                            <Loader2 className="animate-spin" size={16} />
                            <span>Wird verarbeitet... {Math.round(progress)}%</span>
                        </div>
                        <p className="text-xs text-muted-foreground/60">Bitte Fenster nicht schließen.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {!file ? (
                            <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-2xl cursor-pointer transition-all group relative ${isDragOver ? 'border-blue-500 bg-blue-500/10' : 'border-slate-300 dark:border-zinc-700 hover:bg-slate-100/50 dark:hover:bg-zinc-800/50 hover:border-blue-500/50'}`}
                            >
                                <div className={`p-4 rounded-full mb-3 transition-transform shadow-lg ${isDragOver ? 'bg-blue-500 text-white scale-110' : 'bg-slate-100 dark:bg-zinc-800 text-blue-400 group-hover:scale-110'}`}>
                                    <FileVideo className="w-8 h-8" />
                                </div>
                                <p className="text-sm text-foreground/80 font-medium">Video auswählen oder hierher ziehen</p>
                                <p className="text-xs text-muted-foreground mt-1">Max. 50 MB • {ALLOWED_VIDEO_EXTENSIONS.join(', ').toUpperCase()}</p>
                                <input type="file" accept="video/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileSelect} />
                            </div>
                        ) : (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                                <div className="relative rounded-xl overflow-hidden aspect-video bg-black shadow-lg border border-border">
                                    <video src={previewUrl} className="w-full h-full object-cover opacity-80" controls />
                                    <button onClick={() => { setFile(null); setPreviewUrl(null); setErrorMsg(""); setSelectedTags([]); setSelectedActionTags([]); }} className="absolute top-2 right-2 bg-black/60 backdrop-blur-md p-1.5 rounded-full text-white hover:bg-red-500/80 transition">
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                {errorMsg && (
                                    <div className="bg-red-500/10 text-red-400 text-xs p-3 rounded-xl border border-red-500/20 flex items-center gap-2">
                                        <AlertTriangle size={14} /> {errorMsg}
                                    </div>
                                )}

                                <div className="bg-slate-50 dark:bg-zinc-900/50 p-3 rounded-xl border border-border space-y-3">
                                    <div>
                                        <label className="text-xs text-muted-foreground font-bold uppercase ml-1">Kategorie</label>
                                        <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-slate-100 dark:bg-zinc-800 text-foreground p-2.5 mt-1 rounded-lg text-sm outline-none border border-transparent focus:border-blue-500 transition">
                                            <option>Training</option>
                                            <option>Match Highlight</option>
                                            <option>Tor</option>
                                            <option>Skill</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted-foreground font-bold uppercase ml-1">Beschreibung</label>
                                        <input
                                            type="text"
                                            placeholder="Was passiert im Video?"
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            className="w-full bg-slate-100 dark:bg-zinc-800 text-foreground p-2.5 mt-1 rounded-lg text-sm outline-none border border-transparent focus:border-blue-500 transition placeholder:text-muted-foreground"
                                        />
                                    </div>
                                    {/* Skill Tags */}
                                    <div>
                                        <label className="text-xs text-muted-foreground font-bold uppercase ml-1">Skill-Tags</label>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {SKILL_TAGS.map(tag => (
                                                <button
                                                    key={tag}
                                                    type="button"
                                                    onClick={() => toggleTag(tag)}
                                                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${selectedTags.includes(tag)
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-slate-100 dark:bg-zinc-800 text-muted-foreground hover:bg-slate-200 dark:hover:bg-zinc-700 hover:text-foreground'
                                                        }`}
                                                >
                                                    {tag}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    {/* Action Tags (PlayStyles, max 2) */}
                                    <div>
                                        <label className="text-xs text-amber-400 font-bold uppercase ml-1 flex items-center gap-1.5">
                                            PlayStyle
                                            <span className="text-[10px] text-zinc-500 font-medium normal-case">(max. 2 wählen)</span>
                                        </label>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {ACTION_TAGS.map(({ label, icon: Icon }) => (
                                                <button
                                                    key={label}
                                                    type="button"
                                                    onClick={() => toggleActionTag(label)}
                                                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 border backdrop-blur-xl flex items-center gap-1.5 ${selectedActionTags.includes(label)
                                                        ? 'bg-cyan-400/15 text-cyan-400 border-cyan-400/30 shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                                                        : 'bg-white/10 text-zinc-400 border-white/20 hover:bg-white/15 hover:text-white'
                                                        }`}
                                                >
                                                    <Icon size={12} />
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <button onClick={handleUpload} className={`${btnPrimary} w-full flex items-center justify-center gap-2`}>
                                    <UploadCloud size={20} /> Jetzt hochladen
                                </button>
                            </div>
                        )}

                        {errorMsg && !file && (
                            <div className="bg-red-500/10 text-red-400 text-xs p-3 rounded-xl border border-red-500/20 flex items-center gap-2 animate-in fade-in">
                                <AlertTriangle size={14} /> {errorMsg}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
