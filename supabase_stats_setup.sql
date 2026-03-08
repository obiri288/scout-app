-- ==========================================
-- PROBASE STATS & RATINGS: TABELLEN-SETUP
-- ==========================================
-- Führe diesen Code im Supabase "SQL Editor" aus, 
-- um die 404 Fehler (Missing Relations) zu beheben!

-- 1. Tabelle für die Radar-Chart Attribute (Gamification)
CREATE TABLE IF NOT EXISTS public.player_attributes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID NOT NULL REFERENCES public.players_master(id) ON DELETE CASCADE,
    rater_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pace SMALLINT DEFAULT 50 CHECK (pace >= 0 AND pace <= 99),
    shooting SMALLINT DEFAULT 50 CHECK (shooting >= 0 AND shooting <= 99),
    passing SMALLINT DEFAULT 50 CHECK (passing >= 0 AND passing <= 99),
    dribbling SMALLINT DEFAULT 50 CHECK (dribbling >= 0 AND dribbling <= 99),
    defending SMALLINT DEFAULT 50 CHECK (defending >= 0 AND defending <= 99),
    physical SMALLINT DEFAULT 50 CHECK (physical >= 0 AND physical <= 99),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(player_id, rater_id)
);

-- 2. Tabelle für die generelle Spieler-Bewertung (FIFA Card OVR)
CREATE TABLE IF NOT EXISTS public.player_ratings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID NOT NULL REFERENCES public.players_master(id) ON DELETE CASCADE,
    rater_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 99),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(player_id, rater_id)
);

-- Optional: Aktiviert RLS, sodass jeder alles lesen kann, aber Nutzer nur selbst bewerten
ALTER TABLE public.player_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read - player_attributes" ON public.player_attributes FOR SELECT USING (true);
CREATE POLICY "Allow public read - player_ratings" ON public.player_ratings FOR SELECT USING (true);

CREATE POLICY "Allow auth insert/update - player_attributes" ON public.player_attributes FOR ALL USING (auth.uid() = rater_id);
CREATE POLICY "Allow auth insert/update - player_ratings" ON public.player_ratings FOR ALL USING (auth.uid() = rater_id);
