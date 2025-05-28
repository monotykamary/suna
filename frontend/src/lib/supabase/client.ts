import { createBrowserClient } from '@supabase/ssr';

export const createClient = () => {
  // Provide placeholders if env vars are not set (e.g., during build)
  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://placeholder.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_anon_key';

  // Ensure the URL is in the proper format with http/https protocol
  if (supabaseUrl && !supabaseUrl.startsWith('http')) {
    supabaseUrl = `http://${supabaseUrl}`;
  }
  
  // console.log('Supabase URL:', supabaseUrl);
  // console.log('Supabase Anon Key:', supabaseAnonKey);
  // It's crucial that the application is configured to provide the *actual*
  // NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY at runtime.

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
};
