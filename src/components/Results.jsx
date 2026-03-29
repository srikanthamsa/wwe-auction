import React, { useState } from 'react'
import { PLAYERS, STARTING_PURSE } from '../lib/supabase.js'

const PLAYER_COLORS = {
  Srikant: '#818cf8',
  Ashpak:  '#34d399',
  KVD:     '#fbbf24',
  Ekansh:  '#e879f9',
  Debu:    '#fb7185',
}

const TIER_COLORS = { S: '#fbbf24', A: '#c0c0c0', B: '#cd7f32' }

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}

function pc(name) { return PLAYER_COLORS[name] || '#a78bfa' }

const SPARKS = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  x: (i * 14.7 + 6) % 100,
  y: (i * 21.3 + 8) % 100,
  size: (i % 3) + 1,
  delay: ((i * 0.38) % 3).toFixed(2),
  dur:   (1.5 + (i % 5) * 0.4).toFixed(1),
  color: ['#a78bfa', '#e879f9', '#fbbf24', '#818cf8'][i % 4],
}))

const RANK_ICONS = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣']

export default function Results({ gameState, player, onReset }) {
  const [expandedPlayer, setExpandedPlayer] = useState(player)
  const [confirmReset, setConfirmReset]     = useState(false)

  const sold    = gameState?.sold_log ?? []
  const purses  = gameState?.purses ?? {}

  const byPlayer = {}
  PLAYERS.forEach(p => byPlayer[p] = [])
  sold.forEach(s => { if (s.winner) byPlayer[s.winner]?.push(s) })

  const standings = PLAYERS.map(p => {
    const roster  = byPlayer[p]
    const spent   = roster.reduce((a, s) => a + s.price, 0)
    const topOvr  = roster.length > 0 ? Math.max(...roster.map(s => s.ovr)) : 0
    const avgOvr  = roster.length > 0 ? Math.round(roster.reduce((a, s) => a + s.ovr, 0) / roster.length) : 0
    const avgPrice = roster.length > 0 ? Math.round(spent / roster.length) : 0
    return {
      name: p, roster, spent,
      remaining: purses[p] ?? STARTING_PURSE,
      topOvr, avgOvr, avgPrice,
      count: roster.length,
    }
  }).sort((a, b) => b.count - a.count || b.spent - a.spent)

  const totalSold  = sold.length
  const totalValue = sold.reduce((a, s) => a + s.price, 0)
  const avgPrice   = totalSold > 0 ? Math.round(totalValue / totalSold) : 0
  const topSale    = sold.reduce((top, s) => s.price > (top?.price ?? 0) ? s : top, null)

  return (
    <div style={{ minHeight: '100vh', background: '#07040f', fontFamily: 'Barlow Condensed, sans-serif', position: 'relative', overflowX: 'hidden' }}>

      <style>{`
        @keyframes sparkle   { 0%,100%{opacity:0;transform:scale(0.3)} 50%{opacity:1;transform:scale(1)} }
        @keyframes glowPulse { 0%,100%{opacity:0.4} 50%{opacity:0.85} }
        @keyframes fadeUp    { 0%{opacity:0;transform:translateY(16px)} 100%{opacity:1;transform:translateY(0)} }
        @keyframes shimmer   { 0%{background-position:200% center} 100%{background-position:-200% center} }
        @keyframes float     { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes rankGlow  { 0%,100%{text-shadow:0 0 20px rgba(251,191,36,0.4)} 50%{text-shadow:0 0 40px rgba(251,191,36,0.8)} }

        .standing-card { transition: all 0.2s ease; cursor: pointer; }
        .standing-card:hover { transform: translateY(-1px); filter: brightness(1.08); }
        .reset-btn { transition: all 0.2s; }
        .reset-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 20px rgba(139,92,246,0.25); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.25); border-radius: 2px; }
      `}</style>

      {/* Sparkles */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        {SPARKS.map(s => (
          <div key={s.id} style={{ position: 'absolute', left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, borderRadius: '50%', background: s.color, animation: `sparkle ${s.dur}s ${s.delay}s ease-in-out infinite` }} />
        ))}
      </div>

      <div style={{ position: 'fixed', top: '30%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 600, background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0, animation: 'glowPulse 6s ease-in-out infinite' }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 680, margin: '0 auto', padding: '2.5rem 1.25rem 4rem' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem', animation: 'fadeUp 0.5s ease' }}>
          <div style={{ fontSize: '0.7rem', letterSpacing: '0.5em', color: 'rgba(167,139,250,0.45)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Auction Complete</div>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: 'clamp(3rem, 12vw, 5.5rem)', letterSpacing: '0.06em', lineHeight: 0.95, background: 'linear-gradient(135deg, #a78bfa 0%, #ec4899 50%, #fbbf24 100%)', backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', animation: 'shimmer 5s linear infinite' }}>
            WWE 2K25
          </div>
          <div style={{ fontSize: '0.8rem', color: 'rgba(167,139,250,0.35)', letterSpacing: '0.2em', marginTop: '0.3rem' }}>{totalSold} superstars sold</div>
        </div>

        {/* Global stats bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem', marginBottom: '2rem', animation: 'fadeUp 0.55s ease' }}>
          {[
            { label: 'Total Sold', val: totalSold },
            { label: 'Total Value', val: `₹${(totalValue / 1000).toFixed(0)}k` },
            { label: 'Avg Price', val: `₹${(avgPrice / 1000).toFixed(1)}k` },
          ].map(({ label, val }) => (
            <div key={label} style={{ padding: '0.85rem', background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.14)', borderRadius: 12, textAlign: 'center' }}>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.5rem', color: '#a78bfa', letterSpacing: '0.04em' }}>{val}</div>
              <div style={{ fontSize: '0.55rem', color: 'rgba(167,139,250,0.4)', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        {topSale && (
          <div style={{ marginBottom: '2rem', padding: '0.85rem 1.1rem', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: '0.75rem', animation: 'fadeUp 0.6s ease' }}>
            <div style={{ fontSize: '1.5rem' }}>🏆</div>
            <div>
              <div style={{ fontSize: '0.55rem', letterSpacing: '0.3em', color: 'rgba(251,191,36,0.55)', marginBottom: 2 }}>TOP SALE</div>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.1rem', color: '#fbbf24', letterSpacing: '0.06em' }}>{topSale.superstar}</div>
            </div>
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.3rem', color: '#fbbf24', letterSpacing: '0.05em' }}>₹{topSale.price.toLocaleString()}</div>
              <div style={{ fontSize: '0.6rem', color: pc(topSale.winner), letterSpacing: '0.1em' }}>{topSale.winner}</div>
            </div>
          </div>
        )}

        {/* Standings */}
        <div style={{ marginBottom: '2rem' }}>
          <SectionDivider label="Final Standings" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {standings.map((s, i) => {
              const col     = pc(s.name)
              const rgb     = hexToRgb(col)
              const isMe    = s.name === player
              const isFirst = i === 0
              const expanded = expandedPlayer === s.name

              return (
                <div key={s.name}>
                  {/* Standing row */}
                  <div className="standing-card"
                    onClick={() => setExpandedPlayer(expanded ? null : s.name)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.9rem 1rem', background: isFirst ? `rgba(${rgb},0.1)` : isMe ? `rgba(${rgb},0.07)` : 'rgba(139,92,246,0.04)', border: `1px solid ${isFirst ? `rgba(${rgb},0.35)` : isMe ? `rgba(${rgb},0.2)` : 'rgba(139,92,246,0.1)'}`, borderRadius: expanded ? '14px 14px 0 0' : 14, boxShadow: isFirst ? `0 0 24px rgba(${rgb},0.12)` : 'none' }}>

                    <div style={{ fontSize: '1.6rem', minWidth: '2rem', textAlign: 'center', animation: isFirst ? 'rankGlow 2s ease-in-out infinite' : 'none' }}>
                      {RANK_ICONS[i]}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                        <span style={{ fontFamily: 'Bebas Neue', fontSize: '1.15rem', color: col, letterSpacing: '0.08em', textShadow: isFirst ? `0 0 16px rgba(${rgb},0.5)` : 'none' }}>{s.name}</span>
                        {isMe && <span style={{ fontSize: '0.5rem', color: `rgba(${rgb},0.6)`, background: `rgba(${rgb},0.12)`, padding: '1px 6px', borderRadius: 6, letterSpacing: '0.1em' }}>YOU</span>}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'rgba(167,139,250,0.4)', letterSpacing: '0.08em' }}>
                        {s.count} superstars · ₹{s.remaining.toLocaleString()} left · avg OVR {s.avgOvr || '—'}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.15rem', color: col, letterSpacing: '0.04em' }}>₹{s.spent.toLocaleString()}</div>
                      <div style={{ fontSize: '0.55rem', color: 'rgba(167,139,250,0.35)', letterSpacing: '0.1em' }}>SPENT</div>
                    </div>

                    <div style={{ fontSize: '0.7rem', color: 'rgba(167,139,250,0.3)', marginLeft: '0.25rem' }}>{expanded ? '▲' : '▼'}</div>
                  </div>

                  {/* Expanded roster */}
                  {expanded && s.roster.length > 0 && (
                    <div style={{ background: 'rgba(8,4,18,0.6)', border: `1px solid rgba(${rgb},0.12)`, borderTop: 'none', borderRadius: '0 0 14px 14px', padding: '0.75rem' }}>
                      {/* Mini stats */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem', marginBottom: '0.65rem' }}>
                        {[
                          { label: 'Best OVR', val: s.topOvr },
                          { label: 'Avg OVR', val: s.avgOvr },
                          { label: 'Avg ₹/Star', val: `₹${s.avgPrice >= 1000 ? `${(s.avgPrice / 1000).toFixed(1)}k` : s.avgPrice}` },
                        ].map(({ label, val }) => (
                          <div key={label} style={{ textAlign: 'center', padding: '0.35rem', background: 'rgba(139,92,246,0.06)', borderRadius: 8 }}>
                            <div style={{ fontFamily: 'Bebas Neue', fontSize: '1rem', color: col }}>{val}</div>
                            <div style={{ fontSize: '0.5rem', color: 'rgba(167,139,250,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
                          </div>
                        ))}
                      </div>

                      {/* Superstar list */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.18rem' }}>
                        {s.roster.sort((a, b) => b.ovr - a.ovr).map((star, j) => {
                          const tierCol = star.ovr >= 90 ? TIER_COLORS.S : star.ovr >= 85 ? TIER_COLORS.A : TIER_COLORS.B
                          return (
                            <div key={j} style={{ display: 'flex', alignItems: 'center', padding: '0.3rem 0.5rem', background: 'rgba(139,92,246,0.04)', borderRadius: 7, gap: '0.5rem' }}>
                              <div style={{ fontFamily: 'Bebas Neue', fontSize: '0.8rem', color: tierCol, minWidth: '2rem', letterSpacing: '0.03em' }}>{star.ovr}</div>
                              <div style={{ flex: 1, fontSize: '0.85rem', fontWeight: 700, color: 'rgba(226,232,240,0.8)', letterSpacing: '0.01em' }}>{star.superstar}</div>
                              <div style={{ fontFamily: 'Bebas Neue', fontSize: '0.78rem', color: 'rgba(167,139,250,0.45)' }}>₹{star.price >= 1000 ? `${(star.price / 1000).toFixed(1)}k` : star.price}</div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Reset button — Srikant only */}
        {player === 'Srikant' && (
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            {!confirmReset ? (
              <button className="reset-btn" onClick={() => setConfirmReset(true)}
                style={{ padding: '0.9rem 2.5rem', background: 'linear-gradient(135deg, rgba(139,92,246,0.18), rgba(236,72,153,0.12))', border: '1px solid rgba(139,92,246,0.35)', borderRadius: 12, fontFamily: 'Bebas Neue', fontSize: '1.1rem', letterSpacing: '0.2em', color: '#a78bfa', cursor: 'pointer', boxShadow: '0 4px 24px rgba(139,92,246,0.12)' }}>
                ✦ Start New Auction
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'rgba(167,139,250,0.5)', letterSpacing: '0.1em' }}>This resets everything.</span>
                <button onClick={onReset} style={{ background: 'none', border: '1px solid rgba(251,113,133,0.4)', borderRadius: 8, padding: '0.35rem 0.9rem', fontSize: '0.8rem', letterSpacing: '0.15em', color: '#fb7185', cursor: 'pointer', fontFamily: 'Barlow Condensed' }}>Yes, reset</button>
                <button onClick={() => setConfirmReset(false)} style={{ background: 'none', border: 'none', fontSize: '0.8rem', color: 'rgba(167,139,250,0.25)', cursor: 'pointer', fontFamily: 'Barlow Condensed' }}>Cancel</button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

function SectionDivider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.85rem', fontFamily: 'Barlow Condensed', fontSize: '0.58rem', letterSpacing: '0.38em', color: 'rgba(167,139,250,0.4)', textTransform: 'uppercase' }}>
      <div style={{ flex: 1, height: 1, background: 'rgba(139,92,246,0.15)' }} />
      {label}
      <div style={{ flex: 1, height: 1, background: 'rgba(139,92,246,0.15)' }} />
    </div>
  )
}
