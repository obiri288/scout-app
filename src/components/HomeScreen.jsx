import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, RefreshCw, Film } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { FeedItem } from './FeedItem';
import { FeedSkeleton } from './SkeletonScreens';
import { WelcomeCard } from './WelcomeCard';
import { EmptyState } from './EmptyState';

const PAGE_SIZE = 10;

// Stagger animation variants
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.08,
            delayChildren: 0.1,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.4, ease: "easeOut" },
    },
};

export const HomeScreen = ({ onVideoClick, session, onLikeReq, onCommentClick, onUserClick, onReportReq }) => {
    const [feed, setFeed] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [currentUserProfile, setCurrentUserProfile] = useState(null);
    const containerRef = useRef(null);
    const touchStartY = useRef(0);
    const [pullDistance, setPullDistance] = useState(0);
    const sentinelRef = useRef(null);

    const fetchFeed = useCallback(async (offset = 0, reset = false) => {
        try {
            const { data } = await supabase.from('media_highlights')
                .select('*, players_master(*, clubs(*))')
                .order('created_at', { ascending: false })
                .range(offset, offset + PAGE_SIZE - 1);

            const newItems = data || [];
            if (reset) {
                setFeed(newItems);
            } else {
                setFeed(prev => [...prev, ...newItems]);
            }
            setHasMore(newItems.length === PAGE_SIZE);
        } catch (e) {
            console.error("Feed load failed:", e);
        } finally {
            setLoading(false);
            setLoadingMore(false);
            setRefreshing(false);
        }
    }, []);

    // Fetch current user profile for the WelcomeCard
    useEffect(() => {
        if (!session?.user?.id) return;
        supabase.from('players_master')
            .select('full_name')
            .eq('user_id', session.user.id)
            .single()
            .then(({ data }) => {
                if (data) setCurrentUserProfile(data);
            });
    }, [session]);

    useEffect(() => { fetchFeed(0, true); }, [fetchFeed]);

    // Infinite scroll via IntersectionObserver on sentinel element
    useEffect(() => {
        if (!sentinelRef.current || !hasMore) return;

        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && !loadingMore && !loading && hasMore) {
                setLoadingMore(true);
                fetchFeed(feed.length);
            }
        }, { rootMargin: '400px' });

        observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [feed.length, hasMore, loadingMore, loading, fetchFeed]);

    // Pull-to-Refresh handlers
    const handleTouchStart = (e) => {
        if (containerRef.current?.scrollTop === 0) {
            touchStartY.current = e.touches[0].clientY;
        }
    };

    const handleTouchMove = (e) => {
        if (containerRef.current?.scrollTop > 0) return;
        const diff = e.touches[0].clientY - touchStartY.current;
        if (diff > 0 && diff < 150) {
            setPullDistance(diff);
        }
    };

    const handleTouchEnd = () => {
        if (pullDistance > 80) {
            setRefreshing(true);
            setHasMore(true);
            fetchFeed(0, true);
        }
        setPullDistance(0);
    };

    if (loading) return <FeedSkeleton />;

    return (
        <div
            ref={containerRef}
            className="pb-32 pt-0 max-w-md mx-auto relative"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Pull-to-Refresh indicator */}
            <AnimatePresence>
                {(pullDistance > 0 || refreshing) && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{
                            height: refreshing ? 60 : pullDistance * 0.5,
                            opacity: 1
                        }}
                        exit={{ height: 0, opacity: 0 }}
                        className="flex items-center justify-center overflow-hidden"
                    >
                        <div className={`flex items-center gap-2 text-slate-400 text-sm ${refreshing ? 'animate-pulse' : ''}`}>
                            <motion.div
                                animate={refreshing ? { rotate: 360 } : { rotate: pullDistance * 2 }}
                                transition={refreshing ? { repeat: Infinity, duration: 1, ease: "linear" } : { type: "spring", stiffness: 300, damping: 30 }}
                            >
                                <RefreshCw size={18} />
                            </motion.div>
                            {refreshing ? 'Aktualisiere...' : pullDistance > 80 ? 'Loslassen zum Aktualisieren' : 'Ziehen zum Aktualisieren'}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Welcome Card */}
            {session && currentUserProfile && (
                <WelcomeCard profile={currentUserProfile} />
            )}

            {/* Stagger-In Feed */}
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="px-3 space-y-1"
            >
                {feed.map(v => (
                    <motion.div key={v.id} variants={itemVariants}>
                        <FeedItem
                            video={v}
                            onClick={onVideoClick}
                            session={session}
                            onLikeReq={onLikeReq}
                            onCommentClick={onCommentClick}
                            onUserClick={onUserClick}
                            onReportReq={onReportReq}
                        />
                    </motion.div>
                ))}
            </motion.div>

            {feed.length === 0 && !loading && (
                <EmptyState
                    icon={Film}
                    title="Der Feed wartet auf dich!"
                    description="Lade dein erstes Highlight hoch und zeig der Welt was du kannst."
                />
            )}

            {/* Infinite scroll sentinel */}
            {hasMore && (
                <div ref={sentinelRef} className="flex justify-center py-8">
                    {loadingMore && <Loader2 className="animate-spin text-slate-500" size={24} />}
                </div>
            )}
            {!hasMore && feed.length > 0 && (
                <div className="text-center text-slate-400 text-xs py-8">Du hast alles gesehen 🎉</div>
            )}
        </div>
    );
};
