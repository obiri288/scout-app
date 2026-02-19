import React, { useRef, useEffect, useState } from 'react';
import {
    Loader2, User, CheckCircle, ArrowLeft, Settings, Edit, Share2, MessageCircle,
    Plus, Check, Crown, Shield, Instagram, Video, Youtube, Play, Database, Bookmark, BookmarkCheck, Trash2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';
import { ProfileSkeleton } from './SkeletonScreens';
import { useToast } from '../contexts/ToastContext';

// Lazy-loaded video tile for profile grid
const VideoTile = ({ video, onClick, isOwnProfile, onDelete }) => {
    const { ref, isIntersecting } = useIntersectionObserver({ threshold: 0.1, rootMargin: '200px' });
    const [loaded, setLoaded] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const handleDelete = (e) => {
        e.stopPropagation();
        if (confirmDelete) {
            onDelete(video);
            setConfirmDelete(false);
        } else {
            setConfirmDelete(true);
            setTimeout(() => setConfirmDelete(false), 3000);
        }
    };

    return (
        <div ref={ref} onClick={() => onClick(video)} className="aspect-[3/4] bg-zinc-900 relative cursor-pointer group overflow-hidden">
            {isIntersecting || loaded ? (
                <>
                    <video
                        src={video.video_url}
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition duration-500"
                        preload="none"
                        poster={video.thumbnail_url}
                        onLoadedData={() => setLoaded(true)}
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="absolute bottom-2 left-2 text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"><Play size={8} fill="white" /> {video.likes_count}</div>
                    {video.skill_tags && video.skill_tags.length > 0 && (
                        <div className="absolute top-2 left-2 flex flex-wrap gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {video.skill_tags.slice(0, 2).map(tag => (
                                <span key={tag} className="bg-blue-600/80 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">{tag}</span>
                            ))}
                        </div>
                    )}
                    {isOwnProfile && (
                        <button
                            onClick={handleDelete}
                            className={`absolute top-2 right-2 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all z-10 ${confirmDelete
                                ? 'bg-red-600 text-white opacity-100 scale-110'
                                : 'bg-black/60 backdrop-blur-sm text-zinc-300 hover:bg-red-600 hover:text-white'
                                }`}
                        >
                            <Trash2 size={14} />
                        </button>
                    )}
                    {confirmDelete && (
                        <div className="absolute inset-x-0 bottom-0 bg-red-600/90 text-white text-[10px] font-bold text-center py-1.5 z-10 animate-in fade-in">
                            Nochmal tippen zum Löschen
                        </div>
                    )}
                </>
            ) : (
                <div className="w-full h-full bg-zinc-800 animate-pulse" />
            )}
        </div>
    );
};

export const ProfileScreen = ({ player, highlights, onVideoClick, onDeleteVideo, isOwnProfile, onBack, onLogout, onEditReq, onChatReq, onSettingsReq, onFollow, onShowFollowers, onLoginReq, onCreateProfile, onClubClick, onAdminReq, onWatchlistToggle, isOnWatchlist, session }) => {
    if (isOwnProfile && !player) return <ProfileSkeleton />;
    if (!player) return <div className="min-h-screen flex items-center justify-center text-zinc-500">Profil nicht gefunden.</div>;

    const statusColors = {
        'Gebunden': 'bg-red-500 shadow-red-500/50',
        'Vertrag läuft aus': 'bg-amber-500 shadow-amber-500/50',
        'Suche Verein': 'bg-emerald-500 shadow-emerald-500/50'
    };
    const statusTextClass = player.transfer_status === 'Suche Verein' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : player.transfer_status === 'Vertrag läuft aus' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20';

    return (
        <div className="pb-24 animate-in fade-in">
            <div className="relative bg-zinc-900 pb-6 rounded-b-[2rem] overflow-hidden shadow-2xl border-b border-white/5">
                <div className="absolute inset-0 h-40 bg-gradient-to-br from-blue-900/40 via-purple-900/20 to-black pointer-events-none"></div>

                {/* Nav */}
                <div className="pt-6 px-6 flex justify-between items-center relative z-10">
                    {!isOwnProfile ? <button onClick={onBack} className="p-2 bg-black/40 backdrop-blur-md rounded-full text-white border border-white/10"><ArrowLeft size={20} /></button> : <div></div>}
                    {isOwnProfile && <button onClick={onSettingsReq} className="p-2 bg-black/40 backdrop-blur-md rounded-full text-white border border-white/10"><Settings size={20} /></button>}
                </div>

                <div className="flex flex-col items-center pt-2 relative z-10 px-6">
                    {/* Avatar */}
                    <div className="relative mb-4 group">
                        <div className="absolute -inset-1 rounded-full blur opacity-40 bg-gradient-to-tr from-blue-600 to-purple-600"></div>
                        <div className="relative w-32 h-32 rounded-full bg-zinc-900 overflow-hidden border-4 border-zinc-900 shadow-2xl">
                            {player.avatar_url ? <img src={player.avatar_url} className="w-full h-full object-cover" /> : <User size={56} className="text-zinc-600 m-8" />}
                        </div>
                    </div>

                    {/* Name & Badge */}
                    <h1 className="text-3xl font-black text-white flex items-center justify-center gap-2 mb-1 text-center leading-tight">
                        {player.full_name}
                        {player.is_verified && <CheckCircle size={20} className="text-blue-500 fill-blue-500/10" />}
                    </h1>

                    {/* Club & Position */}
                    <div className="flex items-center gap-2 text-zinc-400 text-sm font-medium mb-4">
                        {player.clubs?.is_icon_league && <Crown size={14} className="text-amber-400" />}
                        <span onClick={() => player.clubs && onClubClick(player.clubs)} className="hover:text-white transition cursor-pointer">{player.clubs?.name || "Vereinslos"}</span>
                        <span className="w-1 h-1 bg-zinc-600 rounded-full"></span>
                        <span className="text-zinc-300 bg-white/10 px-2 py-0.5 rounded text-xs">{player.position_primary}</span>
                    </div>

                    {/* Transfer Status Pill */}
                    <div className={`mb-6 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wide ${statusTextClass}`}>
                        {player.transfer_status}
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-3 w-full mb-6">
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-3 flex flex-col items-center justify-center cursor-pointer hover:bg-white/10 transition" onClick={onShowFollowers}>
                            <span className="text-xl font-black text-white">{player.followers_count || 0}</span>
                            <span className="text-[10px] text-zinc-500 uppercase font-bold mt-1">Follower</span>
                        </div>
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-3 flex flex-col items-center justify-center">
                            <span className="text-xl font-black text-white">{highlights.length}</span>
                            <span className="text-[10px] text-zinc-500 uppercase font-bold mt-1">Clips</span>
                        </div>
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-3 flex flex-col items-center justify-center">
                            <div className="text-white font-bold text-sm">{player.strong_foot || '-'}</div>
                            <span className="text-[10px] text-zinc-500 uppercase font-bold mt-1">{player.height_user ? `${player.height_user} cm` : 'Größe'}</span>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="w-full flex gap-3">
                        {isOwnProfile ? (
                            <>
                                <button onClick={onEditReq} className="flex-1 bg-zinc-800 text-white font-bold py-3 rounded-xl border border-zinc-700 hover:bg-zinc-700 transition flex items-center justify-center gap-2">
                                    <Edit size={18} /> Profil
                                </button>
                                <button className="bg-zinc-800 text-white p-3 rounded-xl border border-zinc-700 hover:bg-zinc-700 transition">
                                    <Share2 size={20} />
                                </button>
                                {player.is_admin && <button onClick={onAdminReq} className="bg-blue-900/30 text-blue-400 p-3 rounded-xl border border-blue-500/30 hover:bg-blue-900/50"><Database size={20} /></button>}
                            </>
                        ) : (
                            <>
                                <button onClick={onFollow} className={`flex-1 ${player.isFollowing ? 'bg-zinc-800 text-white border-zinc-700' : 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'} border py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2`}>
                                    {player.isFollowing ? <Check size={18} /> : <Plus size={18} />}
                                    {player.isFollowing ? 'Gefolgt' : 'Folgen'}
                                </button>
                                <button onClick={onChatReq} className="bg-zinc-800 text-white px-5 py-3 rounded-xl border border-zinc-700 hover:bg-zinc-700 transition">
                                    <MessageCircle size={20} />
                                </button>
                                {/* Watchlist button for scouts */}
                                {session && onWatchlistToggle && (
                                    <button onClick={onWatchlistToggle} className={`p-3 rounded-xl border transition ${isOnWatchlist ? 'bg-blue-600/20 text-blue-400 border-blue-500/30' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700 hover:text-white'}`}>
                                        {isOnWatchlist ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Social Links Row */}
            <div className="flex justify-center gap-6 py-6 border-b border-white/5">
                {player.instagram_handle ? <a href={`https://instagram.com/${player.instagram_handle}`} target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-pink-500 transition"><Instagram size={24} /></a> : <Instagram size={24} className="text-zinc-800" />}
                {player.tiktok_handle ? <a href={`https://tiktok.com/@${player.tiktok_handle}`} target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-white transition"><Video size={24} /></a> : <Video size={24} className="text-zinc-800" />}
                {player.youtube_handle ? <a href={`https://youtube.com/@${player.youtube_handle}`} target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-red-500 transition"><Youtube size={24} /></a> : <Youtube size={24} className="text-zinc-800" />}
            </div>

            {/* Content Tabs */}
            <div className="flex px-4 pt-4 pb-2 gap-6 text-sm font-bold text-zinc-500 border-b border-white/5">
                <span className="text-white border-b-2 border-blue-500 pb-2">Highlights</span>
                <span className="hover:text-zinc-300 cursor-pointer">Stats</span>
                <span className="hover:text-zinc-300 cursor-pointer">Über</span>
            </div>

            {/* Video Grid with lazy loading */}
            <div className="grid grid-cols-3 gap-0.5 mt-0.5">
                {highlights.map(v => (
                    <VideoTile key={v.id} video={v} onClick={onVideoClick} isOwnProfile={isOwnProfile} onDelete={onDeleteVideo} />
                ))}
            </div>
            {highlights.length === 0 && <div className="py-20 text-center text-zinc-600 text-sm">Noch keine Highlights hochgeladen.</div>}
        </div>
    );
};
