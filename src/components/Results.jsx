import React from 'react'
import { PLAYERS, PLAYER_TEAMS, STARTING_PURSE } from '../lib/supabase.js'
import { MARQUEE_PLAYERS } from '../lib/roster.js'
import Atmosphere from './Atmosphere.jsx'
import { PLAYER_COLORS, getPlayerTheme, hexToRgb, formatLakhs } from '../lib/ui.js'

function getBidTrail(sale) {
  if (Array.isArray(sale?.bidTrail) && sale.bidTrail.length > 0) return sale.bidTrail
  if (sale?.winner) return [{ bidder: sale.winner, bid: sale.price }]
  return []
}

export default function Results({ gameState, player, onReset }) {
  const sold = gameState?.sold_log ?? []
  const purses = gameState?.purses ?? {}
  const myTheme = getPlayerTheme(player)

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
    <div className="app-shell">
      <Atmosphere accent={myTheme.accent} secondary={myTheme.secondary} />
      <div className="page-content" style={{ minHeight: '100vh', padding: '2rem 1rem 3rem' }}>
        <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
          <section className="glass-panel-strong" style={{ borderRadius: '36px', padding: '1.6rem 1.6rem 1.8rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <div className="pill" style={{ marginBottom: '1rem' }}>Auction Complete</div>
                <h1 className="screen-title" style={{ marginBottom: '0.7rem' }}>Results & Auction Diary</h1>
                <p className="screen-subtitle">Every winning squad, every final purse, and every serious bidding battle in one polished post-auction view.</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.8rem', minWidth: 'min(100%, 480px)' }}>
                <Metric label="Players Sold" value={`${sold.length}`} />
                <Metric label="Your Purse" value={formatLakhs(purses[player] ?? STARTING_PURSE)} />
                <Metric label="Your Squad" value={`${byPlayer[player]?.length ?? 0}`} />
              </div>
            </div>
          </section>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
            <section className="glass-panel" style={{ borderRadius: '32px', padding: '1.2rem' }}>
              <div className="section-label" style={{ marginBottom: '0.9rem' }}>Standings</div>
              <div style={{ display: 'grid', gap: '0.65rem' }}>
                {standings.map((entry, index) => {
                  const color = PLAYER_COLORS[entry.name]
                  const theme = getPlayerTheme(entry.name)
                  const isMe = entry.name === player
                  return (
                    <div
                      key={entry.name}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '52px 1fr auto',
                        gap: '0.8rem',
                        alignItems: 'center',
                        padding: '0.95rem',
                        borderRadius: '24px',
                        background: isMe ? `linear-gradient(135deg, rgba(${hexToRgb(color)}, 0.18), rgba(255,255,255,0.04))` : 'rgba(255,255,255,0.035)',
                        border: `1px solid ${isMe ? `${color}55` : 'rgba(255,255,255,0.06)'}`,
                        boxShadow: isMe ? `0 18px 40px ${theme.glow}` : 'none',
                      }}
                    >
                      <div style={{ width: 52, height: 52, borderRadius: '18px', display: 'grid', placeItems: 'center', background: `rgba(${hexToRgb(color)}, 0.18)`, color, fontWeight: 800 }}>
                        {index + 1}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, color }}>{entry.name}</div>
                        <div style={{ color: 'var(--soft)', fontSize: '0.9rem' }}>{PLAYER_TEAMS[entry.name]}</div>
                        <div style={{ color: 'var(--muted)', fontSize: '0.84rem', marginTop: '0.2rem' }}>{entry.count} players won</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, color: 'var(--text)' }}>{formatLakhs(entry.remaining)}</div>
                        <div style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>₹{entry.spent.toLocaleString()} spent</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            <section className="glass-panel" style={{ borderRadius: '32px', padding: '1.2rem' }}>
              <div className="section-label" style={{ marginBottom: '0.9rem' }}>Team Squads</div>
              <div style={{ display: 'grid', gap: '0.9rem' }}>
                {PLAYERS.map(name => {
                  const squad = byPlayer[name]
                  if (!squad?.length) return null
                  const color = PLAYER_COLORS[name]
                  return (
                    <div key={name} style={{ padding: '1rem', borderRadius: '26px', background: `linear-gradient(135deg, rgba(${hexToRgb(color)}, 0.14), rgba(255,255,255,0.03))`, border: `1px solid rgba(${hexToRgb(color)}, 0.24)` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.8rem', marginBottom: '0.75rem', alignItems: 'baseline' }}>
                        <div>
                          <div style={{ fontWeight: 800, color }}>{name}</div>
                          <div style={{ color: 'var(--soft)', fontSize: '0.9rem' }}>{PLAYER_TEAMS[name]}</div>
                        </div>
                        <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{squad.length} players</div>
                      </div>
                      <div style={{ display: 'grid', gap: '0.45rem' }}>
                        {squad.slice().sort((a, b) => b.ovr - a.ovr).map((sale, index) => {
                          const isMarquee = MARQUEE_PLAYERS.has(sale.player)
                          return (
                            <div key={`${sale.player}-${index}`} style={{ display: 'grid', gridTemplateColumns: '54px 1fr auto', gap: '0.75rem', alignItems: 'center', padding: '0.8rem 0.9rem', borderRadius: '20px', background: isMarquee ? 'linear-gradient(135deg, rgba(242,198,109,0.16), rgba(255,255,255,0.05))' : 'rgba(255,255,255,0.035)', border: `1px solid ${isMarquee ? 'rgba(242,198,109,0.26)' : 'rgba(255,255,255,0.06)'}` }}>
                              <div style={{ width: 54, height: 54, borderRadius: '16px', display: 'grid', placeItems: 'center', background: isMarquee ? 'rgba(242,198,109,0.18)' : 'rgba(255,255,255,0.06)', color: isMarquee ? 'var(--gold)' : 'var(--soft)', fontWeight: 800 }}>
                                {sale.ovr}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, color: isMarquee ? '#ffe0a2' : 'var(--text)' }}>{sale.player}{isMarquee ? ' ✦' : ''}</div>
                                <div style={{ color: 'var(--muted)', fontSize: '0.84rem' }}>{getBidTrail(sale).length} bids recorded</div>
                              </div>
                              <div style={{ fontWeight: 800 }}>₹{sale.price.toLocaleString()}</div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          </div>

          <section className="glass-panel" style={{ borderRadius: '32px', padding: '1.2rem', marginTop: '1rem' }}>
            <div className="section-label" style={{ marginBottom: '0.9rem' }}>Auction Diary</div>
            <div style={{ display: 'grid', gap: '0.8rem' }}>
              {[...sold].reverse().map((sale, index) => {
                const isMarquee = MARQUEE_PLAYERS.has(sale.player)
                const trail = getBidTrail(sale)
                return (
                  <div key={`${sale.player}-${index}-trail`} style={{ padding: '1rem', borderRadius: '26px', background: isMarquee ? 'linear-gradient(135deg, rgba(242,198,109,0.14), rgba(255,255,255,0.04))' : 'rgba(255,255,255,0.03)', border: `1px solid ${isMarquee ? 'rgba(242,198,109,0.22)' : 'rgba(255,255,255,0.06)'}` }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <div>
                        <div style={{ fontWeight: 800, color: isMarquee ? '#ffe0a2' : 'var(--text)' }}>{sale.player}{isMarquee ? ' ✦' : ''}</div>
                        <div style={{ color: 'var(--muted)', fontSize: '0.84rem' }}>Won by {sale.winner} • {PLAYER_TEAMS[sale.winner]}</div>
                      </div>
                      <div style={{ color: PLAYER_COLORS[sale.winner], fontWeight: 700 }}>{sale.winner}</div>
                      <div style={{ fontWeight: 800 }}>₹{sale.price.toLocaleString()}</div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                      {trail.map((step, trailIndex) => (
                        <div key={`${sale.player}-${trailIndex}`} style={{ padding: '0.48rem 0.7rem', borderRadius: '999px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', color: 'var(--soft)', fontSize: '0.84rem', fontWeight: 600 }}>
                          {trailIndex + 1}. {step.bidder} bid ₹{step.bid.toLocaleString()}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {player === 'Srikant' && (
            <button className="btn btn-danger" onClick={onReset} style={{ width: '100%', marginTop: '1rem' }}>
              Reset & Start New Auction
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value }) {
  return (
    <div className="glass-panel" style={{ borderRadius: '22px', padding: '0.95rem' }}>
      <div className="section-label" style={{ marginBottom: '0.45rem' }}>{label}</div>
      <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{value}</div>
    </div>
  )
}
