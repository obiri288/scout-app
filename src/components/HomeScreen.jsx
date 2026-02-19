import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { FeedItem } from './FeedItem';
import { FeedSkeleton } from './SkeletonScreens';

const PAGE_SIZE = 10;

export const HomeScreen = ({ onVideoClick, session, onLikeReq, onCommentClick, onUserClick, onReportReq }) => {
    const [feed, setFeed] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [hasMore, setHasMore] = useState(true);
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
            className="pb-24 pt-0 max-w-md mx-auto relative"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Pull-to-Refresh indicator */}
            {(pullDistance > 0 || refreshing) && (
                <div
                    className="flex items-center justify-center py-4 transition-all"
                    style={{ height: refreshing ? 60 : pullDistance * 0.5 }}
                >
                    <div className={`flex items-center gap-2 text-zinc-400 text-sm ${refreshing ? 'animate-pulse' : ''}`}>
                        <RefreshCw
                            size={18}
                            className={refreshing ? 'animate-spin' : ''}
                            style={{ transform: `rotate(${pullDistance * 2}deg)` }}
                        />
                        {refreshing ? 'Aktualisiere...' : pullDistance > 80 ? 'Loslassen zum Aktualisieren' : 'Ziehen zum Aktualisieren'}
                    </div>
                </div>
            )}
            {feed.map(v => (
                <FeedItem
                    key={v.id}
                    video={v}
                    onClick={onVideoClick}
                    session={session}
                    onLikeReq={onLikeReq}
                    onCommentClick={onCommentClick}
                    onUserClick={onUserClick}
                    onReportReq={onReportReq}
                />
            ))}
            {feed.length === 0 && !loading && (
                <div className="text-center text-zinc-500 py-20">Noch keine Videos im Feed.</div>
            )}

            {/* Infinite scroll sentinel */}
            {hasMore && (
                <div ref={sentinelRef} className="flex justify-center py-8">
                    {loadingMore && <Loader2 className="animate-spin text-zinc-500" size={24} />}
                </div>
            )}
            {!hasMore && feed.length > 0 && (
                <div className="text-center text-zinc-700 text-xs py-8">Du hast alles gesehen 🎉</div>
            )}
        </div>
    );
};
