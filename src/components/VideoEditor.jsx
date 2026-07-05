import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Scissors, 
    Image as ImageIcon, 
    Volume2, 
    VolumeX, 
    Crosshair, 
    Check, 
    X, 
    AlertCircle, 
    Play, 
    Pause,
    Info,
    ChevronLeft,
    ChevronRight,
    Clock,
    ArrowLeft,
    CheckCircle2
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

export const VideoEditor = ({ file, onSave, onCancel }) => {
    const { addToast } = useToast();
    const videoRef = useRef(null);
    
    const [duration, setDuration] = useState(0);
    const [startTime, setStartTime] = useState(0);
    const [endTime, setEndTime] = useState(60);
    const [currentTime, setCurrentTime] = useState(0);
    const [thumbnailTime, setThumbnailTime] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [spotlight, setSpotlight] = useState(null); // { x, y, t }
    const [spotlightDuration, setSpotlightDuration] = useState(2); // Default 2s
    const [isPlaying, setIsPlaying] = useState(false);
    const [activeTab, setActiveTab] = useState('trim'); // trim, thumbnail, spotlight
    
    const videoUrl = useRef(URL.createObjectURL(file)).current;

    useEffect(() => {
        return () => URL.revokeObjectURL(videoUrl);
    }, [videoUrl]);

    const handleLoadedMetadata = () => {
        const d = videoRef.current.duration;
        setDuration(d);
        setEndTime(Math.min(d, 60));
        
        if (d > 60) {
            addToast('Highlight-Modus aktiviert: Wähle deine besten 60 Sekunden aus.', 'info');
        }
    };

    const handleTimeUpdate = () => {
        const t = videoRef.current.currentTime;
        setCurrentTime(t);
        
        // Loop logic for trimming preview (only in trim tab)
        if (activeTab === 'trim' && t >= endTime) {
            videoRef.current.currentTime = startTime;
        }
    };

    const togglePlay = () => {
        if (!videoRef.current) return;
        if (isPlaying) videoRef.current.pause();
        else videoRef.current.play();
        setIsPlaying(!isPlaying);
    };

    const handleVideoClick = (e) => {
        if (activeTab !== 'spotlight') return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        const t = videoRef.current.currentTime;

        setSpotlight({ x, y, t });
    };

    const isDurationValid = (endTime - startTime) <= 60.5; // Slight buffer for float precision

    const handleSave = () => {
        if (!isDurationValid) {
            addToast('Video darf maximal 60 Sekunden lang sein.', 'error');
            return;
        }
        onSave({
            startTime,
            endTime,
            thumbnailTime,
            isMuted,
            spotlight: spotlight ? { ...spotlight, duration: spotlightDuration } : null
        });
    };

    const formatTime = (time) => {
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="fixed inset-0 z-[10001] bg-black flex flex-col overflow-hidden">
            
            {/* 1. Immersive Background Video Canvas */}
            <div className="absolute inset-0 z-0 flex items-center justify-center">
                <video
                    ref={videoRef}
                    src={videoUrl}
                    className={`w-full h-full object-contain ${activeTab === 'spotlight' ? 'cursor-crosshair' : 'cursor-default'}`}
                    onLoadedMetadata={handleLoadedMetadata}
                    onTimeUpdate={handleTimeUpdate}
                    onClick={handleVideoClick}
                    muted={isMuted}
                    playsInline
                />
                
                {/* Spotlight Indicator Overlay */}
                <AnimatePresence>
                    {spotlight && (currentTime >= spotlight.t && currentTime <= (spotlight.t + spotlightDuration)) && (
                        <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            style={{ left: `${spotlight.x}%`, top: `${spotlight.y}%` }}
                            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10"
                        >
                            <div className="relative flex items-center justify-center">
                                <div className="w-10 h-10 rounded-full border-2 border-cyan-400 bg-cyan-400/20 shadow-[0_0_20px_rgba(34,211,238,0.6)] flex items-center justify-center">
                                    <Crosshair size={18} className="text-cyan-400" />
                                </div>
                                <div className="absolute inset-0 w-10 h-10 rounded-full border-2 border-cyan-400 animate-ping opacity-75" />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* 2. Floating Header Overlay */}
            <div className="absolute top-0 w-full z-20 flex justify-between items-center px-6 pt-[calc(1.5rem+env(safe-area-inset-top,0px))] bg-gradient-to-b from-black/60 to-transparent">
                <button 
                    onClick={onCancel}
                    className="p-3 rounded-full bg-black/30 backdrop-blur-md border border-white/10 text-white shadow-xl hover:bg-black/50 transition active:scale-90"
                >
                    <X size={24} />
                </button>
                
                <div className="flex flex-col items-center">
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] animate-pulse mb-1">
                        SPOTLIGHT READY
                    </span>
                    <div className="px-4 py-1.5 bg-black/30 backdrop-blur-md border border-white/10 rounded-full text-[11px] font-bold text-white shadow-xl flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        CAVIOS Editor
                    </div>
                </div>

                <button 
                    onClick={handleSave}
                    disabled={!isDurationValid}
                    className={`p-3 rounded-full shadow-xl transition active:scale-90 border border-white/10 ${isDurationValid ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-500 opacity-50 cursor-not-allowed'}`}
                >
                    <Check size={24} />
                </button>
            </div>

            {/* 3. Glassmorphism Control Panel Overlay */}
            <div className="absolute bottom-0 w-full z-20 bg-black/40 backdrop-blur-xl border-t border-white/10 flex flex-col pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
                
                {/* Area A: Global Playback Steuerung */}
                <div className="px-6 pt-6 flex items-center gap-4">
                    <button
                        onClick={togglePlay}
                        className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:bg-zinc-200 transition active:scale-90 shrink-0 shadow-xl"
                    >
                        {isPlaying ? <Pause size={18} fill="black" /> : <Play size={18} fill="black" className="ml-0.5" />}
                    </button>

                    <div className="flex-1 flex items-center gap-3">
                        <span className="text-[10px] font-mono text-white/60 w-8">{formatTime(currentTime)}</span>
                        <input 
                            type="range"
                            min="0"
                            max={duration || 100}
                            step="0.01"
                            value={currentTime}
                            onChange={(e) => {
                                const t = parseFloat(e.target.value);
                                if (videoRef.current) {
                                    videoRef.current.currentTime = t;
                                    setCurrentTime(t);
                                }
                            }}
                            className="flex-1 h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-white"
                        />
                        <span className="text-[10px] font-mono text-white/60 w-8 text-right">{formatTime(duration)}</span>
                    </div>
                </div>

                {/* Area B: Kontext-Tools (Dynamisch) */}
                <div className="px-6 py-6 min-h-[140px] flex flex-col justify-center">
                    <AnimatePresence mode="wait">
                        {activeTab === 'trim' && (
                            <motion.div 
                                key="trim"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-6"
                            >
                                <div className="flex justify-between items-center px-1">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-1.5 h-1.5 rounded-full ${isDurationValid ? 'bg-blue-500' : 'bg-red-500'}`} />
                                        <span className="text-[10px] font-black uppercase text-white/80 tracking-widest">Schnitt-Länge</span>
                                    </div>
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${isDurationValid ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-red-500/20 text-red-500 border border-red-500/30'}`}>
                                        {(endTime - startTime).toFixed(1)}s / 60s
                                    </span>
                                </div>
                                <div className="space-y-4 px-1">
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-[8px] text-white/40 uppercase font-black">
                                            <span>Start</span>
                                            <span className="text-white/80">{formatTime(startTime)}</span>
                                        </div>
                                        <input 
                                            type="range" min="0" max={Math.max(0, endTime - 0.5)} step="0.1"
                                            value={startTime}
                                            onChange={(e) => {
                                                const t = parseFloat(e.target.value);
                                                setStartTime(t);
                                                videoRef.current.currentTime = t;
                                            }}
                                            className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-blue-500"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-[8px] text-white/40 uppercase font-black">
                                            <span>Ende</span>
                                            <span className="text-white/80">{formatTime(endTime)}</span>
                                        </div>
                                        <input 
                                            type="range" min={startTime + 0.5} max={duration} step="0.1"
                                            value={endTime}
                                            onChange={(e) => {
                                                const t = parseFloat(e.target.value);
                                                setEndTime(t);
                                                videoRef.current.currentTime = t;
                                            }}
                                            className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-blue-500"
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'thumbnail' && (
                            <motion.div 
                                key="thumbnail"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-6"
                            >
                                <div className="flex items-center gap-2 px-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                                    <span className="text-[10px] font-black uppercase text-white/80 tracking-widest">Cover-Frame wählen</span>
                                </div>
                                <div className="space-y-4 px-1">
                                    <div className="flex justify-between text-[8px] text-white/40 uppercase font-black">
                                        <span>Thumbnail bei</span>
                                        <span className="text-cyan-400 font-bold">{formatTime(thumbnailTime)}</span>
                                    </div>
                                    <input 
                                        type="range" min="0" max={duration} step="0.1"
                                        value={thumbnailTime}
                                        onChange={(e) => {
                                            const t = parseFloat(e.target.value);
                                            setThumbnailTime(t);
                                            videoRef.current.currentTime = t;
                                        }}
                                        className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]"
                                    />
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'spotlight' && (
                            <motion.div 
                                key="spotlight"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-5"
                            >
                                <div className="flex justify-between items-center px-1">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-1.5 h-1.5 rounded-full ${spotlight ? 'bg-cyan-400' : 'bg-white/20'}`} />
                                        <span className="text-[10px] font-black uppercase text-white/80 tracking-widest">Visibility Duration</span>
                                    </div>
                                    {spotlight && (
                                        <span className="text-[8px] font-mono text-cyan-400/80 uppercase">
                                            {spotlight.x.toFixed(0)}% / {spotlight.y.toFixed(0)}% @ {formatTime(spotlight.t)}
                                        </span>
                                    )}
                                </div>
                                
                                {spotlight ? (
                                    <div className="flex gap-2">
                                        {[1, 2, 3, 5].map(d => (
                                            <button
                                                key={d}
                                                onClick={() => setSpotlightDuration(d)}
                                                className={`flex-1 py-3.5 rounded-xl text-[10px] font-black transition-all border ${spotlightDuration === d ? 'bg-cyan-400 text-black border-cyan-400' : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10'}`}
                                            >
                                                {d}s
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-6 border border-dashed border-white/10 rounded-2xl text-center bg-white/5">
                                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                                            <Crosshair size={14} /> Tippe oben ins Video
                                        </p>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Area C: Main Navigation (Tab Bar) */}
                <div className="px-6 border-t border-white/5 pt-4">
                    <div className="flex items-center justify-between">
                        <button 
                            onClick={() => setActiveTab('trim')}
                            className={`flex flex-col items-center gap-2 px-6 py-2 transition-all ${activeTab === 'trim' ? 'text-white' : 'text-white/30 hover:text-white/60'}`}
                        >
                            <Scissors size={20} className={activeTab === 'trim' ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : ''} />
                            <span className="text-[9px] font-black uppercase tracking-[0.15em]">Clip</span>
                        </button>
                        <button 
                            onClick={() => setActiveTab('thumbnail')}
                            className={`flex flex-col items-center gap-2 px-6 py-2 transition-all ${activeTab === 'thumbnail' ? 'text-white' : 'text-white/30 hover:text-white/60'}`}
                        >
                            <ImageIcon size={20} className={activeTab === 'thumbnail' ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : ''} />
                            <span className="text-[9px] font-black uppercase tracking-[0.15em]">Cover</span>
                        </button>
                        <button 
                            onClick={() => setActiveTab('spotlight')}
                            className={`flex flex-col items-center gap-2 px-6 py-2 transition-all ${activeTab === 'spotlight' ? 'text-white' : 'text-white/30 hover:text-white/60'}`}
                        >
                            <Crosshair size={20} className={activeTab === 'spotlight' ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : ''} />
                            <span className="text-[9px] font-black uppercase tracking-[0.15em]">Spotlight</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Subtle Gradient Overlays for readability */}
            <div className="absolute top-0 w-full h-32 bg-gradient-to-b from-black/50 to-transparent pointer-events-none z-10" />
            <div className="absolute bottom-0 w-full h-64 bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-10" />
        </div>
    );
};
