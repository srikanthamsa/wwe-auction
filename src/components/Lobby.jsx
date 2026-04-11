import React, { useMemo, useState } from 'react'
import { supabase, PLAYERS, PLAYER_TEAMS, ROSTER, STARTING_PURSE, shuffle, getBaseBid } from '../lib/supabase.js'
import Atmosphere from './Atmosphere.jsx'
import { PLAYER_COLORS, getPlayerTheme, hexToRgb, formatLakhs } from '../lib/ui.js'

export default function Lobby({ onSelect, gameState, onReset }) {
  const [selected, setSelected] = useState(null)
  const [starting, setStarting] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  const isActive = gameState?.phase === 'bidding'
  const isAdmin = selected === 'Srikant'
  const selectedTheme = getPlayerTheme(selected)

  const rosterMeta = useMemo(() => {
    const marqueeCount = ROSTER.filter(([name]) => name.includes('Virat') || name.includes('Dhoni') || name.includes('Sachin') || name.includes('AB de Villiers')).length
    return {
      total: ROSTER.length,
      marqueeCount,
    }
  }, [])

  async function startAuction() {
    if (!selected) return
    setStarting(true)
    const shuffled = shuffle(ROSTER)
    const purses = {}
    PLAYERS.forEach(name => { purses[name] = STARTING_PURSE })
    const first = shuffled[0]
    await supabase.from('auction_state').upsert({
      id: 1,
      phase: 'bidding',
      roster: shuffled,
      roster_index: 0,
      current_player: first[0],
      current_ovr: first[1],
      current_bid: getBaseBid(first[1]),
      current_leader: null,
      bid_history: [],
      purses,
      sold_log: [],
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
    <div className="app-shell">
      <Atmosphere accent={selectedTheme.accent} secondary={selectedTheme.secondary} />
      <div className="page-content" style={{ minHeight: '100vh', padding: '2rem 1.1rem' }}>
        <div style={{ maxWidth: '1080px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.1rem' }}>
          <section className="glass-panel-strong" style={{ borderRadius: '36px', padding: '2rem', animation: 'fadeRise 260ms ease forwards' }}>
            <div className="pill" style={{ marginBottom: '1.1rem' }}>IPL 2026 Format</div>
            <h1 className="screen-title" style={{ maxWidth: '10ch', marginBottom: '1rem' }}>Premium IPL Auction Room</h1>
            <p className="screen-subtitle" style={{ maxWidth: '54ch', marginBottom: '1.6rem' }}>
              Clean dark UI, live team-tinted personalization, marquee-player moments, and a 384-player pool with modern stars and legends.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.8rem', marginBottom: '1.4rem' }}>
              <StatCard label="Auction Pool" value={`${rosterMeta.total}`} detail="Players" accent="#8bb8ff" />
              <StatCard label="Starting Purse" value={formatLakhs(STARTING_PURSE)} detail="Per team" accent="#f2c66d" />
              <StatCard label="Base Price" value="₹100" detail="Opening buy" accent="#79d9a2" />
            </div>

            <div className="glass-panel" style={{ borderRadius: '28px', padding: '1rem', marginBottom: '1.2rem', borderColor: 'rgba(255,255,255,0.08)' }}>
              <div className="section-label" style={{ marginBottom: '0.75rem' }}>Select Your Franchise Seat</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
                {PLAYERS.map(name => {
                  const color = PLAYER_COLORS[name]
                  const theme = getPlayerTheme(name)
                  const active = selected === name
                  return (
                    <button
                      key={name}
                      className="btn"
                      onClick={() => setSelected(name)}
                      style={{
                        textAlign: 'left',
                        borderRadius: '24px',
                        padding: '1rem 1.05rem',
                        background: active
                          ? `linear-gradient(135deg, rgba(${hexToRgb(color)}, 0.28), rgba(255,255,255,0.06))`
                          : 'rgba(255,255,255,0.04)',
                        borderColor: active ? `${color}` : 'rgba(255,255,255,0.08)',
                        boxShadow: active ? `0 18px 40px ${theme.glow}` : 'none',
                      }}
                    >
                      <div style={{ color, fontWeight: 800, fontSize: '1.05rem', marginBottom: '0.3rem' }}>{name}</div>
                      <div style={{ color: '#e7edf7', fontWeight: 600, marginBottom: '0.2rem' }}>{PLAYER_TEAMS[name]}</div>
                      <div style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>
                        {name === 'Srikant' ? 'Auctioneer and reset control' : 'Live bidder seat'}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {isActive ? (
              <button className="btn btn-primary" onClick={() => onSelect(selected)} disabled={!selected} style={{ width: '100%' }}>
                Join Live Auction
              </button>
            ) : isAdmin ? (
              <button className="btn btn-primary" onClick={startAuction} disabled={!selected || starting} style={{ width: '100%' }}>
                {starting ? 'Shuffling player pool...' : 'Start Auction'}
              </button>
            ) : (
              <div className="glass-panel" style={{ borderRadius: '24px', padding: '1rem 1.1rem', color: 'var(--muted)' }}>
                {selected ? 'Waiting for Srikant to launch the room.' : 'Pick your seat to join the auction.'}
              </div>
            )}

            {isAdmin && (
              <div style={{ marginTop: '1.1rem' }}>
                {!confirmReset ? (
                  <button className="btn btn-ghost" onClick={() => setConfirmReset(true)} style={{ width: '100%' }}>
                    Reset Auction
                  </button>
                ) : (
                  <div className="glass-panel" style={{ borderRadius: '24px', padding: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>This wipes the entire live state for everyone.</span>
                    <div style={{ display: 'flex', gap: '0.6rem' }}>
                      <button className="btn btn-danger" onClick={doReset} disabled={resetting}>{resetting ? 'Resetting...' : 'Confirm'}</button>
                      <button className="btn btn-ghost" onClick={() => setConfirmReset(false)}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          <aside className="glass-panel" style={{ borderRadius: '36px', padding: '1.4rem', alignSelf: 'start', animation: 'fadeRise 320ms ease forwards' }}>
            <div className="section-label" style={{ marginBottom: '0.85rem' }}>Why This Feels Better</div>
            <div style={{ display: 'grid', gap: '0.8rem' }}>
              <Insight title="Glass surfaces" body="Rounded translucent cards with softer borders replace the flat block layout." />
              <Insight title="Team tinting" body="Each seat, accent glow, and selected state inherits the team’s own color story." />
              <Insight title="Modern hierarchy" body="Montserrat, stronger contrast, calmer spacing, and less fake-sports theatrics." />
              <Insight title="Better auction flow" body="Base-price purchase is explicit, and the room keeps everyone visually oriented." />
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, detail, accent }) {
  return (
    <div className="glass-panel" style={{ borderRadius: '24px', padding: '1rem', borderColor: `${accent}33` }}>
      <div className="section-label" style={{ marginBottom: '0.55rem' }}>{label}</div>
      <div style={{ fontSize: '1.35rem', fontWeight: 800, color: accent, marginBottom: '0.15rem' }}>{value}</div>
      <div style={{ color: 'var(--muted)', fontSize: '0.84rem' }}>{detail}</div>
    </div>
  )
}

function Insight({ title, body }) {
  return (
    <div style={{ padding: '0.9rem 0.95rem', borderRadius: '22px', background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ fontWeight: 700, marginBottom: '0.3rem' }}>{title}</div>
      <div style={{ color: 'var(--muted)', fontSize: '0.9rem', lineHeight: 1.55 }}>{body}</div>
    </div>
  )
}
