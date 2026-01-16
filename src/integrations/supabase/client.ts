import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://pyjfxrwgwncoasppgmuh.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5amZ4cndnd25jb2FzcHBnbXVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5MjY5MDMsImV4cCI6MjA4MTUwMjkwM30.haaiEi2xi5272lKaA8tZ7yiH9fUqdNNMTT_2_1VILFA";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
