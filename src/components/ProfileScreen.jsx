import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Video, Users, UserPlus, UserCheck, Edit, Share2, MessageCircle, 
    Bookmark, BookmarkCheck, ArrowLeftRight, Database, ShieldCheck, 
    Briefcase, Target, Globe, CheckCircle, Info, Star, ChevronRight,
    Trophy, Zap, MapPin, Calendar, ExternalLink, Instagram, Youtube, Eye,
    Loader2, X, Trash2, Play
} from 'lucide-react';
import { RadarChart } from './RadarChart';
import { EmptyState } from './EmptyState';
import { PlayerRating } from './PlayerRating';
import { ProReadinessCard } from './ProReadinessCard';
import { CareerTimeline } from './CareerTimeline';
import { SimilarPlayers } from './SimilarPlayers';
import { ElitePlayerCard } from './ElitePlayerCard';
import * as api from '../lib/api';
import { useInteractionStatus } from '../hooks/useInteractionStatus';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';
import { useToast } from '../contexts/ToastContext';
import { calculateAge } from '../lib/helpers';
import { getCountryFlag, getCountryNameOnly } from '../lib/countries';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from './ui/alert-dialog';

// --- Sub-Component: Video Tile ---
const VideoTile = React.memo(({ video, onClick, isOwnProfile, onDelete }) => {
    const { ref, isIntersecting } = useIntersectionObserver({ threshold: 0.1, rootMargin: '200px' });
    const [loaded, setLoaded] = useState(false);

    return (
        <div ref={ref} onClick={() => onClick(video)} className="aspect-[3/4] bg-slate-200 dark:bg-slate-800 relative cursor-pointer group overflow-hidden rounded shadow-sm">
            {isIntersecting || loaded ? (
                <>
                    <video
                        src={video.video_url}
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition duration-500"
                        preload="none"
                        poster={video.thumbnail_url}
                        onLoadedData={() => setLoaded(true)}
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-2 left-2 text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        <Play size={8} fill="currentColor" /> {video.likes_count || 0}
                    </div>
                    {video.skill_tags && video.skill_tags.length > 0 && (
                        <div className="absolute top-2 left-2 flex flex-wrap gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {video.skill_tags.slice(0, 2).map(tag => (
                                <span key={tag} className="bg-cyan-600/80 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">{tag}</span>
                            ))}
                        </div>
                    )}
                    {isOwnProfile && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <motion.button
                                    onClick={(e) => e.stopPropagation()}
                                    whileHover={{ rotate: [0, -10, 10, -10, 10, 0] }}
                                    transition={{ duration: 0.5 }}
                                    className="absolute top-2 right-2 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all z-10 bg-black/60 backdrop-blur-sm text-zinc-300 hover:bg-red-600 hover:text-white"
                                >
                                    <Trash2 size={14} />
                                </motion.button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-slate-900 border-slate-800" onClick={(e) => e.stopPropagation()}>
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-white">Highlight wirklich löschen?</AlertDialogTitle>
                                    <AlertDialogDescription className="text-slate-400">
                                        Diese Aktion kann nicht rückgängig gemacht werden. Dein Highlight wird dauerhaft entfernt.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel className="bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700">Abbrechen</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={(e) => { e.stopPropagation(); onDelete(video); }}
                                        className="bg-red-600 text-white hover:bg-red-700 border-none"
                                    >
                                        Löschen
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                </>
            ) : (
                <div className="w-full h-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
            )}
        </div>
    );
});

export const ProfileScreen = ({
    profile,
    highlights = [],
    onVideoClick,
    onDeleteVideo,
    isOwnProfile,
    onBack,
    onLogout,
    onEditReq,
    onSettingsReq,
    onChatReq,
    onClubClick,
    onAdminReq,
    onFollow,
    onShowFollowers,
    onShowFollowing,
    onLoginReq,
    onWatchlistToggle,
    isOnWatchlist,
    session,
    currentUserProfile,
    onCompare,
    onPlayerClick,
    onReport,
    onBlock,
    onUpload
}) => {
    const [activeTab, setActiveTab] = useState('highlights');
    const [showPlayerCard, setShowPlayerCard] = useState(false);
    const { addToast } = useToast();
    
    // Hooks for following/follower counts and status
    const { 
        status: isFollowing, 
        count: followersCount, 
        toggle: toggleFollow 
    } = useInteractionStatus({
        type: 'user_follow',
        targetId: profile.id,
        session,
        initialCount: profile.followers_count || 0,
        initialStatus: profile.isFollowing || false
    });

    const [followingCount, setFollowingCount] = useState(profile.following_count || 0);
    const [playerStats, setPlayerStats] = useState(null);
    const [skillEndorsements, setSkillEndorsements] = useState([]);
    const [viewCount, setViewCount] = useState(0);

    useEffect(() => {
        if (profile?.id) {
            loadPlayerDetails();
            incrementViewCount();
        }
    }, [profile?.id]);

    const loadPlayerDetails = async () => {
        try {
            const [statsData, endorsementsData] = await Promise.all([
                api.getPlayerStats(profile.id),
                api.getSkillEndorsements(profile.id)
            ]);
            setPlayerStats(statsData);
            setSkillEndorsements(endorsementsData);
        } catch (err) {
            console.error("Error loading player details:", err);
        }
    };

    const incrementViewCount = async () => {
        try {
            const count = await api.incrementProfileViews(profile.id);
            setViewCount(count);
        } catch (err) {
            console.error("Error incrementing views:", err);
        }
    };

    const handleFollowClick = async () => {
        if (!session) { onLoginReq(); return; }
        try {
            await toggleFollow();
        } catch (err) {
            addToast(err?.message || "Aktion fehlgeschlagen", "error");
        }
    };

    const handleEndorseSkill = async (skillName) => {
        if (!session) {
            onLoginReq();
            return;
        }
        try {
            await api.endorseSkill(profile.id, skillName);
            const endorsementsData = await api.getSkillEndorsements(profile.id);
            setSkillEndorsements(endorsementsData);
            addToast(`Skill "${skillName}" bestätigt!`, "success");
        } catch (err) {
            console.error("Error endorsing skill:", err);
            addToast("Skill konnte nicht bestätigt werden", "error");
        }
    };

    const handleShare = () => {
        const url = window.location.href;
        if (navigator.share) {
            navigator.share({
                title: `${profile.full_name} auf Cavio`,
                url: url
            });
        } else {
            navigator.clipboard.writeText(url);
            addToast("Profil-Link kopiert!", "success");
        }
    };

    if (!profile) return null;

    const avgRating = playerStats ? 
        Object.values(playerStats).reduce((a, b) => a + (b || 0), 0) / 6 : 0;

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 animate-in fade-in duration-500">
            {/* Header / Cover */}
            <div className="relative h-48 bg-gradient-to-br from-indigo-900 via-slate-900 to-black overflow-hidden">
                <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent" />
                
                {/* Back Button */}
                {!isOwnProfile && (
                    <button onClick={onBack} className="absolute top-6 left-4 z-20 p-2.5 bg-black/30 backdrop-blur-md rounded-full text-white border border-white/10 hover:bg-black/50 transition">
                        <ArrowLeftRight size={20} className="rotate-90 md:rotate-0" />
                    </button>
                )}

                {/* Cover Action Buttons */}
                <div className="absolute top-6 right-4 z-20 flex gap-2">
                    {isOwnProfile && (
                        <button onClick={onSettingsReq} className="p-2.5 bg-black/30 backdrop-blur-md rounded-full text-white border border-white/10 hover:bg-black/50 transition">
                            <Database size={18} />
                        </button>
                    )}
                    <button onClick={handleShare} className="p-2.5 bg-black/30 backdrop-blur-md rounded-full text-white border border-white/10 hover:bg-black/50 transition">
                        <Share2 size={18} />
                    </button>
                </div>
            </div>

            {/* Profile Info Card Overlay */}
            <div className="px-4 -mt-20 relative z-10 space-y-4">
                <div className="bg-white dark:bg-slate-900/90 backdrop-blur-2xl rounded-3xl p-6 shadow-2xl border border-white/10 flex flex-col items-center">
                    {/* Profile Image & Role Badge */}
                    <div className="relative mb-4">
                        <div className="w-32 h-32 rounded-full border-4 border-white dark:border-slate-800 p-1 bg-gradient-to-tr from-cyan-500 to-indigo-500 overflow-hidden shadow-xl">
                            <img 
                                src={profile.profile_image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name || 'User')}&background=random&size=128`} 
                                alt={profile.full_name}
                                className="w-full h-full object-cover rounded-full"
                            />
                        </div>
                        {profile.is_verified && (
                            <div className="absolute bottom-1 right-1 bg-white dark:bg-slate-900 p-1.5 rounded-full shadow-lg border border-border">
                                <CheckCircle size={20} className="text-amber-500 fill-amber-500/10" />
                            </div>
                        )}
                        <div className="absolute -top-1 -left-1 bg-gradient-to-r from-cyan-600 to-indigo-600 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-lg border border-white/20 tracking-widest">
                            {profile.role || 'Spieler'}
                        </div>
                    </div>

                    {/* Name & Basic Info */}
                    <div className="text-center space-y-1 mb-6 w-full">
                        <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center justify-center gap-2">
                            {profile.full_name || 'Neuer Nutzer'}
                        </h1>
                        <div className="flex items-center justify-center gap-2 flex-wrap text-sm text-muted-foreground font-medium">
                            {profile.clubs?.name && (
                                <span className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-lg">
                                    <Trophy size={14} className="text-amber-500" /> {profile.clubs.name}
                                </span>
                            )}
                            {profile.city && (
                                <span className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-lg">
                                    <MapPin size={14} className="text-cyan-500" /> {profile.city}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className={`grid ${isOwnProfile ? 'grid-cols-4' : 'grid-cols-3'} gap-2 w-full mb-5`}>
                        <div onClick={onShowFollowing} className="col-span-1 relative bg-white dark:bg-slate-950 border border-border shadow-sm rounded-xl p-2 flex flex-col items-center justify-center group hover:border-cyan-400/50 transition cursor-pointer h-[90px]">
                            <UserPlus size={22} className="text-cyan-500 mb-1" />
                            <span className="text-xl font-black text-foreground leading-none">{followingCount}</span>
                            <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest mt-0.5">Folgt</span>
                        </div>

                        <div onClick={onShowFollowers} className="col-span-1 relative bg-white dark:bg-slate-950 border border-border shadow-sm rounded-xl p-2 flex flex-col items-center justify-center group hover:border-cyan-400/50 transition cursor-pointer h-[90px]">
                            <Users size={22} className="text-cyan-500 mb-1" />
                            <span className="text-xl font-black text-foreground leading-none">{followersCount}</span>
                            <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest mt-0.5">Follower</span>
                        </div>

                        <div className="col-span-1 bg-white dark:bg-slate-950 border border-border shadow-sm rounded-xl p-2 flex flex-col items-center justify-center h-[90px]">
                            <Video size={22} className="text-cyan-500 mb-1" />
                            <span className="text-xl font-black text-foreground leading-none">{highlights.length}</span>
                            <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest mt-0.5">Clips</span>
                        </div>

                        {isOwnProfile && (
                            <div className="col-span-1 bg-white dark:bg-slate-950 border border-border shadow-sm rounded-xl p-2 flex flex-col items-center justify-center h-[90px]">
                                <Eye size={22} className="text-cyan-500 mb-1" />
                                <span className="text-xl font-black text-foreground leading-none">{viewCount}</span>
                                <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest mt-0.5">Views</span>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="w-full flex gap-2 items-center">
                        {isOwnProfile ? (
                            <>
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onEditReq} className="flex-1 bg-slate-100 dark:bg-slate-800 text-foreground font-bold py-2.5 rounded-xl border border-border hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center justify-center gap-2 text-sm">
                                    <Edit size={16} /> Profil bearbeiten
                                </motion.button>
                                <button onClick={handleShare} className="flex-none bg-slate-100 dark:bg-slate-800 text-foreground p-2.5 rounded-xl border border-border hover:bg-slate-200 transition">
                                    <Share2 size={18} />
                                </button>
                                {profile.role === 'admin' && <button onClick={onAdminReq} className="flex-none bg-cyan-900/30 text-cyan-400 p-2.5 rounded-xl border border-cyan-500/30"><Database size={18} /></button>}
                            </>
                        ) : (
                            <>
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleFollowClick} className={`flex-1 ${isFollowing ? 'bg-slate-100 dark:bg-slate-800 text-foreground' : 'bg-cyan-600 text-white border-cyan-500 shadow-lg shadow-cyan-500/20'} border py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2`}>
                                    {isFollowing ? <UserCheck size={16} /> : <UserPlus size={16} />}
                                    {isFollowing ? 'Gefolgt' : 'Folgen'}
                                </motion.button>
                                <button onClick={onChatReq} className="flex-none bg-slate-100 dark:bg-slate-800 text-foreground px-4 py-2.5 rounded-xl border border-border hover:bg-opacity-80 transition">
                                    <MessageCircle size={18} />
                                </button>
                                {session && onWatchlistToggle && (
                                    <button onClick={onWatchlistToggle} className={`flex-none p-2.5 rounded-xl border transition ${isOnWatchlist ? 'bg-cyan-600/20 text-cyan-400 border-cyan-500/30' : 'bg-slate-100 dark:bg-slate-800 border-border'}`}>
                                        {isOnWatchlist ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Social Links Row */}
            <div className="flex justify-center gap-6 py-4 border-b border-border">
                {profile.instagram_handle ? <a href={`https://instagram.com/${profile.instagram_handle}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-pink-500 transition"><Instagram size={20} /></a> : <Instagram size={20} className="text-muted-foreground/40" />}
                {profile.tiktok_handle ? <a href={`https://tiktok.com/@${profile.tiktok_handle}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground transition"><Video size={20} /></a> : <Video size={20} className="text-muted-foreground/40" />}
                {profile.youtube_handle ? <a href={`https://youtube.com/@${profile.youtube_handle}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-red-500 transition"><Youtube size={20} /></a> : <Youtube size={20} className="text-muted-foreground/40" />}
            </div>

            {/* Scout Rating UI */}
            {!isOwnProfile && session && (
                <div className="px-4 py-3 border-b border-border">
                    <PlayerRating playerId={profile.id} session={session} />
                </div>
            )}

            {/* Pro-Readiness Card */}
            {isOwnProfile && (
                <ProReadinessCard profile={profile} highlights={highlights} onEditProfile={onEditReq} />
            )}

            {/* Content Tabs Section */}
            <ProfileTabs 
                profile={profile} 
                highlights={highlights} 
                onVideoClick={onVideoClick} 
                isOwnProfile={isOwnProfile} 
                onDeleteVideo={onDeleteVideo} 
                onUpload={onUpload} 
                session={session} 
                currentUserProfile={currentUserProfile} 
                playerStats={playerStats} 
                skillEndorsements={skillEndorsements} 
                onEndorseSkill={handleEndorseSkill} 
            />

            {/* Footer / Similar Players */}
            {!isOwnProfile && onPlayerClick && (
                <SimilarPlayers profile={profile} onUserClick={onPlayerClick} />
            )}

            {/* Elite Player Card Modal */}
            {showPlayerCard && (
                <ElitePlayerCard profile={profile} avgRating={avgRating} highlights={highlights} onClose={() => setShowPlayerCard(false)} />
            )}
        </div>
    );
};

// --- Sub-Component: Profile Tabs ---
const ProfileTabs = ({ 
    profile, highlights, onVideoClick, isOwnProfile, 
    onDeleteVideo, onUpload, session, currentUserProfile, 
    playerStats, skillEndorsements, onEndorseSkill 
}) => {
    const [activeTab, setActiveTab] = useState('highlights');

    const TabBtn = ({ id, label }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`pb-2 text-sm font-bold transition ${activeTab === id ? 'text-foreground border-b-2 border-cyan-500' : 'text-muted-foreground hover:text-foreground/70'}`}
        >
            {label}
        </button>
    );

    return (
        <>
            <div className="flex px-4 pt-4 pb-2 gap-6 border-b border-border sticky top-0 z-40 bg-slate-50/90 dark:bg-slate-950/80 backdrop-blur-md">
                <TabBtn id="highlights" label="Highlights" />
                <TabBtn id="stats" label={profile.role === 'scout' ? 'Visitenkarte' : 'Stats'} />
                <TabBtn id="karriere" label="Karriere" />
                <TabBtn id="about" label="Über" />
            </div>

            {/* TAB: Highlights */}
            {activeTab === 'highlights' && (
                <>
                    <div className="grid grid-cols-3 gap-0.5 mt-0.5">
                        <AnimatePresence>
                            {highlights.map(v => (
                                <motion.div
                                    key={v.id}
                                    layout
                                    exit={{ opacity: 0, scale: 0.8, height: 0 }}
                                    transition={{ duration: 0.3, ease: 'easeOut' }}
                                >
                                    <VideoTile video={v} onClick={onVideoClick} isOwnProfile={isOwnProfile} onDelete={onDeleteVideo} />
                                </motion.div>
                            ))}
                        </AnimatePresence>
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
                    {profile.role === 'scout' ? (
                        <>
                            {/* SCOUT BUSINESS CARD */}
                            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-amber-500/20 rounded-2xl p-6 shadow-2xl">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.08)_0%,transparent_60%)]" />
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-2 bg-amber-500/15 rounded-xl border border-amber-500/20">
                                            <Briefcase size={18} className="text-amber-400" />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-foreground text-base tracking-tight">Visitenkarte</h3>
                                            <p className="text-[10px] text-amber-400/70 uppercase font-bold tracking-widest">Scout Profil</p>
                                        </div>
                                    </div>
                                    {profile.club_affiliation && (
                                        <div className="mb-4">
                                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block mb-1">Bezeichnung</span>
                                            <span className="text-lg font-black text-amber-400">{profile.club_affiliation}</span>
                                        </div>
                                    )}
                                    {profile.preferred_system && (
                                        <div className="mb-4">
                                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block mb-1">Suchradius</span>
                                            <div className="flex items-center gap-2">
                                                <Globe size={16} className="text-emerald-400" />
                                                <span className="text-sm font-bold text-foreground">{profile.preferred_system}</span>
                                            </div>
                                        </div>
                                    )}
                                    {profile.tactical_identity?.length > 0 && (
                                        <div className="mb-4">
                                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block mb-2">Fokus-Altersklassen</span>
                                            <div className="flex flex-wrap gap-2">
                                                {profile.tactical_identity.map(age => (
                                                    <span key={age} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold">
                                                        <Target size={12} /> {age}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {profile.specializations?.length > 0 && (
                                        <div>
                                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block mb-2">Expertise & Services</span>
                                            <div className="flex flex-wrap gap-2">
                                                {profile.specializations.map(skill => (
                                                    <span key={skill} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-bold">
                                                        ⚡ {skill}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* PLAYER / COACH STATS */}
                            <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl p-5 space-y-4 shadow-sm">
                                <h3 className="font-['Montserrat'] font-bold text-foreground text-lg tracking-tight uppercase border-b border-border pb-2">Kader-Basisdaten</h3>
                                <div className="grid grid-cols-2 gap-3 pb-3">
                                    <StatCard label="Position" value={profile?.position_primary || '-'} sub={profile?.position_secondary ? `Neben: ${profile.position_secondary}` : null} />
                                    <StatCard label="Starker Fuß" value={profile?.strong_foot || '-'} />
                                    <StatCard label="Größe" value={profile?.height_user ? `${profile.height_user} cm` : '-'} isVerified={profile?.is_verified} />
                                    <StatCard label="Gewicht" value={profile?.weight ? `${profile.weight} kg` : '-'} isVerified={profile?.is_verified} />
                                    <StatCard label="Trikotnummer" value={profile?.jersey_number ? `#${profile.jersey_number}` : '-'} />
                                    <StatCard label="Alter" value={profile?.birth_date ? `${calculateAge(profile.birth_date)} Jahre` : '-'} isVerified={profile?.is_verified} />
                                </div>
                                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
                                    <StatCard label="Transfer-Status" value={profile?.transfer_status || '-'} highlight={profile?.transfer_status === 'Suche Verein'} />
                                    <StatCard label="Vertrag bis" value={profile?.contract_end ? new Date(profile.contract_end).toLocaleDateString('de-DE', { month: 'short', year: 'numeric' }) : '-'} />
                                </div>
                            </div>

                            {/* Taktische DNA */}
                            <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl p-5 shadow-sm mt-4">
                                <h3 className="font-['Montserrat'] font-bold text-foreground text-lg tracking-tight uppercase border-b border-border pb-2 mb-4">Taktische DNA</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block mb-1">Bevorzugtes System</span>
                                        <span className="text-sm font-medium text-foreground">{profile?.preferred_system || 'Nicht angegeben'}</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Bevorzugte Rolle</span>
                                        <span className="text-sm font-medium text-foreground">{profile?.tactical_role || 'Nicht angegeben'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Spieler-Attribute */}
                            <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl p-5 shadow-sm mt-4">
                                <h3 className="font-['Montserrat'] font-bold text-foreground text-lg tracking-tight uppercase border-b border-border pb-2 mb-4">Spieler-Attribute</h3>
                                {!playerStats ? (
                                    <div className="flex justify-center items-center py-6"><Loader2 size={24} className="text-muted-foreground animate-spin" /></div>
                                ) : (
                                    <div className="space-y-4">
                                        {[
                                            { label: 'PAC', value: playerStats.pace },
                                            { label: 'SHO', value: playerStats.shooting },
                                            { label: 'PAS', value: playerStats.passing },
                                            { label: 'DRI', value: playerStats.dribbling },
                                            { label: 'DEF', value: playerStats.defending },
                                            { label: 'PHY', value: playerStats.physical },
                                        ].map((attr) => {
                                            const skillCount = (skillEndorsements || []).filter(e => e.skill_name === attr.label).length;
                                            const hasEndorsedSkill = session && (skillEndorsements || []).some(e => e.skill_name === attr.label && e.sender_id === session?.user?.id);
                                            const canEndorse = session && currentUserProfile && (currentUserProfile.role === 'scout' || currentUserProfile.role === 'coach') && !isOwnProfile;

                                            return (
                                                <div key={attr.label} className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-muted-foreground w-8">{attr.label}</span>
                                                    <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                        <motion.div initial={{ width: 0 }} animate={{ width: `${attr.value || 0}%` }} transition={{ duration: 0.8, ease: "easeOut" }} className="h-full bg-cyan-500 rounded-full" />
                                                    </div>
                                                    <span className="text-sm font-bold text-foreground w-6 text-right">{attr.value || '0'}</span>
                                                    <div className="flex items-center gap-1 w-10 justify-end">
                                                        {skillCount > 0 && <span className="text-[10px] font-bold text-emerald-500">{skillCount}</span>}
                                                        {canEndorse ? (
                                                            <button onClick={() => onEndorseSkill?.(attr.label)} className={`p-1 rounded-full transition ${hasEndorsedSkill ? 'text-emerald-500 bg-emerald-500/10' : 'text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10'}`}><ShieldCheck size={14} /></button>
                                                        ) : (
                                                            skillCount > 0 ? <ShieldCheck size={14} className="text-emerald-500/50" /> : <div className="w-[22px]" />
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {session && !isOwnProfile && profile?.id && (
                                            <div className="pt-4 border-t border-border mt-6">
                                                <RadarChart playerId={profile.id} session={session} isOwnProfile={isOwnProfile} onlyRatingUI />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* TAB: Karriere */}
            {activeTab === 'karriere' && (
                <CareerTimeline userId={profile.user_id} />
            )}

            {/* TAB: Über */}
            {activeTab === 'about' && (
                <div className="px-4 py-6 space-y-6 animate-in fade-in">
                    {profile.bio && (
                        <div>
                            <h4 className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-2">Über mich</h4>
                            <p className="text-foreground/80 text-sm leading-relaxed bg-slate-100 dark:bg-slate-900 p-4 rounded-xl border border-border">{profile.bio}</p>
                        </div>
                    )}
                    <div>
                        <h4 className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-3">Persönliche Daten</h4>
                        <div className="space-y-2">
                            {profile.birth_date && <InfoRow icon="📅" label="Geburtsdatum" value={new Date(profile.birth_date).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })} />}
                            {profile.nationality && <InfoRow icon={getCountryFlag(profile.nationality)} label="Nationalität" value={getCountryNameOnly(profile.nationality)} />}
                            {(profile.city || profile.zip_code) && <InfoRow icon="📍" label="Standort" value={[profile.zip_code, profile.city].filter(Boolean).join(' ')} />}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

// --- Sub-Component: Stat Card ---
const StatCard = ({ label, value, sub, highlight, small, isVerified }) => (
    <motion.div whileHover={{ scale: 1.03 }} className={`bg-slate-50 dark:bg-slate-900/50 border border-border rounded-xl p-3 flex flex-col items-center text-center ${highlight ? 'border-cyan-500/30 bg-cyan-500/5' : ''}`}>
        <div className={`font-black flex items-center justify-center gap-1 ${small ? 'text-xs' : 'text-lg'} ${isVerified ? 'text-amber-500' : 'text-foreground'}`}>
            {value}
            {isVerified && <CheckCircle size={10} className="text-amber-500" />}
        </div>
        <div className="text-[10px] text-muted-foreground uppercase font-bold mt-1">{label}</div>
        {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
    </motion.div>
);

// --- Sub-Component: Info Row ---
const InfoRow = ({ icon, label, value }) => (
    <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-border">
        <span className="text-lg">{icon}</span>
        <div>
            <div className="text-[10px] text-muted-foreground uppercase font-bold">{label}</div>
            <div className="text-sm text-foreground">{value}</div>
        </div>
    </div>
);
