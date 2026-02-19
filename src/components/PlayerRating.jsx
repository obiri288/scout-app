import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';

/**
 * Scout-to-player star rating (1-5).
 * Shows average + count, and lets logged-in users submit/update their own rating.
 */
export const PlayerRating = ({ playerId, session, compact }) => {
    const [avgRating, setAvgRating] = useState(0);
    const [totalRatings, setTotalRatings] = useState(0);
    const [myRating, setMyRating] = useState(0);
    const [hoveredStar, setHoveredStar] = useState(0);
    const [loading, setLoading] = useState(false);
    const { addToast } = useToast();

    // Load ratings
    useEffect(() => {
        const load = async () => {
            try {
                // Get all ratings for this player
                const { data, error } = await supabase.from('player_ratings')
                    .select('rating, rater_id')
                    .eq('player_id', playerId);
                if (error) throw error;

                const ratings = data || [];
                if (ratings.length > 0) {
                    const avg = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
                    setAvgRating(Math.round(avg * 10) / 10);
                    setTotalRatings(ratings.length);
                }

                // Get my rating
                if (session) {
                    const mine = ratings.find(r => r.rater_id === session.user.id);
                    if (mine) setMyRating(mine.rating);
                }
            } catch (e) {
                console.warn("Failed to load ratings:", e);
            }
        };
        load();
    }, [playerId, session]);

    const submitRating = async (stars) => {
        if (!session || loading) return;
        setLoading(true);

        const previousRating = myRating;
        setMyRating(stars);

        try {
            // Upsert rating
            const { error } = await supabase.from('player_ratings')
                .upsert({
                    player_id: playerId,
                    rater_id: session.user.id,
                    rating: stars
                }, { onConflict: 'player_id,rater_id' });
            if (error) throw error;

            // Reload to get new average
            const { data } = await supabase.from('player_ratings')
                .select('rating')
                .eq('player_id', playerId);
            if (data && data.length > 0) {
                const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
                setAvgRating(Math.round(avg * 10) / 10);
                setTotalRatings(data.length);
            }

            addToast(`${stars} Stern${stars > 1 ? 'e' : ''} vergeben ⭐`, 'success');
        } catch (e) {
            setMyRating(previousRating);
            addToast("Bewertung fehlgeschlagen.", 'error');
        } finally {
            setLoading(false);
        }
    };

    // Compact mode: just show average + stars (for stats grid)
    if (compact) {
        return (
            <div className="flex flex-col items-center">
                <div className="flex items-center gap-0.5 mb-1">
                    {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} size={12} className={s <= Math.round(avgRating) ? 'text-amber-400 fill-amber-400' : 'text-zinc-700'} />
                    ))}
                </div>
                <span className="text-xl font-black text-white">{avgRating || '-'}</span>
                <span className="text-[10px] text-zinc-500 uppercase font-bold mt-1">
                    {totalRatings} Bewertung{totalRatings !== 1 ? 'en' : ''}
                </span>
            </div>
        );
    }

    // Full interactive mode
    return (
        <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
            {/* Average display */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-white">{avgRating || '-'}</span>
                    <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} size={16} className={s <= Math.round(avgRating) ? 'text-amber-400 fill-amber-400' : 'text-zinc-700'} />
                        ))}
                    </div>
                </div>
                <span className="text-xs text-zinc-500">{totalRatings} Bewertung{totalRatings !== 1 ? 'en' : ''}</span>
            </div>

            {/* User's rating input */}
            {session && (
                <div className="border-t border-white/5 pt-3">
                    <p className="text-[10px] text-zinc-500 uppercase font-bold mb-2">Deine Bewertung</p>
                    <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(s => (
                            <button
                                key={s}
                                onClick={() => submitRating(s)}
                                onMouseEnter={() => setHoveredStar(s)}
                                onMouseLeave={() => setHoveredStar(0)}
                                disabled={loading}
                                className="p-1 transition-transform hover:scale-125 active:scale-90"
                            >
                                <Star
                                    size={24}
                                    className={`transition ${s <= (hoveredStar || myRating)
                                            ? 'text-amber-400 fill-amber-400'
                                            : 'text-zinc-600 hover:text-zinc-400'
                                        }`}
                                />
                            </button>
                        ))}
                        {myRating > 0 && (
                            <span className="text-xs text-zinc-500 ml-2">{myRating}/5</span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
