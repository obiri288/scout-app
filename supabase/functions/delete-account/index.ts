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

        // 1. Storage Cleanup: Remove user-owned files from buckets
        const buckets = ['avatars', 'videos', 'player-videos', 'identity_documents'];
        for (const bucket of buckets) {
            try {
                const { data: files } = await supabaseClient.storage.from(bucket).list(userId);
                if (files && files.length > 0) {
                    const paths = files.map(f => `${userId}/${f.name}`);
                    await supabaseClient.storage.from(bucket).remove(paths);
                }
            } catch (storageErr) {
                console.error(`Storage cleanup error for bucket ${bucket}:`, storageErr);
            }
        }

        // 2. Delete user from auth.users (triggers ON DELETE CASCADE on players_master and related DB tables)
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
