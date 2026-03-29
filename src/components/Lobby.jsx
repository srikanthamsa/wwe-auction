import React, { useState } from 'react'
import { supabase, PLAYERS, ADMIN_PLAYER, PLAYER_DISPLAY, ROSTER, STARTING_PURSE, shuffle, getBaseBid } from '../lib/supabase.js'

const PLAYER_COLORS = {
  "Srikant Freakin' Hamsa":    '#818cf8',
  'Ashpak "KVD\'s Nightmare"': '#34d399',
  'KVD "The Never Seen 17"':   '#fbbf24',
  'Ekansh "The Beast" Tiwari': '#e879f9',
  'Debu "The Tribal Chief"':   '#fb7185',
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return `${r},${g},${b}`
}

export default function Lobby({ onSelect, gameState, onReset }) {
  const [selected, setSelected]         = useState(null)
  const [starting, setStarting]         = useState(false)
  const [resetting, setResetting]       = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  const isActive = gameState?.phase === 'bidding'
  const isAdmin  = selected === ADMIN_PLAYER

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
    setResetting(false); setConfirmReset(false); setSelected(null)
  }

  return (
    <div style={{ position:'relative', zIndex:1, minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'2rem 1.5rem', fontFamily:'Outfit, sans-serif' }}>
      <style>{`
        @keyframes shimmer  { 0%{background-position:200% center} 100%{background-position:-200% center} }
        @keyframes fadeUp   { 0%{opacity:0;transform:translateY(18px)} 100%{opacity:1;transform:translateY(0)} }
        @keyframes floatY   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }

        .player-btn { transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease; cursor: pointer; }
        .player-btn:hover  { transform: translateY(-2px); filter: brightness(1.12); }
        .player-btn:active { transform: translateY(1px) scale(0.98); }
        .start-btn  { transition: transform 0.15s ease, box-shadow 0.15s ease; cursor: pointer; }
        .start-btn:not(:disabled):hover  { transform: translateY(-2px); box-shadow: 0 12px 44px rgba(124,58,237,0.55) !important; }
        .start-btn:not(:disabled):active { transform: translateY(1px); }
        .start-btn:disabled { opacity: 0.35; cursor: not-allowed; }
      `}</style>

      <div style={{ width:'100%', maxWidth:500, animation:'fadeUp 0.5s ease' }}>

        {/* Title */}
        <div style={{ textAlign:'center', marginBottom:'3rem' }}>
          <div style={{ position:'relative', display:'inline-block', animation:'floatY 4s ease-in-out infinite' }}>
            <div style={{ fontFamily:'Bebas Neue', fontSize:'clamp(3.5rem,14vw,6.5rem)', letterSpacing:'0.08em', lineHeight:0.95, background:'linear-gradient(135deg,#a78bfa 0%,#ec4899 50%,#fbbf24 100%)', backgroundSize:'200% auto', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', animation:'shimmer 5s linear infinite' }}>
              WWE 2K25
            </div>
          </div>
          <div style={{ fontSize:'0.8rem', letterSpacing:'0.5em', color:'rgba(167,139,250,0.45)', marginTop:'0.5rem', textTransform:'uppercase' }}>
            Superstar Auction House
          </div>
          <div style={{ marginTop:'0.75rem', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.6rem' }}>
            <div style={{ height:1, width:50, background:'linear-gradient(90deg,transparent,rgba(139,92,246,0.4))' }} />
            <span style={{ fontSize:'0.62rem', letterSpacing:'0.25em', color:'rgba(167,139,250,0.3)' }}>
              {ROSTER.length} SUPERSTARS · ₹{STARTING_PURSE.toLocaleString()} PURSE
            </span>
            <div style={{ height:1, width:50, background:'linear-gradient(90deg,rgba(139,92,246,0.4),transparent)' }} />
          </div>
        </div>

        {/* Active notice */}
        {isActive && (
          <div style={{ marginBottom:'1.5rem', padding:'0.75rem 1rem', background:'rgba(251,191,36,0.07)', boxShadow:'inset 0 0 0 1px rgba(251,191,36,0.2)', borderRadius:14, textAlign:'center' }}>
            <span style={{ fontSize:'0.8rem', letterSpacing:'0.25em', color:'#fbbf24' }}>⚡ AUCTION IN PROGRESS — REJOIN BELOW</span>
          </div>
        )}

        {/* Player grid */}
        <div style={{ marginBottom:'2.5rem', background:'rgba(6,2,14,0.55)', padding:'1.75rem', borderRadius:'24px', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', boxShadow:'0 8px 32px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(167,139,250,0.1)' }}>
          <div style={{ fontSize:'0.7rem', letterSpacing:'0.4em', color:'rgba(167,139,250,0.5)', marginBottom:'1.25rem', textTransform:'uppercase', textAlign:'center', fontWeight:'600' }}>Select Your Profile</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'0.65rem' }}>
            {PLAYERS.map(p => {
              const col    = PLAYER_COLORS[p]
              const rgb    = hexToRgb(col)
              const active = selected === p
              const disp   = PLAYER_DISPLAY[p] || { first: p, gimmick: '' }
              return (
                <button key={p} className="player-btn" onClick={() => setSelected(p)}
                  style={{
                    padding:'1rem 0.85rem',
                    background: active ? `rgba(${rgb},0.14)` : 'rgba(255,255,255,0.04)',
                    boxShadow: active
                      ? `inset 0 0 0 1px ${col}, 0 0 28px rgba(${rgb},0.22), inset 0 0 24px rgba(${rgb},0.06)`
                      : 'inset 0 0 0 1px rgba(255,255,255,0.07)',
                    borderRadius:16, border:'none',
                    textAlign:'left',
                    textShadow: active ? `0 0 20px rgba(${rgb},0.6)` : 'none',
                  }}>
                  <div style={{ fontFamily:'Bebas Neue', fontSize:'1.25rem', letterSpacing:'0.1em', color: active ? col : 'rgba(255,255,255,0.45)', lineHeight:1.1 }}>
                    {disp.first}
                  </div>
                  <div style={{ fontSize:'0.62rem', letterSpacing:'0.06em', color: active ? `rgba(${rgb},0.7)` : 'rgba(167,139,250,0.25)', marginTop:'0.15rem', lineHeight:1.3 }}>
                    {disp.gimmick}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height:1, background:'linear-gradient(90deg,transparent,rgba(139,92,246,0.22),transparent)', margin:'1.5rem 0' }} />

        {/* CTA */}
        {isActive ? (
          <div className="glow-wrap glow-wrap-full">
            <div className="glow-layer" style={{ opacity: selected ? 0.55 : 0.1 }} />
            <button className="glow-inner start-btn" onClick={() => selected && onSelect(selected)} disabled={!selected}
              style={{ padding:'1.1rem', borderRadius:16, fontFamily:'Bebas Neue', fontSize:'1.25rem', letterSpacing:'0.2em', width:'100%' }}>
              Rejoin Auction →
            </button>
          </div>
        ) : isAdmin ? (
          <div className="glow-wrap glow-wrap-full">
            <div className="glow-layer" />
            <button className="glow-inner start-btn" onClick={startAuction} disabled={!selected || starting}
              style={{ padding:'1.15rem', borderRadius:16, fontFamily:'Bebas Neue', fontSize:'1.35rem', letterSpacing:'0.2em', width:'100%' }}>
              {starting ? '✦ Shuffling roster...' : '✦ Start Auction'}
            </button>
          </div>
        ) : (
          <div style={{ textAlign:'center', padding:'1rem', fontSize:'0.9rem', color:'rgba(167,139,250,0.35)', letterSpacing:'0.15em' }}>
            {selected ? 'Waiting for Srikant to start...' : 'Select your name above'}
          </div>
        )}

        {/* Admin reset */}
        {isAdmin && (
          <div style={{ marginTop:'1.5rem', textAlign:'center' }}>
            {!confirmReset ? (
              <button onClick={() => setConfirmReset(true)}
                style={{ background:'none', border:'none', fontSize:'0.65rem', letterSpacing:'0.2em', color:'rgba(167,139,250,0.2)', cursor:'pointer', textTransform:'uppercase', fontFamily:'Outfit' }}>
                Reset Auction
              </button>
            ) : (
              <div style={{ display:'flex', gap:'0.75rem', justifyContent:'center', alignItems:'center' }}>
                <span style={{ fontSize:'0.8rem', color:'rgba(167,139,250,0.45)', letterSpacing:'0.1em' }}>Sure? Wipes everything.</span>
                <button onClick={doReset} disabled={resetting}
                  style={{ background:'rgba(239,68,68,0.1)', boxShadow:'inset 0 0 0 1px rgba(239,68,68,0.2)', borderRadius:8, padding:'0.35rem 0.8rem', border:'none', fontSize:'0.78rem', letterSpacing:'0.15em', color:'#f87171', cursor:'pointer', fontFamily:'Outfit' }}>
                  {resetting ? 'Resetting...' : 'Yes, reset'}
                </button>
                <button onClick={() => setConfirmReset(false)}
                  style={{ background:'none', border:'none', fontSize:'0.78rem', color:'rgba(167,139,250,0.25)', cursor:'pointer', fontFamily:'Outfit' }}>
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
