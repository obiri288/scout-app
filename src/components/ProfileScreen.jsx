import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Loader2, User, CheckCircle, ArrowLeft, Settings, Edit, Share2, MessageCircle,
    Plus, Check, Crown, Shield, Instagram, Video, Youtube, Play, Database, Bookmark, BookmarkCheck, Trash2, ArrowLeftRight, MoreVertical, Flag, ShieldOff, Eye
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { calculateAge } from '../lib/helpers';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';
import { ProfileSkeleton } from './SkeletonScreens';
import { useToast } from '../contexts/ToastContext';
import { PlayerRating } from './PlayerRating';
import { SimilarPlayers } from './SimilarPlayers';
import { ProfileCompletenessCard } from './ProfileCompletenessCard';
import { EmptyState } from './EmptyState';
import { PlayerCard } from './PlayerCard';
import { RadarChart } from './RadarChart';
import { XPLevelBadge } from './XPLevelBadge';
import * as api from '../lib/api';

// Lazy-loaded video tile for profile grid
const VideoTile = React.memo(({ video, onClick, isOwnProfile, onDelete }) => {
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
        <div ref={ref} onClick={() => onClick(video)} className="aspect-[3/4] bg-card relative cursor-pointer group overflow-hidden">
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
                                <span key={tag} className="bg-emerald-600/80 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">{tag}</span>
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
                <div className="w-full h-full bg-muted animate-pulse" />
            )}
        </div>
    );
});

export const ProfileScreen = ({ player, highlights, onVideoClick, onDeleteVideo, isOwnProfile, onBack, onLogout, onEditReq, onChatReq, onSettingsReq, onFollow, onShowFollowers, onLoginReq, onCreateProfile, onClubClick, onAdminReq, onWatchlistToggle, isOnWatchlist, session, onCompare, onPlayerClick, onReport, onBlock, onUpload }) => {
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showPlayerCard, setShowPlayerCard] = useState(false);
    const [viewCount, setViewCount] = useState(0);
    const [avgRating, setAvgRating] = useState(0);

    useEffect(() => {
        if (!player) return;
        if (isOwnProfile) {
            api.getProfileViewCount(player.id).then(setViewCount);
        }
        // Load rating for FIFA card
        supabase.from('player_ratings').select('rating').eq('player_id', player.id)
            .then(({ data }) => {
                if (data && data.length > 0) {
                    setAvgRating(Math.round(data.reduce((s, r) => s + r.rating, 0) / data.length * 10) / 10);
                }
            });
    }, [player, isOwnProfile]);
    if (isOwnProfile && !player) return <ProfileSkeleton />;
    if (!player) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Profil nicht gefunden.</div>;

    const statusColors = {
        'Gebunden': 'bg-red-500 shadow-red-500/50',
        'Vertrag läuft aus': 'bg-amber-500 shadow-amber-500/50',
        'Suche Verein': 'bg-emerald-500 shadow-emerald-500/50'
    };
    const statusTextClass = player.transfer_status === 'Suche Verein' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : player.transfer_status === 'Vertrag läuft aus' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20';

    return (
        <div className="pb-24 animate-in fade-in">
            <div className="relative bg-card pb-6 rounded-b-[2rem] overflow-hidden shadow-2xl border-b border-border">
                <div className="absolute inset-0 h-40 bg-gradient-to-br from-emerald-900/30 via-slate-900/20 to-background pointer-events-none"></div>

                {/* Nav */}
                <div className="pt-6 px-6 flex justify-between items-center relative z-10">
                    {!isOwnProfile ? <button onClick={onBack} className="p-2 bg-black/40 backdrop-blur-md rounded-full text-white border border-border"><ArrowLeft size={20} /></button> : <div></div>}
                    <div className="flex items-center gap-2">
                        {!isOwnProfile && (
                            <div className="relative">
                                <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="p-2 bg-black/40 backdrop-blur-md rounded-full text-white border border-border">
                                    <MoreVertical size={20} />
                                </button>
                                {showProfileMenu && (
                                    <div className="absolute right-0 top-full mt-1 bg-zinc-800 border border-white/10 rounded-xl shadow-2xl overflow-hidden min-w-[180px] animate-in fade-in slide-in-from-top-2 z-20">
                                        <button onClick={() => { setShowProfileMenu(false); onReport?.({ id: player.user_id, type: 'user' }); }} className="w-full px-4 py-3 flex items-center gap-3 text-sm text-zinc-300 hover:bg-white/5 hover:text-white transition">
                                            <Flag size={16} className="text-amber-400" /> Nutzer melden
                                        </button>
                                        <button onClick={() => { setShowProfileMenu(false); onBlock?.(player); }} className="w-full px-4 py-3 flex items-center gap-3 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition border-t border-white/5">
                                            <ShieldOff size={16} /> Nutzer blockieren
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                        {isOwnProfile && <button onClick={onSettingsReq} className="p-2 bg-black/40 backdrop-blur-md rounded-full text-white border border-border"><Settings size={20} /></button>}
                    </div>
                </div>

                <div className="flex flex-col items-center pt-2 relative z-10 px-6">
                    {/* Avatar */}
                    <div className="relative mb-4 group">
                        <div className="absolute -inset-1 rounded-full blur opacity-40 bg-gradient-to-tr from-emerald-500 to-emerald-700"></div>
                        <div className="relative w-32 h-32 rounded-full bg-card overflow-hidden border-4 border-card shadow-2xl">
                            {player.avatar_url ? <img src={player.avatar_url} className="w-full h-full object-cover" /> : <User size={56} className="text-muted-foreground m-8" />}
                        </div>
                    </div>

                    {/* Name & Badge */}
                    <h1 className="text-3xl font-black text-white flex items-center justify-center gap-2 mb-1 text-center leading-tight">
                        {player.full_name}
                        {player.is_verified && <CheckCircle size={20} className="text-emerald-500 fill-emerald-500/10" />}
                    </h1>
                    <XPLevelBadge playerId={player.id} compact />

                    {/* Club & Position */}
                    <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium mb-4">
                        {player.clubs?.is_icon_league && <Crown size={14} className="text-amber-400" />}
                        <span onClick={() => player.clubs && onClubClick(player.clubs)} className="hover:text-foreground transition cursor-pointer">{player.clubs?.name || "Vereinslos"}</span>
                        <span className="w-1 h-1 bg-muted-foreground rounded-full"></span>
                        <span className="text-foreground/80 bg-white/10 px-2 py-0.5 rounded text-xs">{player.position_primary}</span>
                    </div>

                    {/* Transfer Status Pill */}
                    <div className={`mb-6 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wide ${statusTextClass}`}>
                        {player.transfer_status}
                    </div>

                    {/* Stats Grid */}
                    <div className={`grid ${isOwnProfile ? 'grid-cols-4' : 'grid-cols-3'} gap-3 w-full mb-6`}>
                        <div className="bg-white/5 border border-border rounded-2xl p-3 flex flex-col items-center justify-center cursor-pointer hover:bg-white/10 transition" onClick={onShowFollowers}>
                            <span className="text-xl font-black text-white">{player.followers_count || 0}</span>
                            <span className="text-[10px] text-muted-foreground uppercase font-bold mt-1">Follower</span>
                        </div>
                        <div className="bg-white/5 border border-border rounded-2xl p-3 flex flex-col items-center justify-center">
                            <span className="text-xl font-black text-white">{highlights.length}</span>
                            <span className="text-[10px] text-muted-foreground uppercase font-bold mt-1">Clips</span>
                        </div>
                        <div className="bg-white/5 border border-border rounded-2xl p-3 flex flex-col items-center justify-center">
                            <PlayerRating playerId={player.id} session={session} compact />
                        </div>
                        {isOwnProfile && (
                            <div className="bg-white/5 border border-border rounded-2xl p-3 flex flex-col items-center justify-center">
                                <div className="flex items-center gap-1 mb-1"><Eye size={12} className="text-blue-400" /></div>
                                <span className="text-xl font-black text-white">{viewCount}</span>
                                <span className="text-[10px] text-muted-foreground uppercase font-bold mt-1">Views</span>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="w-full flex gap-3">
                        {isOwnProfile ? (
                            <>
                                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onEditReq} className="flex-1 bg-muted text-foreground font-bold py-3 rounded-xl border border-border hover:bg-muted/80 transition flex items-center justify-center gap-2">
                                    <Edit size={18} /> Profil
                                </motion.button>
                                <button onClick={() => setShowPlayerCard(true)} className="bg-muted text-foreground p-3 rounded-xl border border-border hover:bg-muted/80 transition">
                                    <Share2 size={20} />
                                </button>
                                {player.is_admin && <button onClick={onAdminReq} className="bg-emerald-900/30 text-emerald-400 p-3 rounded-xl border border-emerald-500/30 hover:bg-emerald-900/50"><Database size={20} /></button>}
                            </>
                        ) : (
                            <>
                                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onFollow} className={`flex-1 ${player.isFollowing ? 'bg-muted text-foreground border-border' : 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20'} border py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2`}>
                                    {player.isFollowing ? <Check size={18} /> : <Plus size={18} />}
                                    {player.isFollowing ? 'Gefolgt' : 'Folgen'}
                                </motion.button>
                                <button onClick={onChatReq} className="bg-muted text-foreground px-5 py-3 rounded-xl border border-border hover:bg-muted/80 transition">
                                    <MessageCircle size={20} />
                                </button>
                                {session && onWatchlistToggle && (
                                    <button onClick={onWatchlistToggle} className={`p-3 rounded-xl border transition ${isOnWatchlist ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30' : 'bg-muted text-muted-foreground border-border hover:bg-muted/80 hover:text-foreground'}`}>
                                        {isOnWatchlist ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
                                    </button>
                                )}
                                {/* Compare button */}
                                {session && onCompare && (
                                    <button onClick={onCompare} className="p-3 rounded-xl border border-border bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground transition" title="Vergleichen">
                                        <ArrowLeftRight size={20} />
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Social Links Row */}
            <div className="flex justify-center gap-6 py-6 border-b border-border">
                {player.instagram_handle ? <a href={`https://instagram.com/${player.instagram_handle}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-pink-500 transition"><Instagram size={24} /></a> : <Instagram size={24} className="text-muted-foreground/40" />}
                {player.tiktok_handle ? <a href={`https://tiktok.com/@${player.tiktok_handle}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground transition"><Video size={24} /></a> : <Video size={24} className="text-muted-foreground/40" />}
                {player.youtube_handle ? <a href={`https://youtube.com/@${player.youtube_handle}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-red-500 transition"><Youtube size={24} /></a> : <Youtube size={24} className="text-muted-foreground/40" />}
            </div>

            {/* Scout Rating (non-own profiles) */}
            {!isOwnProfile && session && (
                <div className="px-4 py-4 border-b border-border">
                    <PlayerRating playerId={player.id} session={session} />
                </div>
            )}

            {/* Profile Completeness */}
            {isOwnProfile && (
                <ProfileCompletenessCard player={player} highlightsCount={highlights.length} onEditProfile={onEditReq} />
            )}

            {/* Content Tabs */}
            <ProfileTabs player={player} highlights={highlights} onVideoClick={onVideoClick} isOwnProfile={isOwnProfile} onDeleteVideo={onDeleteVideo} onUpload={onUpload} />

            {/* Similar Players */}
            {!isOwnProfile && onPlayerClick && (
                <SimilarPlayers player={player} onUserClick={onPlayerClick} />
            )}

            {/* FIFA Player Card Modal */}
            {showPlayerCard && (
                <PlayerCard player={player} avgRating={avgRating} onClose={() => setShowPlayerCard(false)} />
            )}
        </div>
    );
};

// --- Profile Tabs Component ---
const ProfileTabs = ({ player, highlights, onVideoClick, isOwnProfile, onDeleteVideo, onUpload }) => {
    const [activeTab, setActiveTab] = useState('highlights');

    const TabBtn = ({ id, label }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`pb-2 text-sm font-bold transition ${activeTab === id ? 'text-foreground border-b-2 border-emerald-500' : 'text-muted-foreground hover:text-foreground/70'}`}
        >
            {label}
        </button>
    );

    return (
        <>
            <div className="flex px-4 pt-4 pb-2 gap-6 border-b border-border">
                <TabBtn id="highlights" label="Highlights" />
                <TabBtn id="stats" label="Stats" />
                <TabBtn id="about" label="Über" />
            </div>

            {/* TAB: Highlights */}
            {activeTab === 'highlights' && (
                <>
                    <div className="grid grid-cols-3 gap-0.5 mt-0.5">
                        {highlights.map(v => (
                            <VideoTile key={v.id} video={v} onClick={onVideoClick} isOwnProfile={isOwnProfile} onDelete={onDeleteVideo} />
                        ))}
                    </div>
                    {highlights.length === 0 && (
                        <EmptyState
                            icon={Video}
                            title="Zeig was du kannst! 🎬"
                            description={isOwnProfile ? "Lade dein erstes Highlight hoch und werde von Scouts entdeckt." : "Noch keine Highlights hochgeladen."}
                            actionLabel={isOwnProfile ? "Video hochladen" : undefined}
                            onAction={isOwnProfile ? onUpload : undefined}
                        />
                    )}
                </>
            )}

            {/* TAB: Stats */}
            {activeTab === 'stats' && (
                <div className="px-4 py-6 space-y-4 animate-in fade-in">
                    <div className="grid grid-cols-2 gap-3">
                        <StatCard label="Position" value={player.position_primary || '-'} sub={player.position_secondary ? `Neben: ${player.position_secondary}` : null} />
                        <StatCard label="Starker Fuß" value={player.strong_foot || '-'} />
                        <StatCard label="Größe" value={player.height_user ? `${player.height_user} cm` : '-'} />
                        <StatCard label="Gewicht" value={player.weight ? `${player.weight} kg` : '-'} />
                        <StatCard label="Trikotnummer" value={player.jersey_number ? `#${player.jersey_number}` : '-'} />
                        <StatCard label="Alter" value={player.birth_date ? `${calculateAge(player.birth_date)} Jahre` : '-'} />
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <StatCard label="Transfer-Status" value={player.transfer_status || '-'} highlight={player.transfer_status === 'Suche Verein'} />
                        <StatCard label="Vertrag bis" value={player.contract_end ? new Date(player.contract_end).toLocaleDateString('de-DE', { month: 'short', year: 'numeric' }) : '-'} />
                    </div>
                    <div className="grid grid-cols-3 gap-3 pt-2">
                        <StatCard label="Follower" value={player.followers_count || 0} />
                        <StatCard label="Clips" value={highlights.length} />
                        <StatCard label="Verein" value={player.clubs?.name || 'Vereinslos'} small />
                    </div>

                    {/* Radar Chart */}
                    <div className="pt-4">
                        <h4 className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-3 px-1">Spieler-Attribute</h4>
                        <RadarChart playerId={player.id} session={session} isOwnProfile={isOwnProfile} />
                    </div>
                </div>
            )}

            {/* TAB: Über */}
            {activeTab === 'about' && (
                <div className="px-4 py-6 space-y-6 animate-in fade-in">
                    {/* Bio */}
                    {player.bio ? (
                        <div>
                            <h4 className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-2">Über mich</h4>
                            <p className="text-foreground/80 text-sm leading-relaxed bg-white/5 p-4 rounded-xl border border-border">{player.bio}</p>
                        </div>
                    ) : (
                        <div className="text-muted-foreground text-sm text-center py-4">Keine Bio vorhanden.</div>
                    )}

                    {/* Personal Info */}
                    <div>
                        <h4 className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-3">Persönliche Daten</h4>
                        <div className="space-y-2">
                            {player.birth_date && <InfoRow icon="📅" label="Geburtsdatum" value={new Date(player.birth_date).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })} />}
                            {player.nationality && <InfoRow icon="🌍" label="Nationalität" value={player.nationality} />}
                            {(player.city || player.zip_code) && <InfoRow icon="📍" label="Standort" value={[player.zip_code, player.city].filter(Boolean).join(' ')} />}
                        </div>
                    </div>

                    {/* External Links */}
                    {(player.transfermarkt_url || player.fupa_url) && (
                        <div>
                            <h4 className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-3">Externe Profile</h4>
                            <div className="space-y-2">
                                {player.transfermarkt_url && (
                                    <a href={player.transfermarkt_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 bg-white/5 p-3 rounded-xl text-sm text-emerald-400 hover:bg-white/10 transition border border-border">
                                        🔗 Transfermarkt Profil
                                    </a>
                                )}
                                {player.fupa_url && (
                                    <a href={player.fupa_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 bg-white/5 p-3 rounded-xl text-sm text-emerald-400 hover:bg-white/10 transition border border-border">
                                        🔗 FuPa Profil
                                    </a>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </>
    );
};

// Helper components
const StatCard = ({ label, value, sub, highlight, small }) => (
    <motion.div whileHover={{ scale: 1.03, borderColor: "rgba(16,185,129,0.3)" }} transition={{ type: "spring", stiffness: 400, damping: 25 }} className={`bg-white/5 border border-border rounded-2xl p-4 flex flex-col items-center text-center ${highlight ? 'border-emerald-500/30 bg-emerald-500/5' : ''}`}>
        <div className={`font-black text-white ${small ? 'text-xs' : 'text-lg'}`}>{value}</div>
        <div className="text-[10px] text-muted-foreground uppercase font-bold mt-1">{label}</div>
        {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
    </motion.div>
);

const InfoRow = ({ icon, label, value }) => (
    <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-border">
        <span className="text-lg">{icon}</span>
        <div>
            <div className="text-[10px] text-muted-foreground uppercase font-bold">{label}</div>
            <div className="text-sm text-white">{value}</div>
        </div>
    </div>
);
