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

// All monetary values stored in Lakhs (L). 1 Cr = 100 L.
export const STARTING_PURSE = 12000  // 120 Cr
export const BID_INCREMENT = 10       // 10 L minimum increment

export function getBaseBid(ovr) {
  if (ovr >= 90) return 300  // ₹3 Cr
  if (ovr >= 85) return 200  // ₹2 Cr
  if (ovr >= 80) return 150  // ₹1.5 Cr
  if (ovr >= 75) return 100  // ₹1 Cr
  if (ovr >= 70) return 75   // ₹75 L
  return 50                   // ₹50 L
}

// Format Lakhs value to Indian currency string
export function formatINR(lakhs) {
  if (lakhs >= 100) {
    const cr = lakhs / 100
    const display = cr % 1 === 0 ? cr.toString() : parseFloat(cr.toFixed(2)).toString()
    return `₹${display}Cr`
  }
  return `₹${lakhs}L`
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
