import { createClient } from '@supabase/supabase-js'
import { FALLBACK_SERVICES, generateFallbackSlots } from '../data/services.js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = url && anonKey ? createClient(url, anonKey) : null
export const hasSupabase = Boolean(supabase)

export async function fetchServices() {
  if (!supabase) return FALLBACK_SERVICES
  const { data, error } = await supabase
    .from('services')
    .select('id, name, duration_min, description')
    .order('id')
  if (error) {
    console.warn('[supabase] services fallback:', error.message)
    return FALLBACK_SERVICES
  }
  return data?.length ? data : FALLBACK_SERVICES
}

export async function fetchAvailableSlots(serviceId) {
  if (!supabase) return generateFallbackSlots()
  const nowIso = new Date().toISOString()
  const { data, error } = await supabase
    .from('available_slots')
    .select('id, starts_at, is_taken, service_id')
    .eq('is_taken', false)
    .gte('starts_at', nowIso)
    .order('starts_at')
    .limit(60)
  if (error) {
    console.warn('[supabase] slots fallback:', error.message)
    return generateFallbackSlots()
  }
  return data?.length ? data : generateFallbackSlots()
}

export async function saveBooking(payload) {
  // payload: { slot_id, service_id, client_name, client_email, qualification_answers, diagnostic_report }
  if (!supabase) {
    console.info('[supabase mock] booking saved:', payload)
    return { id: `mock-${Date.now()}`, ...payload }
  }
  const { data, error } = await supabase
    .from('bookings')
    .insert(payload)
    .select()
    .single()
  if (error) throw new Error(`Не удалось сохранить запись: ${error.message}`)
  // Also mark the slot taken (idempotent — RLS or triggers may also handle).
  if (payload.slot_id && !String(payload.slot_id).startsWith('fb-')) {
    await supabase.from('available_slots').update({ is_taken: true }).eq('id', payload.slot_id)
  }
  return data
}
