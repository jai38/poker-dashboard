import { createClient, SupabaseClient } from '@supabase/supabase-js'

export const SUPABASE_CONFIG_STORAGE_KEY = 'poker_supabase_cloud_config_v1'

export interface SupabaseConfigInfo {
  url: string
  anonKey: string
  source: 'env' | 'custom' | 'none'
  isConfigured: boolean
}

export function getSupabaseConfig(): SupabaseConfigInfo {
  // 1. Check in-app custom stored credentials first (allows dynamic setup directly on GitHub Pages)
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(SUPABASE_CONFIG_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.url && parsed.anonKey && parsed.url.startsWith('https://')) {
          return {
            url: parsed.url.trim(),
            anonKey: parsed.anonKey.trim(),
            source: 'custom',
            isConfigured: true,
          }
        }
      }
    } catch (e) {
      console.warn('Failed to parse stored Supabase config:', e)
    }
  }

  // 2. Check environment variables
  const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim()
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

  if (envUrl && envKey && envUrl !== 'https://your-project-id.supabase.co') {
    return {
      url: envUrl,
      anonKey: envKey,
      source: 'env',
      isConfigured: true,
    }
  }

  return {
    url: '',
    anonKey: '',
    source: 'none',
    isConfigured: false,
  }
}

export function saveCustomSupabaseConfig(url: string, anonKey: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(
      SUPABASE_CONFIG_STORAGE_KEY,
      JSON.stringify({ url: url.trim(), anonKey: anonKey.trim() })
    )
    window.location.reload()
  }
}

export function clearCustomSupabaseConfig() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SUPABASE_CONFIG_STORAGE_KEY)
    window.location.reload()
  }
}

export async function testSupabaseConnection(
  url: string,
  anonKey: string
): Promise<{ success: boolean; message: string }> {
  try {
    const trimmedUrl = url.trim()
    const trimmedKey = anonKey.trim()

    if (!trimmedUrl.startsWith('https://') || !trimmedUrl.includes('.supabase.co')) {
      return { success: false, message: 'Invalid Supabase URL. Must be in format: https://<project>.supabase.co' }
    }
    if (!trimmedKey || trimmedKey.length < 20) {
      return { success: false, message: 'Invalid Supabase anon public key.' }
    }

    const testClient = createClient(trimmedUrl, trimmedKey, {
      auth: { persistSession: false },
    })

    const { error } = await testClient.from('owners').select('count', { count: 'exact', head: true })
    if (error) {
      // 42P01 means table does not exist yet (schema not run), but connection is good!
      if (error.code === '42P01') {
        return {
          success: true,
          message: 'Connection successful! (Note: Database tables need to be created using the SQL schema provided below).',
        }
      }
      return { success: false, message: error.message || 'Connection test returned an error.' }
    }

    return { success: true, message: 'Connected successfully to Supabase database!' }
  } catch (err: any) {
    return { success: false, message: err?.message || 'Connection test failed.' }
  }
}

const currentConfig = getSupabaseConfig()

export const isSupabaseConfigured = currentConfig.isConfigured

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(currentConfig.url, currentConfig.anonKey)
  : null
