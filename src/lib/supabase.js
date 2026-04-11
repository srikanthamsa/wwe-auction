import { createClient } from '@supabase/supabase-js'
import { CRICKET_ROSTER } from './roster.js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

export const ROSTER = CRICKET_ROSTER

export const PLAYERS = ["Srikant", "Ashpak", "KVD", "Ekansh", "Debu"]

export const PLAYER_TEAMS = {
  Srikant: 'RCB',
  Ashpak: 'SRH',
  KVD: 'CSK',
  Ekansh: 'KKR',
  Debu: 'MI',
}

export const STARTING_PURSE = 1000000
export const BID_INCREMENT = 100

export function getBaseBid(ovr) {
  return 100
}

export function getTier(ovr) {
  if (ovr >= 88) return { label: 'S', color: '#c8a84b' }
  if (ovr >= 80) return { label: 'A', color: '#a0a0a0' }
  return { label: 'B', color: '#cd7f32' }
}

export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
