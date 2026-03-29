import React, { useState } from 'react'
import { PLAYERS, PLAYER_DISPLAY, STARTING_PURSE } from '../lib/supabase.js'

const PLAYER_COLORS = {
  "Srikant Freakin' Hamsa":    '#818cf8',
  'Ashpak "KVD\'s Nightmare"': '#34d399',
  'KVD "The Never Seen 17"':   '#fbbf24',
  'Ekansh "The Beast" Tiwari': '#e879f9',
  'Debu "The Tribal Chief"':   '#fb7185',
}
const TIER_COLORS = { S:'#fbbf24', A:'#c0c0c0', B:'#cd7f32' }
const RANK_ICONS  = ['🥇','🥈','🥉','4️⃣','5️⃣']

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return `${r},${g},${b}`
}
function pc(name)     { return PLAYER_COLORS[name] || '#a78bfa' }
function pFirst(name) { return PLAYER_DISPLAY[name]?.first || name }

export default function Results({ gameState, player, onReset }) {
  const [expanded, setExpanded]         = useState(player)
  const [confirmReset, setConfirmReset] = useState(false)

  const sold   = gameState?.sold_log ?? []
  const purses = gameState?.purses ?? {}

  const byPlayer = {}
  PLAYERS.forEach(p => byPlayer[p] = [])
  sold.forEach(s => { if (s.winner) byPlayer[s.winner]?.push(s) })

  const standings = PLAYERS.map(p => {
    const roster   = byPlayer[p]
    const spent    = roster.reduce((a, s) => a + s.price, 0)
    const topOvr   = roster.length > 0 ? Math.max(...roster.map(s => s.ovr)) : 0
    const avgOvr   = roster.length > 0 ? Math.round(roster.reduce((a, s) => a + s.ovr, 0) / roster.length) : 0
    const avgPrice = roster.length > 0 ? Math.round(spent / roster.length) : 0
    return { name: p, roster, spent, remaining: purses[p] ?? STARTING_PURSE, topOvr, avgOvr, avgPrice, count: roster.length }
  }).sort((a, b) => b.count - a.count || b.spent - a.spent)

  const totalSold  = sold.length
  const totalValue = sold.reduce((a, s) => a + s.price, 0)
  const avgPrice   = totalSold > 0 ? Math.round(totalValue / totalSold) : 0
  const topSale    = sold.reduce((top, s) => s.price > (top?.price ?? 0) ? s : top, null)

  return (
    <div style={{ position:'relative', zIndex:1, minHeight:'100vh', fontFamily:'Barlow Condensed, sans-serif' }}>
      <style>{`
        @keyframes shimmer  { 0%{background-position:200% center} 100%{background-position:-200% center} }
        @keyframes fadeUp   { 0%{opacity:0;transform:translateY(14px)} 100%{opacity:1;transform:translateY(0)} }
        @keyframes rankGlow { 0%,100%{filter:drop-shadow(0 0 6px rgba(251,191,36,0.4))} 50%{filter:drop-shadow(0 0 14px rgba(251,191,36,0.8))} }
        .stand-row { transition: transform 0.15s ease, filter 0.15s ease; cursor: pointer; }
        .stand-row:hover { transform: translateY(-1px); filter: brightness(1.08); }
        .reset-btn { transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .reset-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(139,92,246,0.35) !important; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:rgba(139,92,246,0.25); border-radius:2px; }
      `}</style>

      <div style={{ maxWidth:700, margin:'0 auto', padding:'2.5rem 1.5rem 4rem' }}>

        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:'2.5rem', animation:'fadeUp 0.5s ease' }}>
          <div style={{ fontSize:'0.75rem', letterSpacing:'0.5em', color:'rgba(167,139,250,0.45)', marginBottom:'0.5rem', textTransform:'uppercase' }}>Auction Complete</div>
          <div style={{ fontFamily:'Bebas Neue', fontSize:'clamp(3rem,12vw,5.5rem)', letterSpacing:'0.06em', lineHeight:0.95, background:'linear-gradient(135deg,#a78bfa 0%,#ec4899 50%,#fbbf24 100%)', backgroundSize:'200% auto', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', animation:'shimmer 5s linear infinite' }}>
            WWE 2K25
          </div>
          <div style={{ fontSize:'0.85rem', color:'rgba(167,139,250,0.35)', letterSpacing:'0.2em', marginTop:'0.3rem' }}>{totalSold} superstars sold</div>
        </div>

        {/* Global stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'0.7rem', marginBottom:'1.75rem', animation:'fadeUp 0.55s ease' }}>
          {[
            { label:'Total Sold',  val: totalSold },
            { label:'Total Value', val: `₹${(totalValue/1000).toFixed(0)}k` },
            { label:'Avg Price',   val: `₹${(avgPrice/1000).toFixed(1)}k` },
          ].map(({ label, val }) => (
            <div key={label} style={{ padding:'0.9rem', background:'rgba(255,255,255,0.04)', boxShadow:'inset 0 0 0 1px rgba(255,255,255,0.07)', borderRadius:14, textAlign:'center' }}>
              <div style={{ fontFamily:'Bebas Neue', fontSize:'1.6rem', color:'#a78bfa', letterSpacing:'0.04em' }}>{val}</div>
              <div style={{ fontSize:'0.58rem', color:'rgba(167,139,250,0.4)', letterSpacing:'0.2em', textTransform:'uppercase', marginTop:2 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Top sale */}
        {topSale && (
          <div style={{ marginBottom:'2rem', padding:'0.9rem 1.2rem', background:'rgba(251,191,36,0.07)', boxShadow:'inset 0 0 0 1px rgba(251,191,36,0.18)', borderRadius:14, display:'flex', alignItems:'center', gap:'0.8rem', animation:'fadeUp 0.6s ease' }}>
            <div style={{ fontSize:'1.6rem', animation:'rankGlow 2.5s ease-in-out infinite' }}>🏆</div>
            <div>
              <div style={{ fontSize:'0.58rem', letterSpacing:'0.3em', color:'rgba(251,191,36,0.55)', marginBottom:2 }}>TOP SALE</div>
              <div style={{ fontFamily:'Bebas Neue', fontSize:'1.15rem', color:'#fbbf24', letterSpacing:'0.06em' }}>{topSale.superstar}</div>
            </div>
            <div style={{ marginLeft:'auto', textAlign:'right' }}>
              <div style={{ fontFamily:'Bebas Neue', fontSize:'1.4rem', color:'#fbbf24', letterSpacing:'0.05em' }}>₹{topSale.price.toLocaleString()}</div>
              <div style={{ fontSize:'0.65rem', color:pc(topSale.winner), letterSpacing:'0.1em' }}>{pFirst(topSale.winner)}</div>
            </div>
          </div>
        )}

        {/* Standings */}
        <Divider label="Final Standings" />
        <div style={{ display:'flex', flexDirection:'column', gap:'0.55rem', marginBottom:'2rem' }}>
          {standings.map((s, i) => {
            const col     = pc(s.name)
            const rgb     = hexToRgb(col)
            const isMe    = s.name === player
            const isFirst = i === 0
            const open    = expanded === s.name
            return (
              <div key={s.name}>
                <div className="stand-row"
                  onClick={() => setExpanded(open ? null : s.name)}
                  style={{ display:'flex', alignItems:'center', gap:'0.75rem', padding:'1rem 1.1rem', background: isFirst ? `rgba(${rgb},0.1)` : isMe ? `rgba(${rgb},0.07)` : 'rgba(255,255,255,0.04)', boxShadow: isFirst ? `inset 0 0 0 1px rgba(${rgb},0.35), 0 0 24px rgba(${rgb},0.1)` : isMe ? `inset 0 0 0 1px rgba(${rgb},0.2)` : 'inset 0 0 0 1px rgba(255,255,255,0.06)', borderRadius: open ? '14px 14px 0 0' : 14 }}>
                  <div style={{ fontSize:'1.7rem', minWidth:'2rem', textAlign:'center', animation: isFirst ? 'rankGlow 2.5s ease-in-out infinite' : 'none' }}>{RANK_ICONS[i]}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'0.4rem', marginBottom:'0.2rem' }}>
                      <span style={{ fontFamily:'Bebas Neue', fontSize:'1.2rem', color:col, letterSpacing:'0.08em', textShadow: isFirst ? `0 0 16px rgba(${rgb},0.5)` : 'none' }}>{pFirst(s.name)}</span>
                      {isMe && <span style={{ fontSize:'0.52rem', color:`rgba(${rgb},0.6)`, background:`rgba(${rgb},0.12)`, padding:'1px 6px', borderRadius:6 }}>YOU</span>}
                    </div>
                    <div style={{ fontSize:'0.68rem', color:'rgba(167,139,250,0.4)', letterSpacing:'0.08em' }}>
                      {s.count} superstars · ₹{s.remaining.toLocaleString()} left · avg OVR {s.avgOvr || '—'}
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontFamily:'Bebas Neue', fontSize:'1.2rem', color:col, letterSpacing:'0.04em' }}>₹{s.spent.toLocaleString()}</div>
                    <div style={{ fontSize:'0.58rem', color:'rgba(167,139,250,0.35)', letterSpacing:'0.1em' }}>SPENT</div>
                  </div>
                  <div style={{ fontSize:'0.75rem', color:'rgba(167,139,250,0.3)', marginLeft:'0.25rem' }}>{open ? '▲' : '▼'}</div>
                </div>

                {open && s.roster.length > 0 && (
                  <div style={{ background:'rgba(6,2,14,0.55)', boxShadow:`inset 0 0 0 1px rgba(${rgb},0.1)`, borderTop:'none', borderRadius:'0 0 14px 14px', padding:'0.85rem' }}>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'0.4rem', marginBottom:'0.7rem' }}>
                      {[
                        { label:'Best OVR',   val: s.topOvr },
                        { label:'Avg OVR',    val: s.avgOvr },
                        { label:'Avg ₹/Star', val: `₹${s.avgPrice>=1000?`${(s.avgPrice/1000).toFixed(1)}k`:s.avgPrice}` },
                      ].map(({ label, val }) => (
                        <div key={label} style={{ textAlign:'center', padding:'0.35rem', background:'rgba(255,255,255,0.04)', borderRadius:9 }}>
                          <div style={{ fontFamily:'Bebas Neue', fontSize:'1.05rem', color:col }}>{val}</div>
                          <div style={{ fontSize:'0.5rem', color:'rgba(167,139,250,0.4)', textTransform:'uppercase', letterSpacing:'0.1em' }}>{label}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:'0.2rem' }}>
                      {s.roster.sort((a, b) => b.ovr - a.ovr).map((star, j) => {
                        const tc = star.ovr >= 90 ? TIER_COLORS.S : star.ovr >= 85 ? TIER_COLORS.A : TIER_COLORS.B
                        return (
                          <div key={j} style={{ display:'flex', alignItems:'center', padding:'0.32rem 0.55rem', background:'rgba(255,255,255,0.03)', borderRadius:8, gap:'0.5rem' }}>
                            <div style={{ fontFamily:'Bebas Neue', fontSize:'0.82rem', color:tc, minWidth:'2rem' }}>{star.ovr}</div>
                            <div style={{ flex:1, fontSize:'0.88rem', fontWeight:600, color:'rgba(226,232,240,0.8)' }}>{star.superstar}</div>
                            <div style={{ fontFamily:'Bebas Neue', fontSize:'0.78rem', color:'rgba(167,139,250,0.45)' }}>₹{star.price>=1000?`${(star.price/1000).toFixed(1)}k`:star.price}</div>
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

        {/* Reset — Srikant only */}
        {player === PLAYERS[0] && (
          <div style={{ textAlign:'center', marginTop:'1rem' }}>
            {!confirmReset ? (
              <button className="reset-btn" onClick={() => setConfirmReset(true)}
                style={{ padding:'1rem 2.5rem', background:'rgba(139,92,246,0.13)', boxShadow:'inset 0 0 0 1px rgba(167,139,250,0.3), 0 4px 24px rgba(139,92,246,0.12)', borderRadius:14, border:'none', fontFamily:'Bebas Neue', fontSize:'1.15rem', letterSpacing:'0.2em', color:'#a78bfa', cursor:'pointer' }}>
                ✦ Start New Auction
              </button>
            ) : (
              <div style={{ display:'flex', gap:'0.75rem', justifyContent:'center', alignItems:'center' }}>
                <span style={{ fontSize:'0.85rem', color:'rgba(167,139,250,0.5)', letterSpacing:'0.1em' }}>Resets everything.</span>
                <button onClick={onReset} style={{ background:'rgba(239,68,68,0.1)', boxShadow:'inset 0 0 0 1px rgba(239,68,68,0.2)', borderRadius:9, padding:'0.4rem 1rem', border:'none', fontSize:'0.82rem', letterSpacing:'0.15em', color:'#f87171', cursor:'pointer', fontFamily:'Barlow Condensed' }}>Yes, reset</button>
                <button onClick={() => setConfirmReset(false)} style={{ background:'none', border:'none', fontSize:'0.82rem', color:'rgba(167,139,250,0.25)', cursor:'pointer', fontFamily:'Barlow Condensed' }}>Cancel</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Divider({ label }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', marginBottom:'0.9rem', fontFamily:'Barlow Condensed', fontSize:'0.6rem', letterSpacing:'0.38em', color:'rgba(167,139,250,0.4)', textTransform:'uppercase' }}>
      <div style={{ flex:1, height:1, background:'rgba(139,92,246,0.15)' }} />
      {label}
      <div style={{ flex:1, height:1, background:'rgba(139,92,246,0.15)' }} />
    </div>
  )
}
