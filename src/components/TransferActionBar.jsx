import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Share2, Bookmark } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';

/**
 * TransferActionBar - Strictly isolated interaction bar for Transfer Posts.
 * Communicates ONLY with post-specific tables (post_likes, post_comments, post_saves).
 * Decoupled from video-related media_likes / media_highlights.
 */
export const TransferActionBar = ({ post, session, onCommentClick, onShareClick }) => {
    const [liked, setLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(post.likes_count || 0);
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(false);
    const { addToast } = useToast();
    const userId = session?.user?.id;

    // Table availability check (to follow the user's "disabled" instruction)
    const [tablesExist, setTablesExist] = useState(true);

    useEffect(() => {
        if (!userId || !post.id) return;

        const fetchStatus = async () => {
            try {
                // Check Like Status
                const { data: likeData, error: likeError } = await supabase
                    .from('post_likes')
                    .select('id')
                    .eq('user_id', userId)
                    .eq('post_id', post.id)
                    .maybeSingle();
                
                if (likeError && likeError.code === 'PGRST116') { // Table missing?
                    // We handle specific error codes if needed, but maybeSingle returns null if no row.
                    // If table is missing, error will likely be 42P01
                }
                if (likeError && likeError.code === '42P01') {
                    setTablesExist(false);
                } else {
                    setLiked(!!likeData);
                }

                // Check Save Status
                const { data: saveData, error: saveError } = await supabase
                    .from('post_saves')
                    .select('id')
                    .eq('user_id', userId)
                    .eq('post_id', post.id)
                    .maybeSingle();
                
                if (!saveError) setSaved(!!saveData);

            } catch (err) {
                console.warn("Post tables might not exist yet:", err);
                setTablesExist(false);
            }
        };

        fetchStatus();
    }, [userId, post.id]);

    const handleLike = async (e) => {
        e.stopPropagation();
        if (!userId) return;
        if (!tablesExist) {
            addToast("SQL Migration erforderlich (siehe Anleitung)", "error");
            return;
        }

        const wasLiked = liked;
        setLiked(!wasLiked);
        setLikesCount(prev => wasLiked ? prev - 1 : prev + 1);

        try {
            if (!wasLiked) {
                const { error } = await supabase.from('post_likes').insert({
                    user_id: userId,
                    post_id: post.id
                });
                if (error) throw error;
            } else {
                const { error } = await supabase.from('post_likes').delete().match({
                    user_id: userId,
                    post_id: post.id
                });
                if (error) throw error;
            }
        } catch (err) {
            console.error("Like failed:", err);
            setLiked(wasLiked);
            setLikesCount(prev => wasLiked ? prev + 1 : prev - 1);
            addToast("Aktion fehlgeschlagen", "error");
        }
    };

    const handleSave = async (e) => {
        e.stopPropagation();
        if (!userId) return;
        if (!tablesExist) return;

        const wasSaved = saved;
        setSaved(!wasSaved);

        try {
            if (!wasSaved) {
                const { error } = await supabase.from('post_saves').insert({
                    user_id: userId,
                    post_id: post.id
                });
                if (error) throw error;
            } else {
                const { error } = await supabase.from('post_saves').delete().match({
                    user_id: userId,
                    post_id: post.id
                });
                if (error) throw error;
            }
        } catch (err) {
            console.error("Save failed:", err);
            setSaved(wasSaved);
            addToast("Speichern fehlgeschlagen", "error");
        }
    };

    return (
        <div className="flex items-center gap-4 px-4 py-3 bg-zinc-900/50 border-t border-white/5">
            {/* LIKE BUTTON */}
            <motion.button
                whileTap={{ scale: 0.8 }}
                onClick={handleLike}
                disabled={!tablesExist}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-300 ${
                    !tablesExist ? 'opacity-50 cursor-not-allowed' : 
                    liked ? 'bg-red-500/10 border-red-500/30 text-red-500' : 
                    'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white'
                }`}
            >
                <Heart size={20} className={liked ? 'fill-red-500 text-red-500' : ''} />
                <span className="font-black text-sm">{likesCount}</span>
            </motion.button>

            {/* SAVE BUTTON */}
            <motion.button
                whileTap={{ scale: 0.8 }}
                onClick={handleSave}
                disabled={!tablesExist}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-300 ${
                    !tablesExist ? 'opacity-50 cursor-not-allowed' :
                    saved ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 
                    'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white'
                }`}
            >
                <Bookmark size={20} className={saved ? 'fill-cyan-400 text-cyan-400' : ''} />
            </motion.button>

            {/* COMMENT BUTTON */}
            <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={(e) => { e.stopPropagation(); onCommentClick(); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-zinc-400 hover:text-white transition-all duration-300"
            >
                <MessageCircle size={20} />
                <span className="font-black text-sm">{post.comments_count || 0}</span>
            </motion.button>

            {/* SHARE BUTTON */}
            <div className="ml-auto">
                <Share2 
                    size={24} 
                    className="text-zinc-500 hover:text-white hover:scale-110 active:scale-95 transition-all duration-300 cursor-pointer" 
                    onClick={(e) => { e.stopPropagation(); onShareClick(); }}
                />
            </div>
        </div>
    );
};
