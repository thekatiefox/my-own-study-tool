import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================
// SETUP: Create a free project at https://supabase.com
// Then paste your values below (found in Project Settings → API)
// ============================================================
const SUPABASE_URL = 'https://dagwbnnjmpcbmzacnyeo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1urbDVRGoUCO4B5LaQ2AhQ_er0b9UUF';

export const supabaseConfigured =
  !SUPABASE_URL.includes('YOUR_PROJECT_ID') &&
  !SUPABASE_ANON_KEY.includes('YOUR_ANON_KEY');

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
