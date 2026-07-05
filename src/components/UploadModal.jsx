import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, 
    UploadCloud, 
    Loader2, 
    Trash2, 
    AlertTriangle, 
    FileVideo, 
    Zap, 
    Wind, 
    Crosshair, 
    ArrowUpRight, 
    Swords, 
    ShieldCheck, 
    Gauge, 
    CircleDot, 
    Flame, 
    Hand,
    ChevronRight,
    ArrowLeft,
    CheckCircle2,
    Info,
    UserPlus,
    Search
} from 'lucide-react';
import { supabase, MAX_FILE_SIZE } from '../lib/supabase';
import { searchPlayers, insertPostTags, createNotifications } from '../lib/api';
import { btnPrimary, inputStyle, cardStyle } from '../lib/styles';
import { generateVideoThumbnail, isValidVideoFile, ALLOWED_VIDEO_EXTENSIONS } from '../lib/helpers';
import { useToast } from '../contexts/ToastContext';
import { VideoEditor } from './VideoEditor';

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

export const UploadModal = ({ profile, onClose, onUploadComplete }) => {
    const [step, setStep] = useState(1);
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
    const [editorData, setEditorData] = useState(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [taggedUsers, setTaggedUsers] = useState([]); // Array of { user, role }
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showRoleModalFor, setShowRoleModalFor] = useState(null);
    const { addToast } = useToast();

    // Available Assist Roles
    const ASSIST_ROLES = [
        { id: 'assist', label: '👟 Assist' },
        { id: 'pre_assist', label: '👁️ Pre-Assist' },
        { id: 'ball_recovery', label: '🧱 Balleroberer' },
        { id: 'save', label: '🧤 Glanzparade' },
        { id: 'deal_maker', label: '🤝 Deal-Maker' },
        { id: 'mastermind', label: '🧠 Mastermind' }
    ];

    // Search effect
    useEffect(() => {
        if (searchQuery.trim().length < 2) {
            setSearchResults([]);
            return;
        }
        const delayDebounceFn = setTimeout(async () => {
            setIsSearching(true);
            try {
                const results = await searchPlayers({ query: searchQuery, limit: 5 });
                setSearchResults(results.filter(r => r.id !== profile.id)); // Don't allow tagging self
            } catch (err) {
                console.error("Player search failed", err);
            } finally {
                setIsSearching(false);
            }
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery, profile.id]);

    const handleSelectTagUser = (user) => {
        if (taggedUsers.find(t => t.user.id === user.id)) {
            addToast('Spieler ist bereits markiert', 'info');
            return;
        }
        setShowRoleModalFor(user);
        setSearchQuery('');
        setSearchResults([]);
    };

    const confirmUserRole = (role) => {
        if (showRoleModalFor) {
            setTaggedUsers(prev => [...prev, { user: showRoleModalFor, role: role.id, roleLabel: role.label }]);
            setShowRoleModalFor(null);
        }
    };

    const removeTaggedUser = (userId) => {
        setTaggedUsers(prev => prev.filter(t => t.user.id !== userId));
    };


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
            addToast(`Video zu groß (Max. ${MAX_FILE_SIZE / (1024 * 1024)}MB)`, 'error');
            return;
        }
        if (!isValidVideoFile(selectedFile)) {
            addToast(`Nur Videodateien erlaubt (${ALLOWED_VIDEO_EXTENSIONS.join(', ').toUpperCase()}).`, 'error');
            return;
        }
        setErrorMsg("");
        setFile(selectedFile);
        setPreviewUrl(URL.createObjectURL(selectedFile));
        setIsEditorOpen(true);
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
        if (!profile?.user_id || !file) {
            setErrorMsg("Bitte Profil erst vervollständigen.");
            return;
        }

        setUploading(true);
        setProgress(10);

        const progressInterval = setInterval(() => {
            setProgress(p => Math.min(p + Math.random() * 5, 90));
        }, 500);

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${profile.user_id}/${Date.now()}.${fileExt}`;
            const thumbName = `${profile.user_id}/${Date.now()}_thumb.jpg`;

            // 1. Thumbnail generation & upload
            let thumbUrl = null;
            try {
                const thumbBlob = await generateVideoThumbnail(file, editorData?.thumbnailTime);
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
            const { data: insertedVideo, error: dbErr } = await supabase.from('media_highlights').insert({
                player_id: profile.id,
                video_url: publicUrl,
                thumbnail_url: thumbUrl,
                category_tag: category,
                description: description || null,
                skill_tags: selectedTags.length > 0 ? selectedTags : null,
                action_tags: selectedActionTags.length > 0 ? selectedActionTags : [],
                start_time: editorData?.startTime || 0,
                end_time: editorData?.endTime || null,
                thumbnail_time: editorData?.thumbnailTime || 0,
                is_muted: editorData?.isMuted || false,
                spotlight_at: editorData?.spotlight?.t || null,
                spotlight_x: editorData?.spotlight?.x || null,
                spotlight_y: editorData?.spotlight?.y || null,
                spotlight_duration: editorData?.spotlight?.duration || 2.0,
                created_at: new Date().toISOString()
            }).select().single();

            if (dbErr) throw dbErr;

            // 4. Insert post_tags if any
            if (taggedUsers.length > 0 && insertedVideo) {
                const tagsToInsert = taggedUsers.map(t => ({
                    video_id: insertedVideo.id,
                    tagged_user_id: t.user.id,
                    role: t.role
                }));
                await insertPostTags(tagsToInsert);

                // 5. Send notifications
                const notificationsToInsert = taggedUsers.map(t => ({
                    userId: t.user.id,
                    actorId: profile.id,
                    type: 'assist_tag',
                    message: `hat dich als ${t.roleLabel} markiert.`,
                    videoId: insertedVideo.id
                }));
                if (notificationsToInsert.length > 0) {
                    try {
                        await createNotifications(notificationsToInsert);
                    } catch (e) {
                        console.warn("Failed to send tag notifications in batch", e);
                    }
                }
            }

            clearInterval(progressInterval);
            setProgress(100);
            addToast("Video erfolgreich hochgeladen! 🎉", 'success');
            setTimeout(() => {
                onUploadComplete();
                onClose();
            }, 800);

        } catch (error) {
            console.error("Upload error details:", error);
            const errorMessage = error?.message || 'Upload fehlgeschlagen';
            setErrorMsg(errorMessage);
            addToast(errorMessage, 'error');
            setUploading(false);
            clearInterval(progressInterval);
        }
    };

    useEffect(() => {
        return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }
    }, [previewUrl]);

    const maxMB = MAX_FILE_SIZE / (1024 * 1024);

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className={`w-full sm:max-w-xl ${cardStyle} p-0 border-t border-border shadow-2xl relative mb-20 sm:mb-0 overflow-visible`}>
                
                {/* Modal Header */}
                <div className="flex justify-between items-center p-6 border-b border-white/5 bg-zinc-900/50 rounded-t-2xl sm:rounded-3xl">
                    <div>
                        <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                            {uploading ? (
                                <Loader2 className="text-blue-500 animate-spin" />
                            ) : (
                                <UploadCloud className="text-blue-500" />
                            )}
                            {uploading ? 'Wird hochgeladen...' : step === 1 ? 'Clip wählen & bearbeiten' : 'Details & Veröffentlichung'}
                        </h3>
                        {!uploading && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Schritt {step} von 2
                            </p>
                        )}
                    </div>
                    {!uploading && (
                        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition">
                            <X className="text-muted-foreground hover:text-foreground" />
                        </button>
                    )}
                </div>

                <div className="p-6">
                    {uploading ? (
                        <div className="text-center py-12 space-y-6">
                            <div className="relative w-32 h-32 mx-auto">
                                <svg className="w-full h-full rotate-[-90deg]">
                                    <circle
                                        cx="64" cy="64" r="60"
                                        className="stroke-zinc-800 fill-none"
                                        strokeWidth="8"
                                    />
                                    <motion.circle
                                        cx="64" cy="64" r="60"
                                        className="stroke-blue-600 fill-none"
                                        strokeWidth="8"
                                        strokeDasharray="377"
                                        initial={{ strokeDashoffset: 377 }}
                                        animate={{ strokeDashoffset: 377 - (377 * progress / 100) }}
                                        transition={{ duration: 0.5 }}
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center text-xl font-black text-white">
                                    {Math.round(progress)}%
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-lg font-bold text-white">Dein Highlight ist auf dem Weg...</h4>
                                <p className="text-sm text-muted-foreground">Bitte lass dieses Fenster geöffnet, bis der Upload abgeschlossen ist.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {step === 1 ? (
                                <div className="space-y-6">
                                    {!file ? (
                                        <div
                                            onDragOver={handleDragOver}
                                            onDragLeave={handleDragLeave}
                                            onDrop={handleDrop}
                                            className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-3xl cursor-pointer transition-all group relative ${isDragOver ? 'border-blue-500 bg-blue-500/10' : 'border-slate-300 dark:border-zinc-700 hover:bg-slate-100/50 dark:hover:bg-zinc-800/50 hover:border-blue-500/50'}`}
                                        >
                                            <div className={`p-5 rounded-3xl mb-4 transition-transform shadow-xl ${isDragOver ? 'bg-blue-500 text-white scale-110' : 'bg-slate-100 dark:bg-zinc-800 text-blue-400 group-hover:scale-110'}`}>
                                                <FileVideo className="w-10 h-10" />
                                            </div>
                                            <p className="text-base text-foreground/80 font-bold">Video auswählen oder hierher ziehen</p>
                                            <p className="text-xs text-muted-foreground mt-2 font-medium">
                                                Max. {maxMB} MB • {ALLOWED_VIDEO_EXTENSIONS.join(', ').toUpperCase()}
                                            </p>
                                            <input type="file" accept="video/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileSelect} />
                                        </div>
                                    ) : (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                                            <div className="relative rounded-2xl overflow-hidden aspect-video bg-black shadow-2xl border border-white/5 group">
                                                <video src={previewUrl} className="w-full h-full object-cover opacity-90" muted playsInline />
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button 
                                                        onClick={() => setIsEditorOpen(true)}
                                                        className="px-6 py-3 bg-white text-black rounded-xl font-bold flex items-center gap-2 hover:bg-zinc-200 transition active:scale-95"
                                                    >
                                                        <FileVideo size={18} /> Video bearbeiten
                                                    </button>
                                                </div>
                                                <button onClick={() => { setFile(null); setPreviewUrl(null); setErrorMsg(""); setEditorData(null); }} className="absolute top-4 right-4 bg-black/60 backdrop-blur-md p-2 rounded-full text-white hover:bg-red-500 transition shadow-lg">
                                                    <Trash2 size={18} />
                                                </button>

                                                {editorData && (
                                                    <div className="absolute bottom-4 left-4 bg-blue-600/90 backdrop-blur-md px-3 py-1.5 rounded-lg text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2 shadow-xl border border-white/20">
                                                        <CheckCircle2 size={14} /> Bearbeitet ({(editorData.endTime - editorData.startTime).toFixed(1)}s)
                                                    </div>
                                                )}
                                            </div>

                                            <div className="bg-zinc-900/50 p-4 rounded-2xl border border-white/5 space-y-4">
                                                <div className="flex items-start gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                                                        <Info size={20} />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <h4 className="text-sm font-bold text-white leading-tight">Virtual Editor aktiv</h4>
                                                        <p className="text-[11px] text-zinc-500 leading-relaxed">
                                                            Du hast dein Video erfolgreich ausgewählt. Nutze den Editor, um den besten Ausschnitt (max. 60s) zu wählen und ein Spotlight zu setzen.
                                                        </p>
                                                    </div>
                                                </div>
                                                
                                                <button 
                                                    onClick={() => setStep(2)}
                                                    className="w-full py-4 bg-white text-black rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-zinc-200 transition shadow-xl active:scale-[0.98]"
                                                >
                                                    Weiter zur Kategorisierung <ChevronRight size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest ml-1">Kategorie</label>
                                            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-zinc-900 border border-white/5 text-white p-3.5 rounded-xl text-sm font-bold outline-none focus:border-blue-500/50 transition appearance-none">
                                                <option>Training</option>
                                                <option>Match Highlight</option>
                                                <option>Tor</option>
                                                <option>Skill</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest ml-1">Beschreibung</label>
                                            <input
                                                type="text"
                                                placeholder="z.B. Starker Abschluss"
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                                className="w-full bg-zinc-900 border border-white/5 text-white p-3.5 rounded-xl text-sm font-bold outline-none focus:border-blue-500/50 transition placeholder:text-zinc-700"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest ml-1">Skill-Tags</label>
                                        <div className="flex flex-wrap gap-2">
                                            {SKILL_TAGS.map(tag => (
                                                <button
                                                    key={tag}
                                                    type="button"
                                                    onClick={() => toggleTag(tag)}
                                                    className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${selectedTags.includes(tag)
                                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                                        : 'bg-zinc-900 text-zinc-500 border border-white/5 hover:border-white/10 hover:text-zinc-300'
                                                        }`}
                                                >
                                                    {tag}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-[10px] text-amber-500 font-black uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                            PlayStyle Spotlight
                                            <span className="text-[9px] text-zinc-600 font-bold normal-case tracking-normal">(max. 2)</span>
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {ACTION_TAGS.map(({ label, icon: Icon }) => (
                                                <button
                                                    key={label}
                                                    type="button"
                                                    onClick={() => toggleActionTag(label)}
                                                    className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-200 border flex items-center gap-2 ${selectedActionTags.includes(label)
                                                        ? 'bg-cyan-400/10 text-cyan-400 border-cyan-400/30 shadow-[0_0_15px_rgba(34,211,238,0.15)]'
                                                        : 'bg-zinc-900 text-zinc-500 border-white/5 hover:bg-white/5 hover:text-white'
                                                        }`}
                                                >
                                                    <Icon size={12} />
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Assist-Tags Section */}
                                    <div className="space-y-3">
                                        <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                            Beteiligte verlinken
                                        </label>
                                        
                                        {/* Selected Tags Display */}
                                        {taggedUsers.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                {taggedUsers.map(tag => (
                                                    <div key={tag.user.id} className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-2 py-1.5 rounded-xl">
                                                        <img src={tag.user.avatar_url || '/cavios-icon.png'} className="w-5 h-5 rounded-full object-cover" />
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] font-bold text-white leading-none">{tag.user.full_name}</span>
                                                            <span className="text-[9px] text-blue-400">{tag.roleLabel}</span>
                                                        </div>
                                                        <button onClick={() => removeTaggedUser(tag.user.id)} className="ml-1 text-zinc-400 hover:text-red-400">
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="relative">
                                            <div className="relative flex items-center">
                                                <Search className="absolute left-3 text-zinc-500" size={16} />
                                                <input
                                                    type="text"
                                                    placeholder="Spieler suchen (Name, Verein)..."
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    className="w-full bg-zinc-900 border border-white/5 text-white py-3 pl-10 pr-3 rounded-xl text-sm font-medium outline-none focus:border-blue-500/50 transition placeholder:text-zinc-700"
                                                />
                                                {isSearching && <Loader2 className="absolute right-3 text-blue-500 animate-spin" size={16} />}
                                            </div>

                                            {/* Search Results Dropdown */}
                                            {searchResults.length > 0 && (
                                                <div className="absolute z-[9999] top-full mt-2 w-full bg-zinc-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto">
                                                    {searchResults.map(user => (
                                                        <div 
                                                            key={user.id} 
                                                            onClick={() => handleSelectTagUser(user)}
                                                            className="flex items-center gap-3 p-3 hover:bg-white/5 cursor-pointer transition-colors border-b border-white/5 last:border-0"
                                                        >
                                                            <img src={user.avatar_url || '/cavios-icon.png'} className="w-8 h-8 rounded-full object-cover bg-zinc-800" />
                                                            <div>
                                                                <div className="text-sm font-bold text-white">{user.full_name}</div>
                                                                <div className="text-[10px] text-zinc-500">{user.clubs?.name || 'Vereinslos'}</div>
                                                            </div>
                                                            <UserPlus size={16} className="ml-auto text-blue-500" />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex gap-3 pt-4">
                                        <button 
                                            onClick={() => setStep(1)}
                                            className="flex-1 py-4 bg-zinc-900 border border-white/10 text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-zinc-800 transition active:scale-95"
                                        >
                                            <ArrowLeft size={18} /> Zurück
                                        </button>
                                        <button 
                                            onClick={handleUpload} 
                                            className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-500 transition shadow-xl shadow-blue-600/20 active:scale-95"
                                        >
                                            <CheckCircle2 size={18} /> Veröffentlichen
                                        </button>
                                    </div>
                                </div>
                            )}

                            {errorMsg && (
                                <div className="bg-red-500/10 text-red-400 text-[10px] font-bold p-4 rounded-2xl border border-red-500/20 flex items-center gap-3 animate-in fade-in">
                                    <AlertTriangle size={16} /> {errorMsg}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <AnimatePresence>
                {isEditorOpen && file && (
                    <VideoEditor 
                        file={file} 
                        onSave={(data) => {
                            setEditorData(data);
                            setIsEditorOpen(false);
                            // If they just selected the file, move to next step automatically or let them see the preview
                            if (step === 1) setStep(2);
                        }}
                        onCancel={() => {
                            // If it's the first selection, clear file. If it's a re-edit, just close.
                            if (!editorData) {
                                setFile(null);
                                setPreviewUrl(null);
                            }
                            setIsEditorOpen(false);
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Role Selection Modal */}
            <AnimatePresence>
                {showRoleModalFor && (
                    <div className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="w-full max-w-sm bg-zinc-900 border border-white/10 rounded-3xl p-6 shadow-2xl relative"
                        >
                            <button onClick={() => setShowRoleModalFor(null)} className="absolute top-4 right-4 text-zinc-400 hover:text-white transition">
                                <X size={20} />
                            </button>
                            <div className="text-center mb-6">
                                <img src={showRoleModalFor.avatar_url || '/cavios-icon.png'} className="w-16 h-16 rounded-full mx-auto mb-3 object-cover border-2 border-white/10" />
                                <h3 className="text-lg font-black text-white">Welche Rolle hatte {showRoleModalFor.full_name}?</h3>
                                <p className="text-xs text-zinc-400 mt-1">Wähle den passenden Assist-Tag</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {ASSIST_ROLES.map(role => (
                                    <button
                                        key={role.id}
                                        onClick={() => confirmUserRole(role)}
                                        className="py-3 px-2 bg-white/5 border border-white/10 text-white rounded-xl text-xs font-bold hover:bg-blue-500/20 hover:border-blue-500/50 hover:text-blue-400 transition-colors flex items-center justify-center gap-2"
                                    >
                                        {role.label}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
