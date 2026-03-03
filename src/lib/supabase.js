import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables. Check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        // JWT expiry & refresh token rotation: configure in Supabase Dashboard
        // Project Settings → Auth → JWT Expiry (recommended: 3600s)
        // Project Settings → Auth → Enable Refresh Token Rotation
    }
});
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB Limit
