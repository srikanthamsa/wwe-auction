import React, { useState } from 'react'
import { supabase, PLAYERS, ROSTER, STARTING_PURSE, shuffle, getBaseBid } from '../lib/supabase.js'

const PLAYER_COLORS = {
  Srikant: '#818cf8',
  Ashpak:  '#34d399',
  KVD:     '#fbbf24',
  Ekansh:  '#e879f9',
  Debu:    '#fb7185',
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}

const SPARKS = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  x: (i * 11.3 + 9) % 100,
  y: (i * 17.9 + 5) % 100,
  size: (i % 3) + 1,
  delay: ((i * 0.41) % 3).toFixed(2),
  dur:   (1.3 + (i % 5) * 0.45).toFixed(1),
  color: ['#a78bfa', '#e879f9', '#fbbf24', '#818cf8', '#34d399'][i % 5],
}))

export default function Lobby({ onSelect, gameState, onReset }) {
  const [selected, setSelected]       = useState(null)
  const [starting, setStarting]       = useState(false)
  const [resetting, setResetting]     = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  const isActive = gameState?.phase === 'bidding'
  const isAdmin  = selected === 'Srikant'

  async function startAuction() {
    if (!selected) return
    setStarting(true)
    const shuffled = shuffle(ROSTER)
    const purses   = {}
    PLAYERS.forEach(p => purses[p] = STARTING_PURSE)
    const first = shuffled[0]
    await supabase.from('auction_state').upsert({
      id: 1, phase: 'bidding',
      roster: shuffled, roster_index: 0,
      current_superstar: first[0], current_ovr: first[1],
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
    <div style={{ minHeight: '100vh', background: '#07040f', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem', position: 'relative', overflow: 'hidden', fontFamily: 'Barlow Condensed, sans-serif' }}>

      <style>{`
        @keyframes sparkle   { 0%,100%{opacity:0;transform:scale(0.3)} 50%{opacity:1;transform:scale(1)} }
        @keyframes glowPulse { 0%,100%{opacity:0.4} 50%{opacity:0.85} }
        @keyframes fadeUp    { 0%{opacity:0;transform:translateY(20px)} 100%{opacity:1;transform:translateY(0)} }
        @keyframes shimmer   { 0%{background-position:200% center} 100%{background-position:-200% center} }
        @keyframes float     { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }

        .player-btn { transition: all 0.18s ease; }
        .player-btn:hover { transform: translateY(-2px); filter: brightness(1.15); }
        .player-btn:active { transform: translateY(1px) scale(0.98); }
        .start-btn { transition: all 0.18s ease; }
        .start-btn:not(:disabled):hover { transform: translateY(-2px); box-shadow: 0 8px 40px rgba(139,92,246,0.45) !important; }
        .start-btn:not(:disabled):active { transform: translateY(1px); }
        .start-btn:disabled { opacity: 0.35; cursor: not-allowed; }
      `}</style>

      {/* Sparkles */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        {SPARKS.map(s => (
          <div key={s.id} style={{ position: 'absolute', left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, borderRadius: '50%', background: s.color, animation: `sparkle ${s.dur}s ${s.delay}s ease-in-out infinite` }} />
        ))}
      </div>

      {/* Ambient glows */}
      <div style={{ position: 'fixed', top: '35%', left: '50%', transform: 'translate(-50%,-50%)', width: 700, height: 700, background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0, animation: 'glowPulse 5s ease-in-out infinite' }} />
      <div style={{ position: 'fixed', bottom: '20%', right: '20%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(236,72,153,0.07) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0, animation: 'glowPulse 7s ease-in-out infinite reverse' }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 480, animation: 'fadeUp 0.5s ease' }}>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          {/* Glowing ring behind title */}
          <div style={{ position: 'relative', display: 'inline-block', animation: 'float 4s ease-in-out infinite' }}>
            <div style={{ position: 'absolute', inset: '-24px', background: 'radial-gradient(ellipse, rgba(139,92,246,0.2) 0%, transparent 70%)', borderRadius: '50%', animation: 'glowPulse 3s ease-in-out infinite', pointerEvents: 'none' }} />
            <div style={{ fontFamily: 'Bebas Neue', fontSize: 'clamp(3.5rem, 14vw, 6rem)', letterSpacing: '0.08em', lineHeight: 0.95, background: 'linear-gradient(135deg, #a78bfa 0%, #ec4899 50%, #fbbf24 100%)', backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', animation: 'shimmer 5s linear infinite', position: 'relative' }}>
              WWE 2K25
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', letterSpacing: '0.5em', color: 'rgba(167,139,250,0.45)', marginTop: '0.5rem', textTransform: 'uppercase' }}>
            Superstar Auction House
          </div>
          <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <div style={{ height: 1, width: 40, background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.4))' }} />
            <div style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: 'rgba(167,139,250,0.3)' }}>{ROSTER.length} SUPERSTARS · ₹{STARTING_PURSE.toLocaleString()} PURSE</div>
            <div style={{ height: 1, width: 40, background: 'linear-gradient(90deg, rgba(139,92,246,0.4), transparent)' }} />
          </div>
        </div>

        {/* Active auction notice */}
        {isActive && (
          <div style={{ marginBottom: '1.5rem', padding: '0.7rem 1rem', background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 12, textAlign: 'center' }}>
            <span style={{ fontSize: '0.75rem', letterSpacing: '0.25em', color: '#fbbf24' }}>⚡ AUCTION IN PROGRESS — SELECT YOUR NAME TO REJOIN</span>
          </div>
        )}

        {/* Player selection */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.6rem', letterSpacing: '0.4em', color: 'rgba(167,139,250,0.4)', marginBottom: '0.85rem', textTransform: 'uppercase', textAlign: 'center' }}>Select your name</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.65rem' }}>
            {PLAYERS.map(p => {
              const col    = PLAYER_COLORS[p]
              const rgb    = hexToRgb(col)
              const active = selected === p
              return (
                <button key={p} className="player-btn" onClick={() => setSelected(p)}
                  style={{
                    padding: '1.1rem 1rem',
                    background: active ? `rgba(${rgb}, 0.14)` : 'rgba(139,92,246,0.04)',
                    border: active ? `1px solid ${col}` : '1px solid rgba(139,92,246,0.12)',
                    borderRadius: 14, cursor: 'pointer',
                    fontFamily: 'Bebas Neue', fontSize: '1.2rem', fontWeight: 700,
                    letterSpacing: '0.12em', color: active ? col : 'rgba(167,139,250,0.4)',
                    textTransform: 'uppercase',
                    boxShadow: active ? `0 0 24px rgba(${rgb},0.2), inset 0 0 20px rgba(${rgb},0.06)` : 'none',
                    textShadow: active ? `0 0 20px rgba(${rgb},0.6)` : 'none',
                  }}>
                  {p}
                </button>
              )
            })}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.2), transparent)', margin: '1.5rem 0' }} />

        {/* Action */}
        {isActive ? (
          <button className="start-btn" onClick={() => selected && onSelect(selected)} disabled={!selected}
            style={{ width: '100%', padding: '1.1rem', background: selected ? 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(236,72,153,0.18))' : 'rgba(139,92,246,0.04)', border: `1px solid ${selected ? 'rgba(139,92,246,0.5)' : 'rgba(139,92,246,0.1)'}`, borderRadius: 14, fontFamily: 'Bebas Neue', fontSize: '1.2rem', letterSpacing: '0.2em', color: selected ? '#a78bfa' : 'rgba(167,139,250,0.2)', boxShadow: selected ? '0 4px 30px rgba(139,92,246,0.2)' : 'none' }}>
            Rejoin Auction →
          </button>
        ) : isAdmin ? (
          <button className="start-btn" onClick={startAuction} disabled={!selected || starting}
            style={{ width: '100%', padding: '1.15rem', background: 'linear-gradient(135deg, #7c3aed, #a21caf)', border: 'none', borderRadius: 14, fontFamily: 'Bebas Neue', fontSize: '1.3rem', letterSpacing: '0.2em', color: '#fff', cursor: starting ? 'wait' : 'pointer', boxShadow: '0 4px 30px rgba(124,58,237,0.35)', opacity: starting ? 0.7 : 1, textShadow: '0 0 20px rgba(255,255,255,0.3)' }}>
            {starting ? '✦ Shuffling roster...' : '✦ Start Auction'}
          </button>
        ) : (
          <div style={{ textAlign: 'center', padding: '1rem', fontSize: '0.85rem', color: 'rgba(167,139,250,0.35)', letterSpacing: '0.15em' }}>
            {selected ? `Waiting for Srikant to start...` : 'Select your name above to continue'}
          </div>
        )}

        {/* Admin reset */}
        {isAdmin && (
          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            {!confirmReset ? (
              <button onClick={() => setConfirmReset(true)}
                style={{ background: 'none', border: 'none', fontSize: '0.65rem', letterSpacing: '0.2em', color: 'rgba(167,139,250,0.2)', cursor: 'pointer', textTransform: 'uppercase', fontFamily: 'Barlow Condensed' }}>
                Reset Auction
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'rgba(167,139,250,0.45)', letterSpacing: '0.1em' }}>Sure? This wipes everything.</span>
                <button onClick={doReset} disabled={resetting}
                  style={{ background: 'none', border: '1px solid rgba(251,113,133,0.4)', borderRadius: 6, padding: '0.3rem 0.75rem', fontSize: '0.75rem', letterSpacing: '0.15em', color: '#fb7185', cursor: 'pointer', fontFamily: 'Barlow Condensed' }}>
                  {resetting ? 'Resetting...' : 'Yes, reset'}
                </button>
                <button onClick={() => setConfirmReset(false)}
                  style={{ background: 'none', border: 'none', fontSize: '0.75rem', color: 'rgba(167,139,250,0.25)', cursor: 'pointer', fontFamily: 'Barlow Condensed' }}>
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
