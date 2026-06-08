-- ==========================================
-- PREMIUM SCOUT ACCREDITATION FLOW SETUP
-- ==========================================
-- Führe diesen Code im Supabase "SQL Editor" aus

-- 1. Tabelle für Agencies erstellen
CREATE TABLE IF NOT EXISTS public.agencies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    website TEXT,
    is_premium BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Spalten zur Profiltabelle hinzufügen (in dieser App ist das players_master)
ALTER TABLE public.players_master 
ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS scout_title TEXT;

-- 3. Row Level Security (RLS) aktivieren für agencies
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;

-- 4. Policies für agencies einrichten
-- Jeder darf Agencies lesen
DROP POLICY IF EXISTS "Allow public read - agencies" ON public.agencies;
CREATE POLICY "Allow public read - agencies" ON public.agencies FOR SELECT USING (true);

-- Authentifizierte Nutzer dürfen neue Agencies erstellen (für Autocreate bei Onboarding)
DROP POLICY IF EXISTS "Allow auth insert - agencies" ON public.agencies;
CREATE POLICY "Allow auth insert - agencies" ON public.agencies FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Optional: Nur Admins dürfen bearbeiten/löschen (abhängig von deinen restlichen Regeln)
-- DROP POLICY IF EXISTS "Allow auth update - agencies" ON public.agencies;
-- CREATE POLICY "Allow auth update - agencies" ON public.agencies FOR UPDATE USING (auth.role() = 'authenticated');
