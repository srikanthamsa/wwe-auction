import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

export const ROSTER = [
  ["AJ Styles", 85], ["Aleister Black", 82], ["Batista", 89], ["Big E", 85],
  ["Booker T", 89], ["Braun Strowman", 81], ["Bray Wyatt", 90], ["Bret Hart", 93],
  ["Brock Lesnar", 94], ["Bron Breakker", 87], ["Bronson Reed", 85], ["Carmelo Hayes", 81],
  ["Chad Gable", 80], ["CM Punk", 93], ["Cody Rhodes", 95], ["Damian Priest", 86],
  ["Dominik Mysterio", 84], ["Drew McIntyre", 91], ["Dusty Rhodes", 91], ["Eddie Guerrero", 90],
  ["El Grande Americano", 85], ["Erick Rowan", 80], ["Ethan Page", 80], ["Finn Bálor", 90],
  ["Goldberg", 90], ["Gunther", 92], ["Hulk Hogan", 92], ["Ilja Dragunov", 80],
  ["Jacob Fatu", 87], ["Jey Uso", 90], ["Jimmy Uso", 84], ["John Cena", 96],
  ["Kane", 88], ["Kevin Owens", 87], ["King Corbin", 81], ["Kofi Kingston '17", 85],
  ["Kurt Angle", 89], ["LA Knight", 88], ["Logan Paul", 90], ["Mark Henry", 90],
  ["Oba Femi", 80], ["Penta", 84], ["R-Truth Ron Cena", 83], ["Randy Orton", 93],
  ["Rey Mysterio", 86], ["Rikishi", 81], ["Rob Van Dam", 90], ["Roman Reigns", 97],
  ["Sami Zayn", 86], ["Seth \"Freakin\" Rollins", 93], ["Shawn Michaels", 94], ["Sheamus", 86],
  ["Shinsuke Nakamura", 87], ["Sika", 86], ["Solo Sikoa", 88], ["Stone Cold Steve Austin", 97],
  ["Tama Tonga", 83], ["The Fiend Bray Wyatt", 92], ["The Miz", 81], ["The Rock", 96],
  ["Triple H", 91], ["Uncle Howdy", 87], ["Undertaker", 96], ["Wade Barrett", 85],
  // ── Community Creations / Legends ─────────────────────────────────────────
  ["Dean Ambrose", 89], ["Chris Jericho", 90], ["Edge", 92], ["Jeff Hardy", 90],
  ["Christian", 89], ["Sting", 92], ["Daniel Bryan", 94], ["Kazuchika Okada", 93]
].filter(([, r]) => r >= 80)

export const PLAYERS = [
  "Srikant Freakin' Hamsa",
  'Ashpak "KVD\'s Nightmare"',
  'KVD "The Never Seen 17"',
  'Ekansh "The Beast" Tiwari',
  'Debu "The Tribal Chief"',
]

export const ADMIN_PLAYER = PLAYERS[0]

export const PLAYER_DISPLAY = {
  "Srikant Freakin' Hamsa": { first: 'Srikant', gimmick: "Freakin' Hamsa" },
  'Ashpak "KVD\'s Nightmare"': { first: 'Ashpak', gimmick: '"KVD\'s Nightmare"' },
  'KVD "The Never Seen 17"': { first: 'KVD', gimmick: '"The Never Seen 17"' },
  'Ekansh "The Beast" Tiwari': { first: 'Ekansh', gimmick: '"The Beast" Tiwari' },
  'Debu "The Tribal Chief"': { first: 'Debu', gimmick: '"The Tribal Chief"' },
}

export const STARTING_PURSE = 100000
export const BID_INCREMENT = 500
// no timer — Srikant manually advances rounds

export function getBaseBid(ovr) {
  if (ovr >= 90) return 3000
  if (ovr >= 85) return 2000
  return 1000
}

export function getTier(ovr) {
  if (ovr >= 90) return { label: 'S', color: '#c8a84b' }
  if (ovr >= 85) return { label: 'A', color: '#a0a0a0' }
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
