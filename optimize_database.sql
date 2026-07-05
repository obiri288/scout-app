-- CAVIO Production Scale Database Indexes Optimization Script
-- This script creates optimized B-tree, compound, and GIN indexes to support high concurrent load.

-- Enable pg_trgm for fast text pattern matching (ILIKE search) if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- 1. PLAYERS_MASTER INDEXES
-- ============================================================

-- B-Tree indexes for foreign keys & direct filters
CREATE INDEX IF NOT EXISTS idx_players_master_role ON players_master(role);
CREATE INDEX IF NOT EXISTS idx_players_master_club_id ON players_master(club_id);
CREATE INDEX IF NOT EXISTS idx_players_master_agency_id ON players_master(agency_id);
CREATE INDEX IF NOT EXISTS idx_players_master_position_primary ON players_master(position_primary);
CREATE INDEX IF NOT EXISTS idx_players_master_transfer_status ON players_master(transfer_status);
CREATE INDEX IF NOT EXISTS idx_players_master_player_archetype ON players_master(player_archetype);
CREATE INDEX IF NOT EXISTS idx_players_master_ecosystem ON players_master(ecosystem);
CREATE INDEX IF NOT EXISTS idx_players_master_username ON players_master(username);

-- Index for ordering/sorting new profiles
CREATE INDEX IF NOT EXISTS idx_players_master_created_at_desc ON players_master(created_at DESC);

-- Compound index for active user lookups (Common query prefix)
CREATE INDEX IF NOT EXISTS idx_players_master_active_lookup 
ON players_master(id) 
WHERE is_deactivated = false AND is_under_review = false;

-- GIN Trigram index for full name search autocomplete (ILIKE '%name%')
CREATE INDEX IF NOT EXISTS idx_players_master_full_name_trgm 
ON players_master USING gin (full_name gin_trgm_ops);

-- ============================================================
-- 2. CAREER HISTORY INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_career_history_user_id ON career_history(user_id);
CREATE INDEX IF NOT EXISTS idx_career_history_user_status_start 
ON career_history(user_id, verification_status, start_date DESC);

-- ============================================================
-- 3. MEDIA HIGHLIGHTS & POSTS INDEXES
-- ============================================================

-- Fall A: Ensure columns needed by React code exist in the database
ALTER TABLE public.media_highlights ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;
ALTER TABLE public.media_highlights ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ DEFAULT null;

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ DEFAULT null;

-- Compound index to support pinning and sorting by creation date
CREATE INDEX IF NOT EXISTS idx_media_highlights_player_pinned_created 
ON media_highlights(player_id, is_pinned DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_user_pinned_created 
ON posts(user_id, is_pinned DESC, created_at DESC);

-- ============================================================
-- 4. NOTIFICATIONS INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
ON notifications(user_id, created_at DESC);

-- ============================================================
-- 5. DIRECT MESSAGES INDEXES
-- ============================================================

-- Note: recipient_id is verified via Supabase MCP schema to be receiver_id
CREATE INDEX IF NOT EXISTS idx_direct_messages_conversation 
ON direct_messages(sender_id, receiver_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_direct_messages_receiver_created 
ON direct_messages(receiver_id, created_at DESC);

-- ============================================================
-- 6. FOLLOWS INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_follows_follower_following ON follows(follower_id, following_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_follower ON follows(following_id, follower_id);

-- ============================================================
-- 7. SCOUT WATCHLIST INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_scout_watchlist_scout_player 
ON scout_watchlist(scout_id, player_id, created_at DESC);
