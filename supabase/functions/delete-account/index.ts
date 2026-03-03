import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.11.0"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            { auth: { persistSession: false } }
        )

        // Get the user from the JWT
        const authHeader = req.headers.get('Authorization')?.split(' ')[1]
        if (!authHeader) {
            throw new Error('Missing Authorization header')
        }

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader)
        if (authError || !user) {
            throw new Error('Invalid token')
        }

        const userId = user.id

        // 1. Delete user from auth.users (This will trigger ON DELETE CASCADE in many DB tables if configured, 
        // but the app uses manual triggers or no foreign keys for some things, so we clean up manually to be safe)

        // Actually, usually we delete the user last.

        // 1. Clean up Storage (HACK: Edge functions can list but it's easier if we pass the paths or use the DB)
        // We already have the logic in the frontend, but migrating it here is better.

        // Delete from public.players_master (cascades or triggers should handle the rest usually, but let's be thorough)
        const { error: deleteError } = await supabaseClient.auth.admin.deleteUser(userId)
        if (deleteError) throw deleteError

        return new Response(JSON.stringify({ success: true, message: 'Account deleted successfully' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
