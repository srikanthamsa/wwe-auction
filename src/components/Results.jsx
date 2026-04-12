import React from 'react'
import { PLAYERS, PLAYER_TEAMS, STARTING_PURSE, formatINR } from '../lib/supabase.js'
import { MARQUEE_PLAYERS } from '../lib/roster.js'

const PLAYER_COLORS = {
  Srikant: '#e60026',
  Ashpak: '#f96a17',
  KVD: '#f0c040',
  Ekansh: '#6a3fa0',
  Debu: '#005da0',
}

function getBidTrail(sale) {
  if (Array.isArray(sale?.bidTrail) && sale.bidTrail.length > 0) return sale.bidTrail
  if (sale?.winner) return [{ bidder: sale.winner, bid: sale.price }]
  return []
}

export default function Results({ gameState, player, onReset }) {
  const sold = gameState?.sold_log ?? []
  const purses = gameState?.purses ?? {}

  const byPlayer = {}
  PLAYERS.forEach(name => { byPlayer[name] = [] })
  sold.forEach(sale => {
    if (sale.winner) byPlayer[sale.winner]?.push(sale)
  })

  const standings = PLAYERS.map(name => ({
    name,
    spent: byPlayer[name].reduce((total, sale) => total + sale.price, 0),
    count: byPlayer[name].length,
    remaining: purses[name] ?? STARTING_PURSE,
  })).sort((a, b) => b.count - a.count || b.spent - a.spent)

  return (
    <div style={{ minHeight: '100vh', background: '#06040a', padding: '2rem 1.25rem', overflowY: 'auto' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem', paddingTop: '1rem' }}>
          <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.7rem', letterSpacing: '0.4em', color: '#3a3028', marginBottom: '0.5rem' }}>AUCTION COMPLETE</div>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: 'clamp(3rem, 12vw, 5rem)', color: '#c8a84b', letterSpacing: '0.05em', textShadow: '0 0 60px rgba(200,168,75,0.2)' }}>IPL Mega Auction</div>
          <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.85rem', color: '#2a2020', letterSpacing: '0.2em', marginTop: '0.25rem' }}>{sold.length} players sold</div>
        </div>

        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.6rem', letterSpacing: '0.35em', color: '#252525', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Final Standings</div>
          {standings.map((entry, index) => {
            const col = PLAYER_COLORS[entry.name]
            const isMe = entry.name === player
            return (
              <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', marginBottom: '0.4rem', background: isMe ? 'rgba(200,168,75,0.06)' : 'rgba(255,255,255,0.015)', border: `1px solid ${isMe ? 'rgba(200,168,75,0.18)' : 'rgba(255,255,255,0.04)'}`, borderRadius: '2px' }}>
                <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.5rem', color: index === 0 ? '#c8a84b' : '#1e1e1e', minWidth: '1.5rem' }}>{index + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.15rem', color: col, letterSpacing: '0.06em' }}>{entry.name} <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{PLAYER_TEAMS[entry.name]}</span></div>
                  <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.7rem', color: '#2a2020', letterSpacing: '0.1em' }}>{entry.count} players · {formatINR(entry.remaining)} remaining</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.1rem', color: '#7a6535', letterSpacing: '0.05em' }}>{formatINR(entry.spent)}</div>
                  <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.65rem', color: '#252525' }}>spent</div>
                </div>
              </div>
            )
          })}
        </div>

        {PLAYERS.map(name => {
          const squad = byPlayer[name]
          if (!squad.length) return null
          const col = PLAYER_COLORS[name]
          return (
            <div key={name} style={{ marginBottom: '2rem' }}>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.1rem', color: col, letterSpacing: '0.1em', marginBottom: '0.5rem', paddingBottom: '0.4rem', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                {name} ({PLAYER_TEAMS[name]}) · {squad.length} players
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {squad.sort((a, b) => b.ovr - a.ovr).map((sale, index) => {
                  const isMarquee = MARQUEE_PLAYERS.has(sale.player)
                  return (
                    <div key={`${sale.player}-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.6rem', background: isMarquee ? 'linear-gradient(135deg, rgba(200,168,75,0.14), rgba(255,255,255,0.02))' : 'rgba(255,255,255,0.015)', border: `1px solid ${isMarquee ? 'rgba(248,214,128,0.22)' : 'rgba(255,255,255,0.03)'}`, borderRadius: '2px' }}>
                      <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.7rem', color: '#252525', minWidth: '2.2rem' }}>{sale.ovr}</div>
                      <div style={{ flex: 1, fontFamily: 'Barlow Condensed', fontSize: '0.9rem', fontWeight: 700, color: isMarquee ? '#f1d88b' : '#3a3a3a' }}>
                        {sale.player}{isMarquee ? ' ✦' : ''}
                      </div>
                      <div style={{ fontFamily: 'Bebas Neue', fontSize: '0.85rem', color: '#7a6535' }}>{formatINR(sale.price)}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.6rem', letterSpacing: '0.35em', color: '#252525', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Auction Diary</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[...sold].reverse().map((sale, index) => {
              const trail = getBidTrail(sale)
              const isMarquee = MARQUEE_PLAYERS.has(sale.player)
              return (
                <div key={`${sale.player}-${index}-trail`} style={{ padding: '0.8rem 0.9rem', background: isMarquee ? 'linear-gradient(135deg, rgba(200,168,75,0.12), rgba(255,255,255,0.02))' : 'rgba(255,255,255,0.015)', border: `1px solid ${isMarquee ? 'rgba(248,214,128,0.22)' : 'rgba(255,255,255,0.04)'}`, borderRadius: '2px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.55rem' }}>
                    <div style={{ fontFamily: 'Bebas Neue', fontSize: '0.95rem', color: isMarquee ? '#f1d88b' : '#d7d7d7', letterSpacing: '0.04em', flex: 1 }}>
                      {sale.player}{isMarquee ? ' ✦' : ''}
                    </div>
                    <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.75rem', color: PLAYER_COLORS[sale.winner], letterSpacing: '0.08em' }}>{sale.winner}</div>
                    <div style={{ fontFamily: 'Bebas Neue', fontSize: '0.92rem', color: '#c8a84b' }}>{formatINR(sale.price)}</div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {trail.map((step, trailIndex) => (
                      <div key={`${sale.player}-${trailIndex}`} style={{ padding: '0.28rem 0.45rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '999px', fontFamily: 'Barlow Condensed', fontSize: '0.72rem', color: '#9c9c9c', letterSpacing: '0.04em' }}>
                        {trailIndex + 1}. {step.bidder} {formatINR(step.bid)}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {player === 'Srikant' && (
          <button onClick={onReset} style={{ width: '100%', padding: '1rem', marginTop: '1rem', marginBottom: '3rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '2px', color: '#2a2020', fontFamily: 'Bebas Neue', fontSize: '1rem', letterSpacing: '0.15em', cursor: 'pointer', transition: 'border-color 0.2s' }}>
            Reset & Start New Auction
          </button>
        )}
      </div>
    </div>
  )
}
