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
    }, [playerId, session?.user?.id]);

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

    // Compact mode: Premium Grid Rating Card
    if (compact) {
        const displayRating = avgRating || 0; // Remove dash, use 0 or "0.0" if empty
        return (
            <div className="flex flex-col items-center justify-center w-full h-full">
                {/* Score in a glowing amber circle */}
                <div className="relative mb-2 flex items-center justify-center group">
                    <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full scale-150 transition-transform group-hover:scale-110"></div>
                    <div className="relative w-14 h-14 rounded-full border border-amber-400/50 bg-amber-500/10 flex items-center justify-center shadow-[0_0_15px_rgba(251,191,36,0.2)]">
                        <span className="text-2xl font-black text-amber-500 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                            {displayRating > 0 ? displayRating.toFixed(1) : '0.0'}
                        </span>
                    </div>
                </div>
                
                {/* 5 Stars directly below */}
                <div className="flex items-center justify-center gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map(s => {
                        const isFilled = s <= Math.round(displayRating);
                        return (
                            <Star 
                                key={s} 
                                size={14} 
                                strokeWidth={isFilled ? 0 : 2}
                                className={isFilled ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.6)]' : 'text-slate-700'} 
                            />
                        );
                    })}
                </div>
                
                {/* Ratings count at the bottom */}
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold z-10 drop-shadow-md">
                    {totalRatings} Bewertung{totalRatings !== 1 ? 'en' : ''}
                </span>
            </div>
        );
    }

    // Full interactive mode
    return (
        <div className="bg-muted/50 border border-border rounded-2xl p-4">
            {/* Average display */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-foreground">{avgRating || '-'}</span>
                    <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} size={16} className={s <= Math.round(avgRating) ? 'text-amber-400 fill-amber-400' : 'text-zinc-600'} />
                        ))}
                    </div>
                </div>
                <span className="text-xs text-muted-foreground">{totalRatings} Bewertung{totalRatings !== 1 ? 'en' : ''}</span>
            </div>

            {/* User's rating input */}
            {session && (
                <div className="border-t border-white/5 pt-3">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold mb-2">Deine Bewertung</p>
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
                            <span className="text-xs text-muted-foreground ml-2">{myRating}/5</span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
