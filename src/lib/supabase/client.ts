import { createClient, SupabaseClient } from '@supabase/supabase-js'

export const SUPABASE_CONFIG_STORAGE_KEY = 'poker_supabase_cloud_config_v1'

// Default project credentials configured for this repository
export const DEFAULT_SUPABASE_URL = 'https://futmssxmzxtkneijhhpw.supabase.co'
export const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1dG1zc3htenh0a25laWpoaHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyNDYyMTMsImV4cCI6MjEwNTgyMjIxM30.ldsX2bTcxm7a1m8Jf7_o1AXXUoRUDoNo9fpj7iyUMrM'

export interface SupabaseConfigInfo {
  url: string
  anonKey: string
  source: 'env' | 'custom' | 'default' | 'none'
  isConfigured: boolean
}

/**
 * Normalizes Supabase project URL by removing trailing slashes and unintended /rest/v1 suffixes.
 * Ensures the SDK receives the clean base URL: https://<project>.supabase.co
 */
export function normalizeSupabaseUrl(rawUrl: string): string {
  if (!rawUrl) return ''
  let cleaned = rawUrl.trim()
  // Remove any trailing slashes
  cleaned = cleaned.replace(/\/+$/, '')
  // Remove any trailing /rest/v1 or /rest/v1/ (case-insensitive)
  cleaned = cleaned.replace(/\/rest\/v1\/?$/i, '')
  // Clean trailing slashes again
  cleaned = cleaned.replace(/\/+$/, '')
  return cleaned
}

export function getSupabaseConfig(): SupabaseConfigInfo {
  // 1. Check in-app custom stored credentials first (allows dynamic setup or overrides)
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(SUPABASE_CONFIG_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.url && parsed.anonKey) {
          const cleanUrl = normalizeSupabaseUrl(parsed.url)
          if (cleanUrl.startsWith('https://')) {
            return {
              url: cleanUrl,
              anonKey: parsed.anonKey.trim(),
              source: 'custom',
              isConfigured: true,
            }
          }
        }
      }
    } catch (e) {
      console.warn('Failed to parse stored Supabase config:', e)
    }
  }

  // 2. Check environment variables
  const envUrl = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL || '')
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

  if (envUrl && envKey && envUrl !== 'https://your-project-id.supabase.co') {
    return {
      url: envUrl,
      anonKey: envKey,
      source: 'env',
      isConfigured: true,
    }
  }

  // 3. Fallback to repository default project credentials
  if (DEFAULT_SUPABASE_URL && DEFAULT_SUPABASE_ANON_KEY) {
    return {
      url: DEFAULT_SUPABASE_URL,
      anonKey: DEFAULT_SUPABASE_ANON_KEY,
      source: 'default',
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
    const cleanUrl = normalizeSupabaseUrl(url)
    localStorage.setItem(
      SUPABASE_CONFIG_STORAGE_KEY,
      JSON.stringify({ url: cleanUrl, anonKey: anonKey.trim() })
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
    const cleanUrl = normalizeSupabaseUrl(url)
    const trimmedKey = anonKey.trim()

    if (!cleanUrl.startsWith('https://') || !cleanUrl.includes('.supabase.co')) {
      return { success: false, message: 'Invalid Supabase URL. Must be in format: https://<project>.supabase.co' }
    }
    if (!trimmedKey || trimmedKey.length < 20) {
      return { success: false, message: 'Invalid Supabase anon public key.' }
    }

    const testClient = createClient(cleanUrl, trimmedKey, {
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
