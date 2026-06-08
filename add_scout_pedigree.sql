-- 1. Füge is_active_player zu players_master hinzu, falls nicht existent
ALTER TABLE public.players_master 
ADD COLUMN IF NOT EXISTS is_active_player BOOLEAN DEFAULT true;

-- 2. Erstelle oder aktualisiere die Trigger-Funktion
CREATE OR REPLACE FUNCTION public.handle_role_change_to_scout()
RETURNS TRIGGER AS $$
BEGIN
    -- Wenn die Rolle von etwas anderem auf 'scout' gewechselt wird
    IF NEW.role = 'scout' AND (OLD.role IS NULL OR OLD.role != 'scout') THEN
        -- Setze is_active_player auf false, da der User nun primär Scout ist
        NEW.is_active_player := false;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger erstellen (vorher droppen falls existent)
DROP TRIGGER IF EXISTS on_role_change_to_scout ON public.players_master;

CREATE TRIGGER on_role_change_to_scout
BEFORE UPDATE ON public.players_master
FOR EACH ROW
EXECUTE FUNCTION public.handle_role_change_to_scout();
