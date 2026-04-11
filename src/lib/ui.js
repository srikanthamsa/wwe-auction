export const PLAYER_COLORS = {
  Srikant: '#ff5c65',
  Ashpak: '#ff8f3d',
  KVD: '#ffd166',
  Ekansh: '#8c7cff',
  Debu: '#4db6ff',
}

export const PLAYER_SURFACES = {
  Srikant: { accent: '#ff5c65', secondary: '#ffae73', glow: 'rgba(255, 92, 101, 0.22)' },
  Ashpak: { accent: '#ff8f3d', secondary: '#ffc857', glow: 'rgba(255, 143, 61, 0.22)' },
  KVD: { accent: '#ffd166', secondary: '#fff0a8', glow: 'rgba(255, 209, 102, 0.2)' },
  Ekansh: { accent: '#8c7cff', secondary: '#c2b8ff', glow: 'rgba(140, 124, 255, 0.22)' },
  Debu: { accent: '#4db6ff', secondary: '#7be0ff', glow: 'rgba(77, 182, 255, 0.22)' },
}

export function hexToRgb(hex) {
  const normalized = hex.replace('#', '')
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  return `${r}, ${g}, ${b}`
}

export function getPlayerTheme(name) {
  return PLAYER_SURFACES[name] || { accent: '#7c94b6', secondary: '#c5d1e6', glow: 'rgba(124, 148, 182, 0.2)' }
}

export function formatLakhs(amount) {
  return `₹${(amount / 100000).toFixed(2)}L`
}
