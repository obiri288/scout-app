-- ============================================================
-- VIDEO PINNING: Migration für media_highlights
-- ============================================================

-- 1. Neue Spalten hinzufügen
ALTER TABLE public.media_highlights
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;

ALTER TABLE public.media_highlights
ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ DEFAULT null;

-- 2. Index für performante Sortierung (pinned first, dann chronologisch)
CREATE INDEX IF NOT EXISTS idx_media_highlights_pinned
ON public.media_highlights (player_id, is_pinned DESC, pinned_at DESC NULLS LAST, created_at DESC);
