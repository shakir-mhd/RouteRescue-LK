import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lgaxikbzzwvnkunkxawy.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_cJUq8ifgNDdCMNb3mNvABA_mtwioSpI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
