import React, { useState } from 'react'
import { supabase, PLAYERS, ROSTER, STARTING_PURSE, shuffle, getBaseBid } from '../lib/supabase.js'

const styles = {
  root: {
    minHeight: '100vh',
    background: '#0a0a0a',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem 1rem',
    position: 'relative',
    overflow: 'hidden',
  },
  scanlines: {
    position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
    background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)',
  },
  vignette: {
    position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
    background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.8) 100%)',
  },
  content: { position: 'relative', zIndex: 1, width: '100%', maxWidth: '480px', textAlign: 'center' },
  logo: {
    fontFamily: 'Bebas Neue', fontSize: 'clamp(3.5rem, 12vw, 5.5rem)',
    color: '#c8a84b', letterSpacing: '0.05em', lineHeight: 1,
    textShadow: '0 0 60px rgba(200,168,75,0.4)',
  },
  subtitle: {
    fontFamily: 'Barlow Condensed', fontSize: '1rem', letterSpacing: '0.4em',
    color: '#555', marginTop: '0.25rem', marginBottom: '3rem', textTransform: 'uppercase',
  },
  sectionLabel: {
    fontFamily: 'Barlow Condensed', fontSize: '0.75rem', letterSpacing: '0.3em',
    color: '#c8a84b', textTransform: 'uppercase', marginBottom: '1rem',
  },
  playerGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '2rem',
  },
  playerBtn: {
    padding: '1.25rem 1rem',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '4px',
    cursor: 'pointer',
    fontFamily: 'Barlow Condensed',
    fontSize: '1.2rem',
    fontWeight: 600,
    letterSpacing: '0.1em',
    color: '#aaa',
    transition: 'all 0.2s',
    textTransform: 'uppercase',
  },
  playerBtnActive: {
    background: 'rgba(200,168,75,0.15)',
    border: '1px solid #c8a84b',
    color: '#c8a84b',
    textShadow: '0 0 20px rgba(200,168,75,0.5)',
  },
  divider: { height: '1px', background: 'rgba(255,255,255,0.07)', margin: '2rem 0' },
  startBtn: {
    width: '100%', padding: '1.1rem',
    background: 'linear-gradient(135deg, #c8a84b, #9a7a2a)',
    border: 'none', borderRadius: '4px',
    fontFamily: 'Bebas Neue', fontSize: '1.4rem', letterSpacing: '0.15em',
    color: '#0a0a0a', cursor: 'pointer',
    transition: 'opacity 0.2s, transform 0.1s',
  },
  joinBtn: {
    width: '100%', padding: '1.1rem',
    background: 'transparent',
    border: '1px solid rgba(200,168,75,0.4)',
    borderRadius: '4px',
    fontFamily: 'Bebas Neue', fontSize: '1.4rem', letterSpacing: '0.15em',
    color: '#c8a84b', cursor: 'pointer',
    transition: 'all 0.2s',
  },
  statusBox: {
    background: 'rgba(200,168,75,0.08)', border: '1px solid rgba(200,168,75,0.2)',
    borderRadius: '4px', padding: '1rem', marginBottom: '1.5rem',
    fontFamily: 'Barlow Condensed', fontSize: '0.95rem', color: '#888',
    letterSpacing: '0.05em',
  },
}

export default function Lobby({ onSelect, gameState }) {
  const [selected, setSelected] = useState(null)
  const [starting, setStarting] = useState(false)

  const isActive = gameState?.phase === 'bidding' || gameState?.phase === 'sold'
  const isAdmin = selected === 'Srikant'

  async function startAuction() {
    if (!selected) return
    setStarting(true)
    const shuffled = shuffle(ROSTER)
    const purses = {}
    PLAYERS.forEach(p => purses[p] = STARTING_PURSE)
    const firstStar = shuffled[0]

    await supabase.from('auction_state').upsert({
      id: 1,
      phase: 'bidding',
      roster: shuffled,
      roster_index: 0,
      current_superstar: firstStar[0],
      current_ovr: firstStar[1],
      current_bid: getBaseBid(firstStar[1]),
      current_leader: null,
      timer_end: new Date(Date.now() + 30000).toISOString(),
      purses,
      sold_log: [],
    })
    onSelect(selected)
  }

  async function joinAuction() {
    if (!selected) return
    onSelect(selected)
  }

  return (
    <div style={styles.root}>
      <div style={styles.scanlines} />
      <div style={styles.vignette} />
      <div style={styles.content}>
        <div style={styles.logo}>WWE 2K25</div>
        <div style={styles.subtitle}>Superstar Auction</div>

        {isActive && (
          <div style={styles.statusBox}>
            Auction in progress — pick your name to jump in
          </div>
        )}

        <div style={styles.sectionLabel}>Select Your Name</div>
        <div style={styles.playerGrid}>
          {PLAYERS.map(p => (
            <button
              key={p}
              style={{ ...styles.playerBtn, ...(selected === p ? styles.playerBtnActive : {}) }}
              onClick={() => setSelected(p)}
            >
              {p}
            </button>
          ))}
        </div>

        <div style={styles.divider} />

        {isActive ? (
          <button
            style={{ ...styles.joinBtn, opacity: selected ? 1 : 0.4 }}
            onClick={joinAuction}
            disabled={!selected}
          >
            Join Auction →
          </button>
        ) : (
          <div>
            {isAdmin ? (
              <button
                style={{ ...styles.startBtn, opacity: selected && !starting ? 1 : 0.5 }}
                onClick={startAuction}
                disabled={!selected || starting}
              >
                {starting ? 'Starting...' : 'Start Auction'}
              </button>
            ) : (
              <div style={{ ...styles.statusBox, textAlign: 'center' }}>
                Waiting for Srikant to start the auction...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
