import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Loader2, User, ArrowLeft, Settings, Edit, Share2, MessageCircle,
    Plus, Check, Crown, Shield, Instagram, Video, Youtube, Play, Database, Bookmark, BookmarkCheck, Trash2, ArrowLeftRight, MoreVertical, Flag, ShieldOff, Eye, CheckCircle, Users, ShieldCheck, Briefcase, Target, Radar, Globe, UserPlus, UserCheck
} from 'lucide-react';
import { VerificationBadge } from './VerificationBadge';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { calculateAge } from '../lib/helpers';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';
import { ProfileSkeleton } from './SkeletonScreens';
import { PlayerRating } from './PlayerRating';
import { SimilarPlayers } from './SimilarPlayers';
import { ProReadinessCard } from './ProReadinessCard';
import { EmptyState } from './EmptyState';
import { ElitePlayerCard } from './ElitePlayerCard';
import { RadarChart } from './RadarChart';
import { XPLevelBadge } from './XPLevelBadge';
import { CareerTimeline } from './CareerTimeline';
import * as api from '../lib/api';
import { useInteractionStatus } from '../hooks/useInteractionStatus';
import { getBadgeById, getBadgeColors } from '../lib/badges';

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

// Lazy-loaded video tile for profile grid
const VideoTile = React.memo(({ video, onClick, isOwnProfile, onDelete }) => {
    const { ref, isIntersecting } = useIntersectionObserver({ threshold: 0.1, rootMargin: '200px' });
    const [loaded, setLoaded] = useState(false);

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
                    <div className="absolute bottom-2 left-2 text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"><Play size={8} fill="currentColor" /> {video.likes_count}</div>
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
                            <AlertDialogContent className="bg-zinc-900 border-zinc-800" onClick={(e) => e.stopPropagation()}>
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-foreground">Highlight wirklich löschen?</AlertDialogTitle>
                                    <AlertDialogDescription className="text-muted-foreground">
                                        Diese Aktion kann nicht rückgängig gemacht werden. Dein Highlight wird dauerhaft entfernt.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel className="bg-muted text-muted-foreground border-border hover:bg-muted/80 hover:text-foreground">Abbrechen</AlertDialogCancel>
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
                <div className="w-full h-full bg-muted animate-pulse" />
            )}
        </div>
    );
});

export const ProfileScreen = ({ profile, highlights, onVideoClick, onDeleteVideo, isOwnProfile, onBack, onLogout, onEditReq, onChatReq, onSettingsReq, onFollow, onShowFollowers, onShowFollowing, onLoginReq, onClubClick, onAdminReq, onWatchlistToggle, isOnWatchlist, session, currentUserProfile, onCompare, onPlayerClick, onReport, onBlock, onUpload }) => {
    const { status: isFollowing, count: followersCount, toggle: toggleFollow } = useInteractionStatus({
        type: 'user_follow',
        targetId: profile.id,
        session,
        initialCount: profile.followers_count || 0,
        initialStatus: profile.isFollowing || false
    });

    const [followingCount, setFollowingCount] = useState(profile.following_count || 0);

    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showPlayerCard, setShowPlayerCard] = useState(false);
    const [viewCount, setViewCount] = useState(0);
    const [avgRating, setAvgRating] = useState(0);
    const [playerStats, setPlayerStats] = useState(null);
    const [skillEndorsements, setSkillEndorsements] = useState([]);
    const { addToast } = useToast();

    // Internal handle follow
    const handleFollowClick = async () => {
        if (!session) { onLoginReq(); return; }
        try {
            await toggleFollow();
        } catch (err) {
            addToast(err?.message || "Aktion fehlgeschlagen", "error");
        }
    };

    const handleShare = async () => {
        const url = window.location.href;
        if (navigator.share) {
            try { await navigator.share({ title: 'Cavio Profil', url }); } 
            catch (err) { console.log("Share abgebrochen", err); }
        } else {
            navigator.clipboard.writeText(url);
            addToast("Profil-Link in die Zwischenablage kopiert!", "success");
        }
    };

    useEffect(() => {
        if (!profile?.id) return;
        if (isOwnProfile) {
            api.getProfileViewCount(profile.id).then(setViewCount);
        }
        // Safe fetch for FIFA card avgRating
        const loadAvgRating = async () => {
            try {
                const { data } = await supabase.from('player_ratings').select('rating').eq('player_id', profile.id);
                if (data && data.length > 0) {
                    setAvgRating(Math.round(data.reduce((s, r) => s + r.rating, 0) / data.length * 10) / 10);
                }
            } catch (e) {
                console.warn('Silent fail for average rating:', e);
            }
        };
        loadAvgRating();

        // Safe fetch for safe progress-bar attributes
        const loadAttributes = async () => {
            try {
                const { data } = await supabase.from('player_attributes').select('*').eq('player_id', profile.id);
                if (data && data.length > 0) {
                    // Calc averages across all raters
                    const attrsList = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical'];
                    const avgs = {};
                    attrsList.forEach(k => {
                        const sum = data.reduce((s, r) => s + (r[k] || 50), 0);
                        avgs[k] = Math.round(sum / data.length);
                    });
                    setPlayerStats({
                        pace: avgs.pace,
                        shooting: avgs.shooting,
                        passing: avgs.passing,
                        dribbling: avgs.dribbling,
                        defending: avgs.defending,
                        physical: avgs.physical
                    });
                } else {
                    setPlayerStats({ pace: 50, shooting: 50, passing: 50, dribbling: 50, defending: 50, physical: 50 }); // Safe defaults if zero ratings
                }
            } catch (e) {
                console.warn('Silent fail for attributes:', e);
                setPlayerStats({ pace: 50, shooting: 50, passing: 50, dribbling: 50, defending: 50, physical: 50 });
            }
        };
        loadAttributes();

        // Fetch specific skill endorsements
        if (profile?.user_id) {
            supabase.from('endorsements')
                .select('id, sender_id, skill_name')
                .eq('receiver_id', profile.user_id)
                .then(({ data }) => setSkillEndorsements(data || []));
        }
    }, [profile?.id, profile?.user_id, isOwnProfile, session?.user?.id]);

    const handleEndorseSkill = async (skillName) => {
        if (!session?.user?.id || !profile?.user_id) return;
        
        // Optimistic UI update
        const existing = skillEndorsements.find(e => e.skill_name === skillName && e.sender_id === session.user.id);
        
        if (existing) {
            setSkillEndorsements(prev => prev.filter(e => e.id !== existing.id));
            try {
                await supabase.from('endorsements').delete().eq('id', existing.id);
            } catch (e) {
                setSkillEndorsements(prev => [...prev, existing]); // Revert on fail
                addToast("Fehler beim Entfernen der Bestätigung", 'error');
            }
        } else {
            const tempId = `temp-${Date.now()}`;
            const newEndorsement = { id: tempId, sender_id: session.user.id, receiver_id: profile.user_id, skill_name: skillName };
            setSkillEndorsements(prev => [...prev, newEndorsement]);
            try {
                const { data, error } = await supabase.from('endorsements').insert({
                    sender_id: session.user.id,
                    receiver_id: profile.user_id,
                    skill_name: skillName
                }).select().single();
                
                if (error) throw error;
                // Replace temp ID with real ID
                setSkillEndorsements(prev => prev.map(e => e.id === tempId ? data : e));
                
                // Erstelle die Notifikation
                try {
                    await supabase.from('notifications').insert({
                        actor_id: session.user.id,
                        receiver_id: profile.user_id,
                        type: 'endorse',
                        metadata: { skill: skillName },
                        message: `Hat dein ${skillName} verifiziert`
                    });
                } catch(e) {
                    console.warn('Silent fail for endorsement notification:', e);
                }
            } catch (e) {
                setSkillEndorsements(prev => prev.filter(e => e.id !== tempId)); // Revert on fail
                addToast("Bestätigung fehlgeschlagen", 'error');
            }
        }
    };

    if (isOwnProfile && !profile) return <ProfileSkeleton />;
    if (!profile) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Profil nicht gefunden.</div>;

    const statusColors = {
        'Gebunden': 'bg-red-500 shadow-red-500/50',
        'Vertrag läuft aus': 'bg-cyan-500 shadow-cyan-500/50',
        'Suche Verein': 'bg-cyan-500 shadow-cyan-500/50'
    };
    const statusTextClass = profile.transfer_status === 'Suche Verein' ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' : profile.transfer_status === 'Vertrag läuft aus' ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20';

    return (
        <div className="min-h-screen pb-32 animate-in fade-in">
            <div className="relative bg-card pb-6 rounded-b-[2rem] shadow-2xl border-b border-border">
                <div className="absolute inset-0 h-40 bg-gradient-to-br from-cyan-900/30 via-slate-900/20 to-background pointer-events-none"></div>

                {/* Nav */}
                <div className="pt-6 px-6 flex justify-between items-center relative z-10">
                    {!isOwnProfile ? <button onClick={onBack} className="p-2 bg-black/40 backdrop-blur-md rounded-full text-white border border-border"><ArrowLeft size={20} /></button> : <div></div>}
                    <div className="flex items-center gap-2">
                        {!isOwnProfile && (
                            <div className="relative">
                                <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="p-2 bg-black/40 backdrop-blur-md rounded-full text-white border border-border">
                                    < MoreVertical size={20} />
                                </button>
                                {showProfileMenu && (
                                    <div className="absolute right-0 top-full mt-1 bg-white dark:bg-zinc-800 border border-border rounded-xl shadow-2xl overflow-hidden min-w-[180px] animate-in fade-in slide-in-from-top-2 z-20">
                                        <button onClick={() => { setShowProfileMenu(false); onReport?.({ id: profile.user_id, type: 'user' }); }} className="w-full px-4 py-3 flex items-center gap-3 text-sm text-foreground/80 hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground transition">
                                            <Flag size={16} className="text-cyan-400" /> Nutzer melden
                                        </button>
                                        <button onClick={() => { setShowProfileMenu(false); onBlock?.(profile); }} className="w-full px-4 py-3 flex items-center gap-3 text-sm text-red-500 hover:bg-red-500/10 hover:text-red-400 transition border-t border-border">
                                            <ShieldOff size={16} /> Nutzer blockieren
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                        {isOwnProfile && <button onClick={onSettingsReq} className="p-2 bg-black/40 backdrop-blur-md rounded-full text-white border border-border"><Settings size={20} /></button>}
                    </div>
                </div>

                <div className="flex flex-col items-center pt-2 relative z-10 px-4">
                    {/* Avatar */}
                    <div className="relative mb-2 group mt-2">
                        <div className="absolute -inset-1 rounded-full blur-md opacity-40 bg-gradient-to-tr from-cyan-500 to-cyan-700"></div>
                        <div className="relative w-24 h-24 rounded-full bg-card overflow-hidden border-2 border-slate-800 shadow-xl">
                            {profile.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" /> : <User size={40} className="text-muted-foreground m-5" />}
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-2 w-full mb-5">
                        {/* Name & Badges Container */}
                        <div className="flex flex-col items-center justify-center gap-1 mt-2">
                            <div className="flex flex-row items-center justify-center gap-2 flex-wrap text-center">
                                <h1 className="text-xl font-bold text-foreground text-center leading-snug">{profile.full_name}</h1>
                                {profile.verification_status && profile.verification_status !== 'unverified' && <VerificationBadge size={18} status={profile.verification_status} verificationStatus={profile.verification_status} />}
                                {profile.role === 'admin' && <Database size={18} className="text-cyan-500 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)] flex-shrink-0" title="Admin" />}
                            </div>
                            {profile.username && (
                                <div className="flex items-center gap-2">
                                    <p className="text-muted-foreground text-sm font-medium">@{profile.username}</p>
                                    {!isOwnProfile && profile.followsMe && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-secondary text-secondary-foreground">Folgt dir</span>
                                    )}
                                </div>
                            )}
                            <XPLevelBadge playerId={profile.id} compact />

                            {/* Signature Badges */}
                            {profile.signature_badges && profile.signature_badges.length > 0 && (
                                <div className="flex items-center gap-2 mt-2">
                                    {profile.signature_badges.map(badgeId => {
                                        const badge = getBadgeById(badgeId);
                                        if (!badge) return null;
                                        const colors = getBadgeColors(badge);
                                        const Icon = badge.icon;
                                        return (
                                            <div
                                                key={badgeId}
                                                className={`relative flex flex-col items-center px-3 py-2 rounded-xl bg-white/5 dark:bg-white/5 backdrop-blur-lg border ${colors.border} shadow-lg ${colors.glow} transition-all hover:scale-105`}
                                                title={badge.description}
                                            >
                                                <Icon size={18} className={colors.text} />
                                                <span className={`text-[9px] font-bold mt-1 ${colors.text} uppercase tracking-wider whitespace-nowrap`}>{badge.name}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col items-center gap-3">
                            {/* Club & Position / Scout Title */}
                            <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
                                {profile.clubs?.is_icon_league && <Crown size={14} className="text-cyan-400" />}
                                <span onClick={() => profile.clubs && onClubClick(profile.clubs)} className="hover:text-foreground transition cursor-pointer">{profile.clubs?.name || (profile.role === 'scout' ? 'Freiberuflich' : 'Vereinslos')}</span>
                                <span className="w-1 h-1 bg-muted-foreground rounded-full"></span>
                                {profile.role === 'scout' ? (
                                    <span className="text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded text-xs font-bold border border-amber-500/20">
                                        {profile.club_affiliation || 'Scout'}
                                    </span>
                                ) : (
                                    <span className="text-foreground/80 bg-white/10 px-2 py-0.5 rounded text-xs">{profile.position_primary || 'Position n.a.'}</span>
                                )}

                            </div>

                            {/* Transfer Status Pill – only for players */}
                            {profile.player_archetype ? (
                                <div className="text-2xl font-black text-cyan-400 uppercase tracking-tight italic">
                                    {profile.player_archetype}
                                </div>
                            ) : profile.role !== 'scout' && (
                                <div className={`px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wide ${statusTextClass}`}>
                                    {profile.transfer_status}
                                </div>
                            )}

                            {/* Scout Suchradius Pill */}
                            {profile.role === 'scout' && profile.preferred_system && (
                                <div className="px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wide text-emerald-400 bg-emerald-500/10 border-emerald-500/20 flex items-center gap-1.5">
                                    <Globe size={12} /> {profile.preferred_system}
                                </div>
                            )}

                            {/* Mutual Friends / Social Proof */}
                            {!isOwnProfile && profile.mutualFriends && profile.mutualFriends.length > 0 && (
                                <div className="flex items-center justify-center gap-2 mt-1">
                                    <div className="flex -space-x-1.5">
                                        {profile.mutualFriends.slice(0, 3).map((mf) => (
                                            <div key={mf.id} className="w-5 h-5 rounded-full border border-card bg-slate-200 dark:bg-slate-800 overflow-hidden relative z-10 shadow-sm border-[1.5px]">
                                                {mf.avatar_url ? <img src={mf.avatar_url} className="w-full h-full object-cover" /> : <User size={12} className="m-auto mt-0.5 text-slate-500" />}
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[11px] text-muted-foreground font-medium">
                                        Gefolgt von <span className="text-foreground">{profile.mutualFriends[0].full_name}</span>
                                        {profile.mutualFriends.length > 1 && ` und ${profile.mutualFriends.length - 1} weiteren`}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className={`grid ${isOwnProfile ? 'grid-cols-4' : 'grid-cols-3'} gap-2 w-full mb-5`}>
                        {/* Folgt Card (Following Count) */}
                            <UserPlus size={22} strokeWidth={2} className="text-cyan-500 mb-1 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                            <span className="text-xl font-black text-gray-900 dark:text-white z-10 leading-none">{followingCount}</span>

                            <span className="text-[9px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-widest mt-0.5 z-10">Folgt</span>
                        </div>

                        {/* Follower Card */}
                            <Users size={22} strokeWidth={2} className="text-cyan-500 mb-1 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                            <span className="text-xl font-black text-gray-900 dark:text-white z-10 leading-none">{followersCount}</span>

                            <span className="text-[9px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-widest mt-0.5 z-10">Follower</span>
                        </div>

                        {/* Clips Card */}
                        <div className="col-span-1 relative bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 shadow-sm dark:shadow-none rounded-xl p-2 flex flex-col items-center justify-center group hover:border-cyan-400/50 transition-colors overflow-hidden h-[90px]">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(34,211,238,0.08)_0%,transparent_70%)] dark:bg-[radial-gradient(circle_at_bottom,rgba(34,211,238,0.1)_0%,transparent_70%)] opacity-70 group-hover:opacity-100 transition-opacity"></div>
                            <Video size={22} strokeWidth={2} className="text-cyan-500 mb-1 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                            <span className="text-xl font-black text-gray-900 dark:text-white z-10 leading-none">{highlights.length}</span>
                            <span className="text-[9px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-widest mt-0.5 z-10">Clips</span>
                        </div>

                        {/* View Card - only own profile */}
                        {isOwnProfile && (
                            <div className="col-span-1 relative bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 shadow-sm dark:shadow-none rounded-xl p-2 flex flex-col items-center justify-center group hover:border-cyan-400/50 transition-colors overflow-hidden h-[90px]">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(34,211,238,0.08)_0%,transparent_70%)] dark:bg-[radial-gradient(circle_at_bottom,rgba(34,211,238,0.1)_0%,transparent_70%)] opacity-70 group-hover:opacity-100 transition-opacity"></div>
                                <Eye size={22} strokeWidth={2} className="text-cyan-500 mb-1 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                                <span className="text-xl font-black text-gray-900 dark:text-white z-10 leading-none">{viewCount}</span>
                                <span className="text-[9px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-widest mt-0.5 z-10">Views</span>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="w-full flex-row flex flex-nowrap gap-2 items-center">
                        {isOwnProfile ? (
                            <>
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onEditReq} className="flex-1 bg-muted text-foreground font-bold py-2.5 rounded-xl border border-border hover:bg-muted/80 transition flex items-center justify-center gap-2 text-sm">
                                    <Edit size={16} /> Profil bearbeiten
                                </motion.button>
                                <button onClick={handleShare} className="flex-none bg-muted text-foreground p-2.5 rounded-xl border border-border hover:bg-muted/80 transition" title="Profil teilen">
                                    <Share2 size={18} />
                                </button>
                                {profile.role === 'admin' && <button onClick={onAdminReq} className="flex-none bg-cyan-900/30 text-cyan-400 p-2.5 rounded-xl border border-cyan-500/30 hover:bg-cyan-900/50" title="Admin Dashboard"><Database size={18} /></button>}
                            </>
                        ) : (
                            <>
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleFollowClick} className={`flex-1 ${isFollowing ? 'bg-secondary text-secondary-foreground border-border' : 'bg-cyan-600 text-white shadow-[0_0_10px_rgba(34,211,238,0.2)] border-cyan-500'} border py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2`}>
                                    {isFollowing ? <UserCheck size={16} /> : <UserPlus size={16} />}
                                    {isFollowing ? 'Gefolgt' : 'Folgen'}

                                </motion.button>
                                <button onClick={onChatReq} className="flex-none bg-muted text-foreground px-4 py-2.5 rounded-xl border border-border hover:bg-muted/80 transition">
                                    <MessageCircle size={18} />
                                </button>
                                {session && onWatchlistToggle && (
                                    <button onClick={onWatchlistToggle} className={`flex-none p-2.5 rounded-xl border transition ${isOnWatchlist ? 'bg-cyan-600/20 text-cyan-400 border-cyan-500/30' : 'bg-muted text-muted-foreground border-border hover:bg-muted/80 hover:text-foreground'}`}>
                                        {isOnWatchlist ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
                                    </button>
                                )}
                                {/* Compare button */}
                                {session && onCompare && (
                                    <button onClick={onCompare} className="flex-none p-2.5 rounded-xl border border-border bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground transition" title="Vergleichen">
                                        <ArrowLeftRight size={18} />
                                    </button>
                                )}
                                {/* Old Vouch button removed as we now use skill-specific endorsements */}
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

            {/* Scout Rating (non-own profiles) */}
            {!isOwnProfile && session && (
                <div className="px-4 py-3 border-b border-border">
                    <PlayerRating playerId={profile.id} session={session} />
                </div>
            )}

            {/* Gamified Pro-Readiness */}
            {isOwnProfile && (
                <ProReadinessCard profile={profile} highlights={highlights} onEditProfile={onEditReq} />
            )}

            {/* Content Tabs */}
            <ProfileTabs profile={profile} highlights={highlights} onVideoClick={onVideoClick} isOwnProfile={isOwnProfile} onDeleteVideo={onDeleteVideo} onUpload={onUpload} session={session} currentUserProfile={currentUserProfile} playerStats={playerStats} skillEndorsements={skillEndorsements} onEndorseSkill={handleEndorseSkill} />

            {/* Similar Players */}
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

// --- Profile Tabs Component ---
const ProfileTabs = ({ profile, highlights, onVideoClick, isOwnProfile, onDeleteVideo, onUpload, session, currentUserProfile, playerStats, skillEndorsements, onEndorseSkill }) => {
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
                        /* ===== SCOUT VISITENKARTE ===== */
                        <>
                            {/* Scout Business Card */}
                            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-amber-500/20 rounded-2xl p-6 shadow-2xl">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.08)_0%,transparent_60%)]" />
                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-bl-full" />
                                
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

                                    {/* Title */}
                                    {profile.club_affiliation && (
                                        <div className="mb-4">
                                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block mb-1">Bezeichnung</span>
                                            <span className="text-lg font-black text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.3)]">{profile.club_affiliation}</span>
                                        </div>
                                    )}

                                    {/* Radius */}
                                    {profile.preferred_system && (
                                        <div className="mb-4">
                                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block mb-1">Suchradius</span>
                                            <div className="flex items-center gap-2">
                                                <Globe size={16} className="text-emerald-400" />
                                                <span className="text-sm font-bold text-foreground">{profile.preferred_system}</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Focus Age Groups */}
                                    {profile.tactical_identity && profile.tactical_identity.length > 0 && (
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

                                    {/* Expertise & Services */}
                                    {profile.specializations && profile.specializations.length > 0 && (
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

                            {/* Quick Stats */}
                            <div className="grid grid-cols-3 gap-3">
                                <StatCard label="Follower" value={followersCount} />
                                <StatCard label="Clips" value={highlights?.length ?? 0} />
                                <StatCard label="Verein" value={profile?.clubs?.name || (profile.role === 'scout' ? 'Freiberuflich' : 'Vereinslos')} small />

                            </div>
                        </>
                    ) : (
                        /* ===== PLAYER / COACH STATS ===== */
                            <>
                                {/* Basis-Statistiken (Safe) */}
                                <div className="bg-slate-50 dark:bg-white/5 backdrop-blur-xl border border-border rounded-2xl p-5 space-y-4 shadow-sm">
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

                                {/* Taktische DNA Card (Safe API connected) */}
                                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-border rounded-2xl p-5 shadow-sm mt-4">
                                    <h3 className="font-['Montserrat'] font-bold text-foreground text-lg tracking-tight uppercase border-b border-border pb-2 mb-4">
                                        Taktische DNA
                                    </h3>
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

                                {/* Attribute Card (Safe API connected, Progress Bars) */}
                                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-border rounded-2xl p-5 shadow-sm mt-4">
                                    <h3 className="font-['Montserrat'] font-bold text-foreground text-lg tracking-tight uppercase border-b border-border pb-2 mb-4">
                                        Spieler-Attribute
                                    </h3>

                                    {!playerStats ? (
                                        <div className="flex justify-center items-center py-6">
                                            <Loader2 size={24} className="text-muted-foreground animate-spin" />
                                        </div>
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
                                                        <div className="flex-1 h-3 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${attr.value || 0}%` }}
                                                                transition={{ duration: 0.8, ease: "easeOut" }}
                                                                className="h-full bg-cyan-500 rounded-full"
                                                            />
                                                        </div>
                                                        <span className="text-sm font-bold text-foreground w-6 text-right">{attr.value || '0'}</span>
                                                        
                                                        {/* Endorsement UI */}
                                                        <div className="flex items-center gap-1 w-10 justify-end">
                                                            {skillCount > 0 && (
                                                                <span className="text-[10px] font-bold text-emerald-500">{skillCount}</span>
                                                            )}
                                                            {canEndorse ? (
                                                                <button
                                                                    onClick={() => onEndorseSkill?.(attr.label)}
                                                                    className={`p-1 rounded-full transition ${hasEndorsedSkill ? 'text-emerald-500 bg-emerald-500/10' : 'text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10'}`}
                                                                    title="Skill bestätigen"
                                                                >
                                                                    <ShieldCheck size={14} />
                                                                </button>
                                                            ) : (
                                                                skillCount > 0 ? <ShieldCheck size={14} className="text-emerald-500/50" /> : <div className="w-[22px]" />
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {/* Minimalistic Rating Action */}
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

<<<<<<< HEAD
            {/* --- OLD STATS TAB (COMMENTED OUT FOR MOCK-FIRST ISOLATION) --- 
            {activeTab === 'stats' && (
                <div className="px-4 py-6 space-y-4 animate-in fade-in">
                    <motion.div
                        whileHover={{ boxShadow: '0 0 15px rgba(79,70,229,0.3)' }}
                        transition={{ duration: 0.3 }}
                        className="bg-slate-100 dark:bg-slate-900/80 border border-border dark:border-slate-800 rounded-2xl p-5 space-y-3"
                    >
                        <h3 className="font-['Montserrat'] font-bold text-foreground text-lg tracking-tight uppercase">Spielertyp</h3>
                        {player.player_archetype ? (
                            <span className="inline-block text-sm font-bold text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 px-4 py-1.5 rounded-full">
                                {player.player_archetype}
                            </span>
                        ) : (
                            <p className="text-xs text-muted-foreground/60 italic">Spielertyp noch nicht festgelegt.</p>
                        )}
                    </motion.div>

                    <motion.div
                        whileHover={{ boxShadow: '0 0 15px rgba(255,255,255,0.05)' }}
                        transition={{ duration: 0.3 }}
                        className="bg-slate-50 dark:bg-white/5 backdrop-blur-xl border border-border rounded-2xl p-5 space-y-4"
                    >
                        <h3 className="font-['Montserrat'] font-bold text-foreground text-lg tracking-tight uppercase border-b border-border pb-2">Taktische DNA</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block mb-1">Bevorzugtes System</span>
                                <span className="text-sm font-medium text-foreground">{profile?.preferred_system ?? 'Nicht angegeben'}</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block mb-1">Spielerrolle</span>
                                <span className="text-sm font-medium text-foreground">{profile?.tactical_role ?? 'Nicht angegeben'}</span>
                            </div>
                        </div>
                    </motion.div>

                    <div className="bg-slate-50 dark:bg-white/5 backdrop-blur-xl border border-border rounded-2xl p-5 space-y-4">
                        <h3 className="font-['Montserrat'] font-bold text-foreground text-lg tracking-tight uppercase border-b border-border pb-2">Kader-Basisdaten</h3>

                        <div className="grid grid-cols-2 gap-3 pb-3">
                            <StatCard label="Position" value={profile?.position_primary ?? '-'} sub={profile?.position_secondary ? `Neben: ${profile.position_secondary}` : null} />
                            <StatCard label="Starker Fuß" value={profile?.strong_foot ?? '-'} />
                            <StatCard label="Größe" value={profile?.height_user ? `${profile.height_user} cm` : '-'} isVerified={profile?.is_verified} />
                            <StatCard label="Gewicht" value={profile?.weight ? `${profile.weight} kg` : '-'} isVerified={profile?.is_verified} />
                            <StatCard label="Trikotnummer" value={profile?.jersey_number ? `#${profile.jersey_number}` : '-'} />
                            <StatCard label="Alter" value={profile?.birth_date ? `${calculateAge(profile.birth_date)} Jahre` : '-'} isVerified={profile?.is_verified} />
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
                            <StatCard label="Transfer-Status" value={profile?.transfer_status ?? '-'} highlight={profile?.transfer_status === 'Suche Verein'} />
                            <StatCard label="Vertrag bis" value={profile?.contract_end ? new Date(profile.contract_end).toLocaleDateString('de-DE', { month: 'short', year: 'numeric' }) : '-'} />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 pt-2">
                        <StatCard label="Follower" value={followersCount} />
                        <StatCard label="Clips" value={highlights?.length ?? 0} />
                        <StatCard label="Verein" value={profile?.clubs?.name ?? 'Vereinslos'} small />
                    </div>

                    <div className="pt-4">
                        <h4 className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-3 px-1">Spieler-Attribute</h4>
                        <RadarChart playerId={profile.id} session={session} isOwnProfile={isOwnProfile} />
                    </div>
                </div>
            )}
            --- END OLD STATS TAB --- */}

            {/* TAB: Karriere */}
            {activeTab === 'karriere' && (
                <CareerTimeline userId={profile.user_id} />
            )}

            {/* TAB: Über */}
            {activeTab === 'about' && (
                <div className="px-4 py-6 space-y-6 animate-in fade-in">
                    {/* Bio */}
                    {profile.bio ? (
                        <div>
                            <h4 className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-2">Über mich</h4>
                            <p className="text-foreground/80 text-sm leading-relaxed bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-border">{profile.bio}</p>
                        </div>
                    ) : (
                        <div className="text-muted-foreground text-sm text-center py-4">Keine Bio vorhanden.</div>
                    )}

                    {/* Personal Info */}
                    <div>
                        <h4 className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-3">Persönliche Daten</h4>
                        <div className="space-y-2">
                            {profile.birth_date && <InfoRow icon="📅" label="Geburtsdatum" value={new Date(profile.birth_date).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })} />}
                            {profile.nationality && <InfoRow icon="🌍" label="Nationalität" value={profile.nationality} />}
                            {(profile.city || profile.zip_code) && <InfoRow icon="📍" label="Standort" value={[profile.zip_code, profile.city].filter(Boolean).join(' ')} />}
                        </div>
                    </div>

                    {/* External Links */}
                    {(profile.transfermarkt_url || profile.fupa_url) && (
                        <div>
                            <h4 className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-3">Externe Profile</h4>
                            <div className="space-y-2">
                                {profile.transfermarkt_url && (
                                    <a href={profile.transfermarkt_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 bg-slate-50 dark:bg-white/5 p-3 rounded-xl text-sm text-cyan-400 hover:bg-slate-100 dark:hover:bg-white/10 transition border border-border">
                                        🔗 Transfermarkt Profil
                                    </a>
                                )}
                                {profile.fupa_url && (
                                    <a href={profile.fupa_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 bg-slate-50 dark:bg-white/5 p-3 rounded-xl text-sm text-cyan-400 hover:bg-slate-100 dark:hover:bg-white/10 transition border border-border">
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
const StatCard = ({ label, value, sub, highlight, small, isVerified }) => (
    <motion.div whileHover={{ scale: 1.03, borderColor: "rgba(16,185,129,0.3)" }} transition={{ type: "spring", stiffness: 400, damping: 25 }} className={`bg-slate-50 dark:bg-white/5 border border-border rounded-2xl p-4 flex flex-col items-center text-center ${highlight ? 'border-cyan-500/30 bg-cyan-500/5' : ''}`}>
        <div className={`font-black flex items-center justify-center gap-1 ${small ? 'text-xs' : 'text-lg'} ${isVerified ? 'text-amber-500 dark:text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]' : 'text-foreground'}`}>
            {value}
            {isVerified && <CheckCircle size={12} className="text-amber-400" />}
        </div>
        <div className="text-[10px] text-muted-foreground uppercase font-bold mt-1">{label}</div>
        {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
    </motion.div>
);

const InfoRow = ({ icon, label, value }) => (
    <div className="flex items-center gap-3 bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-border">
        <span className="text-lg">{icon}</span>
        <div>
            <div className="text-[10px] text-muted-foreground uppercase font-bold">{label}</div>
            <div className="text-sm text-foreground">{value}</div>
        </div>
    </div>
);
