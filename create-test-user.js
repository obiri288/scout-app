import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env.local manually
const envPath = path.resolve('.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)="?(.*)"?$/);
    if (match) {
        envVars[match[1]] = match[2].replace(/"$/, '');
    }
});

const SUPABASE_URL = envVars.VITE_SUPABASE_URL;
const SUPABASE_KEY = envVars.VITE_SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    const email = 'pitchdeck@test.com';
    const password = 'PitchDeckPassword123!';
    
    console.log(`Signing up ${email}...`);
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { full_name: 'Max Scout' }
        }
    });

    if (error) {
        console.error('Signup error:', error.message);
        if (error.message.includes('already registered')) {
            console.log('User already exists. You can use it!');
        }
        process.exit(0);
    }
    
    console.log(`Successfully signed up. User ID: ${data.user.id}`);
}

run();
