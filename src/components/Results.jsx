import React from 'react'
import { PLAYERS } from '../lib/supabase.js'

const PLAYER_COLORS = {
  Srikant: '#6c8ebf', Ashpak: '#82b366', KVD: '#d6a94a', Ekansh: '#ae6aaf', Debu: '#bf6060'
}

export default function Results({ gameState, player, onReset }) {
  const sold = gameState?.sold_log ?? []
  const purses = gameState?.purses ?? {}

  const byPlayer = {}
  PLAYERS.forEach(p => byPlayer[p] = [])
  sold.forEach(s => { if (s.winner) byPlayer[s.winner]?.push(s) })

  const standings = PLAYERS.map(p => ({
    name: p,
    spent: byPlayer[p].reduce((a, s) => a + s.price, 0),
    count: byPlayer[p].length,
    remaining: purses[p] ?? 50000,
  })).sort((a, b) => b.count - a.count || b.spent - a.spent)

  return (
    <div style={{ minHeight: '100vh', background: '#06040a', padding: '2rem 1.25rem', overflowY: 'auto' }}>
      <div style={{ maxWidth: '580px', margin: '0 auto' }}>

        <div style={{ textAlign: 'center', marginBottom: '3rem', paddingTop: '1rem' }}>
          <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.7rem', letterSpacing: '0.4em', color: '#3a3028', marginBottom: '0.5rem' }}>AUCTION COMPLETE</div>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: 'clamp(3rem, 12vw, 5rem)', color: '#c8a84b', letterSpacing: '0.05em', textShadow: '0 0 60px rgba(200,168,75,0.2)' }}>WWE 2K25</div>
          <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.85rem', color: '#2a2020', letterSpacing: '0.2em', marginTop: '0.25rem' }}>{sold.length} superstars sold</div>
        </div>

        {/* standings */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.6rem', letterSpacing: '0.35em', color: '#252525', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Final Standings</div>
          {standings.map((p, i) => {
            const col = PLAYER_COLORS[p.name]
            const isMe = p.name === player
            return (
              <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', marginBottom: '0.4rem', background: isMe ? `rgba(200,168,75,0.06)` : 'rgba(255,255,255,0.015)', border: `1px solid ${isMe ? 'rgba(200,168,75,0.18)' : 'rgba(255,255,255,0.04)'}`, borderRadius: '2px' }}>
                <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.5rem', color: i === 0 ? '#c8a84b' : '#1e1e1e', minWidth: '1.5rem' }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.15rem', color: col, letterSpacing: '0.06em' }}>{p.name}</div>
                  <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.7rem', color: '#2a2020', letterSpacing: '0.1em' }}>{p.count} superstars · ₹{p.remaining.toLocaleString()} remaining</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.1rem', color: '#7a6535', letterSpacing: '0.05em' }}>₹{p.spent.toLocaleString()}</div>
                  <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.65rem', color: '#252525' }}>spent</div>
                </div>
              </div>
            )
          })}
        </div>

        {/* per-player rosters */}
        {PLAYERS.map(p => {
          const roster = byPlayer[p]
          if (!roster.length) return null
          const col = PLAYER_COLORS[p]
          return (
            <div key={p} style={{ marginBottom: '2rem' }}>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.1rem', color: col, letterSpacing: '0.1em', marginBottom: '0.5rem', paddingBottom: '0.4rem', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                {p} · {roster.length} superstars
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                {roster.sort((a, b) => b.ovr - a.ovr).map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '0.4rem 0.5rem', background: 'rgba(255,255,255,0.015)', borderRadius: '2px' }}>
                    <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.7rem', color: '#252525', minWidth: '2.2rem' }}>{s.ovr}</div>
                    <div style={{ flex: 1, fontFamily: 'Barlow Condensed', fontSize: '0.9rem', fontWeight: 700, color: '#3a3a3a' }}>{s.superstar}</div>
                    <div style={{ fontFamily: 'Bebas Neue', fontSize: '0.85rem', color: '#7a6535' }}>₹{s.price.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {/* reset — Srikant only */}
        {player === 'Srikant' && (
          <button onClick={onReset}
            style={{ width: '100%', padding: '1rem', marginTop: '1rem', marginBottom: '3rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '2px', color: '#2a2020', fontFamily: 'Bebas Neue', fontSize: '1rem', letterSpacing: '0.15em', cursor: 'pointer', transition: 'border-color 0.2s' }}>
            Reset & Start New Auction
          </button>
        )}
      </div>
    </div>
  )
}
