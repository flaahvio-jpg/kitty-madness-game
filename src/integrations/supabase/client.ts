import { createClient } from '@supabase/supabase-js'

// Try to get from environment variables first (Lovable integration)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'

// Check if we have real values
const hasRealConfig = supabaseUrl !== 'https://placeholder.supabase.co' && 
                     supabaseAnonKey !== 'placeholder-key' &&
                     supabaseUrl && 
                     supabaseAnonKey

if (!hasRealConfig) {
  console.warn('Supabase não está configurado. Conecte seu projeto ao Supabase para habilitar a funcionalidade de backend.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)