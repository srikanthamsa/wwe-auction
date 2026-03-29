import React from 'react'
import { PLAYERS } from '../lib/supabase.js'
import { supabase } from '../lib/supabase.js'

const PLAYER_COLORS = {
  Srikant: '#6c8ebf', Ashpak: '#82b366', KVD: '#d6a94a', Ekansh: '#ae6aaf', Debu: '#bf6060'
}

export default function Results({ gameState, player, onBack }) {
  const sold = gameState?.sold_log ?? []
  const purses = gameState?.purses ?? {}

  const byPlayer = {}
  PLAYERS.forEach(p => byPlayer[p] = [])
  sold.forEach(s => { if (s.winner) byPlayer[s.winner]?.push(s) })

  const totals = PLAYERS.map(p => ({
    name: p,
    spent: sold.filter(s => s.winner === p).reduce((a, s) => a + s.price, 0),
    count: byPlayer[p].length,
    remaining: purses[p] ?? 50000,
  })).sort((a, b) => b.spent - a.spent)

  async function resetAuction() {
    await supabase.from('auction_state').update({ phase: 'lobby' }).eq('id', 1)
    onBack()
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', padding: '1.5rem 1rem', overflowY: 'auto' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: 'clamp(2.5rem, 10vw, 4rem)', color: '#c8a84b', letterSpacing: '0.05em' }}>Auction Complete</div>
          <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.85rem', color: '#555', letterSpacing: '0.2em' }}>{sold.length} SUPERSTARS SOLD</div>
        </div>

        {/* summary table */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.7rem', letterSpacing: '0.25em', color: '#444', marginBottom: '0.75rem' }}>FINAL STANDINGS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {totals.map((p, i) => (
              <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.9rem 1rem', background: p.name === player ? 'rgba(200,168,75,0.07)' : 'rgba(255,255,255,0.02)', border: `1px solid ${p.name === player ? 'rgba(200,168,75,0.2)' : 'rgba(255,255,255,0.05)'}`, borderRadius: '4px' }}>
                <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.3rem', color: '#333', minWidth: '1.5rem' }}>{i + 1}</div>
                <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.2rem', color: PLAYER_COLORS[p.name], flex: 1, letterSpacing: '0.05em' }}>{p.name}</div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'Bebas Neue', fontSize: '1rem', color: '#c8a84b' }}>₹{p.spent.toLocaleString()} spent</div>
                  <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.75rem', color: '#555' }}>{p.count} superstars · ₹{p.remaining.toLocaleString()} left</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* per player rosters */}
        {PLAYERS.map(p => {
          const roster = byPlayer[p]
          if (!roster.length) return null
          return (
            <div key={p} style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.1rem', color: PLAYER_COLORS[p], letterSpacing: '0.1em', marginBottom: '0.5rem', borderBottom: `1px solid rgba(255,255,255,0.06)`, paddingBottom: '0.4rem' }}>
                {p}'s Roster ({roster.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {roster.sort((a, b) => b.ovr - a.ovr).map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '0.4rem 0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '3px' }}>
                    <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.75rem', color: '#444', minWidth: '2rem' }}>{s.ovr}</div>
                    <div style={{ flex: 1, fontFamily: 'Barlow Condensed', fontSize: '0.9rem', color: '#ccc', fontWeight: 600 }}>{s.superstar}</div>
                    <div style={{ fontFamily: 'Bebas Neue', fontSize: '0.85rem', color: '#c8a84b' }}>₹{s.price.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {player === 'Srikant' && (
          <button
            onClick={resetAuction}
            style={{ width: '100%', padding: '1rem', marginTop: '1rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#888', fontFamily: 'Bebas Neue', fontSize: '1.1rem', letterSpacing: '0.1em', cursor: 'pointer' }}
          >
            Reset & Start New Auction
          </button>
        )}

      </div>
    </div>
  )
}
