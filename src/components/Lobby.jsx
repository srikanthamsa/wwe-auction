import React, { useState } from 'react'
import { supabase, PLAYERS, PLAYER_TEAMS, ROSTER, STARTING_PURSE, shuffle, getBaseBid } from '../lib/supabase.js'

const PLAYER_COLORS = {
  Srikant: '#e60026',  // RCB
  Ashpak: '#f96a17',   // SRH
  KVD: '#f0c040',      // CSK
  Ekansh: '#6a3fa0',   // KKR
  Debu: '#005da0',     // MI
}

export default function Lobby({ onSelect, gameState, onReset }) {
  const [selected, setSelected] = useState(null)
  const [starting, setStarting] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  const isActive = gameState?.phase === 'bidding'
  const isAdmin = selected === 'Srikant'

  async function startAuction() {
    if (!selected) return
    setStarting(true)
    const shuffled = shuffle(ROSTER)
    const purses = {}
    PLAYERS.forEach(p => purses[p] = STARTING_PURSE)
    const first = shuffled[0]
    await supabase.from('auction_state').upsert({
      id: 1, phase: 'bidding',
      roster: shuffled, roster_index: 0,
      current_player: first[0], current_ovr: first[1],
      current_bid: getBaseBid(first[1]), current_leader: null,
      bid_history: [], purses, sold_log: [],
    })
    onSelect(selected)
  }

  async function doReset() {
    setResetting(true)
    await onReset()
    setResetting(false)
    setConfirmReset(false)
    setSelected(null)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#06040a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem', position: 'relative', overflow: 'hidden' }}>

      {/* background glow */}
      <div style={{ position: 'fixed', top: '30%', left: '50%', transform: 'translate(-50%, -50%)', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(200,168,75,0.08) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.06) 3px, rgba(0,0,0,0.06) 4px)' }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '500px' }}>

        {/* wordmark */}
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: 'clamp(3rem, 12vw, 5rem)', color: '#c8a84b', letterSpacing: '0.08em', lineHeight: 1, textShadow: '0 0 80px rgba(200,168,75,0.3)' }}>IPL Mega Auction</div>
          <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.75rem', letterSpacing: '0.45em', color: '#3a3028', marginTop: '0.4rem', textTransform: 'uppercase' }}>Stars, Specialists & Legends Pool</div>
        </div>

        {/* status */}
        {isActive && (
          <div style={{ textAlign: 'center', marginBottom: '2rem', padding: '0.6rem 1rem', background: 'rgba(200,168,75,0.06)', border: '1px solid rgba(200,168,75,0.15)', borderRadius: '2px' }}>
            <span style={{ fontFamily: 'Barlow Condensed', fontSize: '0.8rem', letterSpacing: '0.25em', color: '#7a6535' }}>AUCTION IN PROGRESS — SELECT YOUR NAME TO JOIN</span>
          </div>
        )}

        {/* player selection */}
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.65rem', letterSpacing: '0.35em', color: '#3a3028', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Who are you?</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.6rem' }}>
            {PLAYERS.map(p => {
              const col = PLAYER_COLORS[p]
              const active = selected === p
              return (
                <button key={p} onClick={() => setSelected(p)}
                  style={{
                    padding: '1.1rem 1rem',
                    background: active ? `rgba(${hexToRgb(col)}, 0.12)` : 'rgba(255,255,255,0.02)',
                    border: active ? `1px solid ${col}` : '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '2px', cursor: 'pointer',
                    fontFamily: 'Barlow Condensed', fontSize: '1.05rem', fontWeight: 700,
                    letterSpacing: '0.1em', color: active ? col : '#3a3028',
                    textTransform: 'uppercase', transition: 'all 0.2s',
                    textShadow: active ? `0 0 20px rgba(${hexToRgb(col)}, 0.5)` : 'none',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                  }}>
                  <span>{p}</span>
                  <span style={{ fontSize: '0.65rem', letterSpacing: '0.25em', opacity: active ? 0.9 : 0.4, fontWeight: 400 }}>{PLAYER_TEAMS[p]}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ height: '1px', background: 'rgba(255,255,255,0.04)', margin: '1.75rem 0' }} />

        {/* action button */}
        {isActive ? (
          <button onClick={() => onSelect(selected)} disabled={!selected}
            style={{ width: '100%', padding: '1.1rem', background: 'transparent', border: `1px solid ${selected ? 'rgba(200,168,75,0.5)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '2px', fontFamily: 'Bebas Neue', fontSize: '1.2rem', letterSpacing: '0.2em', color: selected ? '#c8a84b' : '#2a2a2a', cursor: selected ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}>
            Join Auction →
          </button>
        ) : isAdmin ? (
          <button onClick={startAuction} disabled={!selected || starting}
            style={{ width: '100%', padding: '1.15rem', background: 'linear-gradient(135deg, #c8a84b 0%, #9a7a2a 100%)', border: 'none', borderRadius: '2px', fontFamily: 'Bebas Neue', fontSize: '1.3rem', letterSpacing: '0.2em', color: '#06040a', cursor: starting ? 'wait' : 'pointer', opacity: starting ? 0.7 : 1, transition: 'opacity 0.2s', boxShadow: '0 0 40px rgba(200,168,75,0.2)' }}>
            {starting ? 'Shuffling player pool...' : 'Start Auction'}
          </button>
        ) : (
          <div style={{ textAlign: 'center', padding: '1rem', fontFamily: 'Barlow Condensed', fontSize: '0.85rem', color: '#333', letterSpacing: '0.15em' }}>
            {selected ? `Waiting for Srikant to start...` : 'Select your name above'}
          </div>
        )}

        {/* reset — admin only, confirm flow */}
        {isAdmin && (
          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            {!confirmReset ? (
              <button onClick={() => setConfirmReset(true)}
                style={{ background: 'none', border: 'none', fontFamily: 'Barlow Condensed', fontSize: '0.75rem', letterSpacing: '0.2em', color: '#2a2020', cursor: 'pointer', textTransform: 'uppercase' }}>
                Reset Auction
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', alignItems: 'center' }}>
                <span style={{ fontFamily: 'Barlow Condensed', fontSize: '0.8rem', color: '#555', letterSpacing: '0.1em' }}>Sure? This wipes everything.</span>
                <button onClick={doReset} disabled={resetting}
                  style={{ background: 'none', border: '1px solid rgba(200,60,60,0.4)', borderRadius: '2px', padding: '0.3rem 0.75rem', fontFamily: 'Barlow Condensed', fontSize: '0.75rem', letterSpacing: '0.15em', color: '#a03030', cursor: 'pointer' }}>
                  {resetting ? 'Resetting...' : 'Yes, reset'}
                </button>
                <button onClick={() => setConfirmReset(false)}
                  style={{ background: 'none', border: 'none', fontFamily: 'Barlow Condensed', fontSize: '0.75rem', color: '#333', cursor: 'pointer', letterSpacing: '0.1em' }}>
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}
