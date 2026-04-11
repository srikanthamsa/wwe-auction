import React, { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, PLAYERS, PLAYER_TEAMS, BID_INCREMENT, STARTING_PURSE, getBaseBid, getTier } from '../lib/supabase.js'
import { MARQUEE_PLAYERS } from '../lib/roster.js'
import Atmosphere from './Atmosphere.jsx'
import { PLAYER_COLORS, getPlayerTheme, hexToRgb, formatLakhs } from '../lib/ui.js'

function useRipple() {
  const [ripples, setRipples] = useState([])

  function trigger(x, y, color) {
    const id = Date.now() + Math.random()
    setRipples(prev => [...prev, { id, x, y, color }])
    setTimeout(() => setRipples(prev => prev.filter(item => item.id !== id)), 700)
  }

  return [ripples, trigger]
}

export default function Auction({ player, gameState, onRefresh, onReset }) {
  const [customBid, setCustomBid] = useState('')
  const [bidding, setBidding] = useState(false)
  const [lastAction, setLastAction] = useState(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmSkip, setConfirmSkip] = useState(false)
  const [soldFlash, setSoldFlash] = useState(null)
  const [ripples, triggerRipple] = useRipple()
  const soldCountRef = useRef(gameState?.sold_log?.length ?? 0)

  const gs = gameState
  const theme = getPlayerTheme(player)
  const currentBid = gs?.current_bid ?? 0
  const leader = gs?.current_leader
  const purse = gs?.purses?.[player] ?? STARTING_PURSE
  const isLeader = leader === player
  const isAdmin = player === 'Srikant'
  const bidHistory = gs?.bid_history ?? []
  const sold = gs?.sold_log ?? []
  const total = gs?.roster?.length ?? 0
  const doneIdx = gs?.roster_index ?? 0
  const openingBid = gs ? getBaseBid(gs.current_ovr) : 100
  const minimumBid = leader ? currentBid + BID_INCREMENT : currentBid
  const canAfford = purse >= minimumBid
  const tier = gs ? getTier(gs.current_ovr) : { label: 'B', color: '#c8a84b' }
  const isMarquee = MARQUEE_PLAYERS.has(gs?.current_player)
  const quickRaiseOptions = [100, 500, 1000]
  const soldFlashMarquee = soldFlash ? MARQUEE_PLAYERS.has(soldFlash.player) : false

  useEffect(() => {
    const channel = supabase
      .channel('auction_live')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'auction_state' }, () => {
        onRefresh()
        setBidding(false)
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  useEffect(() => {
    if (sold.length > soldCountRef.current) {
      const latestSale = sold[sold.length - 1]
      setSoldFlash(latestSale)
      const timer = setTimeout(() => setSoldFlash(null), 2400)
      soldCountRef.current = sold.length
      return () => clearTimeout(timer)
    }

    soldCountRef.current = sold.length
  }, [sold])

  function flash(action) {
    setLastAction(action)
    setTimeout(() => setLastAction(null), 1200)
  }

  const placeBid = useCallback(async (amount, event) => {
    const floor = leader ? currentBid + BID_INCREMENT : currentBid
    if (bidding || purse < amount || amount < floor) return
    if (event) triggerRipple(event.clientX, event.clientY, theme.accent)
    setBidding(true)
    flash('bid')
    const newHistory = [...bidHistory, { bidder: leader, bid: currentBid }]
    await supabase.from('auction_state').update({
      current_bid: amount,
      current_leader: player,
      bid_history: newHistory,
    }).eq('id', 1)
    setBidding(false)
  }, [bidding, purse, leader, currentBid, bidHistory, player, theme.accent])

  async function undoBid(event) {
    if (bidding || !isLeader || bidHistory.length === 0) return
    if (event) triggerRipple(event.clientX, event.clientY, '#ff7f7f')
    setBidding(true)
    flash('unbid')
    const newHistory = [...bidHistory]
    const previous = newHistory.pop()
    await supabase.from('auction_state').update({
      current_bid: previous?.bid ?? openingBid,
      current_leader: previous?.bidder ?? null,
      bid_history: newHistory,
    }).eq('id', 1)
    setBidding(false)
  }

  async function sellPlayer(event) {
    if (!isAdmin || !leader) return
    if (event) triggerRipple(event.clientX, event.clientY, '#79d9a2')
    flash('sold')
    const bidTrail = [
      ...bidHistory.filter(entry => entry?.bidder),
      { bidder: leader, bid: currentBid },
    ]
    const newLog = [...sold, { player: gs.current_player, ovr: gs.current_ovr, winner: leader, price: currentBid, bidTrail }]
    const newPurses = { ...gs.purses, [leader]: (gs.purses?.[leader] ?? 0) - currentBid }
    const nextIdx = doneIdx + 1

    if (nextIdx >= total) {
      await supabase.from('auction_state').update({
        phase: 'results',
        sold_log: newLog,
        purses: newPurses,
      }).eq('id', 1)
      return
    }

    const next = gs.roster[nextIdx]
    await supabase.from('auction_state').update({
      roster_index: nextIdx,
      current_player: next[0],
      current_ovr: next[1],
      current_bid: getBaseBid(next[1]),
      current_leader: null,
      bid_history: [],
      sold_log: newLog,
      purses: newPurses,
      phase: 'bidding',
    }).eq('id', 1)
  }

  async function skipPlayer() {
    if (!isAdmin) return
    flash('skip')
    setConfirmSkip(false)
    setSoldFlash(null)
    const nextIdx = doneIdx + 1

    if (nextIdx >= total) {
      await supabase.from('auction_state').update({ phase: 'results' }).eq('id', 1)
      return
    }

    const next = gs.roster[nextIdx]
    await supabase.from('auction_state').update({
      roster_index: nextIdx,
      current_player: next[0],
      current_ovr: next[1],
      current_bid: getBaseBid(next[1]),
      current_leader: null,
      bid_history: [],
    }).eq('id', 1)
  }

  function handleCustomBid(event) {
    const value = parseInt(customBid, 10)
    if (Number.isNaN(value) || value < minimumBid || value > purse) return
    placeBid(value, event)
    setCustomBid('')
  }

  if (!gs) return null

  return (
    <div className="app-shell">
      <Atmosphere accent={theme.accent} secondary={theme.secondary} />

      <style>{`
        @keyframes soldIn {
          0% { opacity: 0; transform: translateY(20px) scale(0.96); }
          18% { opacity: 1; transform: translateY(0) scale(1); }
          82% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-14px) scale(0.98); }
        }
        @keyframes rippleOut {
          0% { transform: translate(-50%, -50%) scale(0.1); opacity: 0.5; }
          100% { transform: translate(-50%, -50%) scale(5.8); opacity: 0; }
        }
      `}</style>

      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 3, overflow: 'hidden' }}>
        {ripples.map(ripple => (
          <div
            key={ripple.id}
            style={{
              position: 'absolute',
              left: ripple.x,
              top: ripple.y,
              width: 120,
              height: 120,
              borderRadius: '999px',
              background: `radial-gradient(circle, ${ripple.color}55 0%, transparent 68%)`,
              animation: 'rippleOut 700ms ease-out forwards',
            }}
          />
        ))}
      </div>

      {soldFlash && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 4, display: 'grid', placeItems: 'center', background: 'rgba(3, 8, 16, 0.72)', backdropFilter: 'blur(18px)', animation: 'soldIn 2.4s ease forwards', pointerEvents: 'none' }}>
          <div className="glass-panel-strong" style={{ width: 'min(640px, calc(100vw - 2rem))', borderRadius: '36px', padding: '2rem', textAlign: 'center', borderColor: soldFlashMarquee ? 'rgba(242,198,109,0.28)' : 'rgba(255,255,255,0.1)' }}>
            <div className="pill" style={{ marginBottom: '1rem', background: soldFlashMarquee ? 'rgba(242,198,109,0.14)' : 'rgba(255,255,255,0.08)', color: soldFlashMarquee ? '#ffe0a2' : 'var(--soft)' }}>
              {soldFlashMarquee ? 'Marquee Sold' : 'Player Sold'}
            </div>
            <div style={{ fontSize: 'clamp(2rem, 5vw, 3.6rem)', fontWeight: 800, marginBottom: '0.5rem', color: soldFlashMarquee ? '#ffe0a2' : 'var(--text)' }}>{soldFlash.player}</div>
            <div style={{ color: 'var(--muted)', marginBottom: '0.9rem' }}>Won by {soldFlash.winner} • {PLAYER_TEAMS[soldFlash.winner]}</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: PLAYER_COLORS[soldFlash.winner] }}>₹{soldFlash.price.toLocaleString()}</div>
          </div>
        </div>
      )}

      <div className="page-content" style={{ minHeight: '100vh', padding: '1rem' }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
          <section className="glass-panel-strong" style={{ borderRadius: '36px', padding: '1.3rem 1.3rem 1.6rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <div>
                <div className="pill" style={{ marginBottom: '0.8rem', background: `rgba(${hexToRgb(theme.accent)}, 0.12)`, color: theme.secondary }}>
                  {player} • {PLAYER_TEAMS[player]}
                </div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.04em', marginBottom: '0.4rem' }}>Live Auction Room</div>
                <div style={{ color: 'var(--muted)' }}>{doneIdx + 1} of {total} players • your purse {formatLakhs(purse)}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(120px, 1fr))', gap: '0.7rem' }}>
                <MetricCard label="Current Bid" value={`₹${currentBid.toLocaleString()}`} accent="var(--gold)" />
                <MetricCard label="Leader" value={leader ? `${leader}` : 'Open'} accent={leader ? PLAYER_COLORS[leader] : 'var(--soft)'} />
              </div>
            </div>

            <div
              className="glass-panel"
              style={{
                borderRadius: '34px',
                padding: '1.5rem',
                marginBottom: '1rem',
                position: 'relative',
                overflow: 'hidden',
                borderColor: isMarquee ? 'rgba(242,198,109,0.28)' : `rgba(${hexToRgb(theme.accent)}, 0.18)`,
                background: isMarquee
                  ? 'linear-gradient(135deg, rgba(242,198,109,0.16), rgba(255,255,255,0.05) 38%, rgba(255,255,255,0.03))'
                  : `linear-gradient(135deg, rgba(${hexToRgb(theme.accent)}, 0.14), rgba(255,255,255,0.04))`,
              }}
            >
              {isMarquee && (
                <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                  <div style={{ position: 'absolute', inset: '-20%', background: 'linear-gradient(110deg, transparent 32%, rgba(255,255,255,0.12) 48%, rgba(255,224,162,0.3) 52%, transparent 68%)', animation: 'shimmerSweep 3.2s linear infinite' }} />
                </div>
              )}
              <div className="section-label" style={{ marginBottom: '0.7rem', color: isMarquee ? '#ffe0a2' : 'var(--muted)' }}>
                {isMarquee ? 'Premium Marquee Player' : `${tier.label}-Tier Player • OVR ${gs.current_ovr}`}
              </div>
              <div style={{ fontSize: 'clamp(2.8rem, 7vw, 5rem)', lineHeight: 0.92, letterSpacing: '-0.06em', fontWeight: 800, marginBottom: '0.65rem', color: isMarquee ? '#fff1c9' : 'var(--text)' }}>
                {gs.current_player}
              </div>
              <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                <div className="pill">Base Price ₹{openingBid.toLocaleString()}</div>
                <div className="pill">Minimum Bid ₹{minimumBid.toLocaleString()}</div>
                <div className="pill">Rating {gs.current_ovr}</div>
              </div>
            </div>

            <div className="glass-panel" style={{ borderRadius: '28px', padding: '1rem', marginBottom: '1rem' }}>
              <div className="section-label" style={{ marginBottom: '0.75rem' }}>Bid Controls</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.65rem', marginBottom: '0.7rem' }}>
                {quickRaiseOptions.map(increment => {
                  const amount = currentBid + increment
                  return (
                    <button
                      key={increment}
                      className="btn btn-ghost"
                      disabled={bidding || isLeader || purse < amount}
                      onClick={event => placeBid(amount, event)}
                    >
                      +₹{increment.toLocaleString()}
                    </button>
                  )
                })}
              </div>

              {isLeader ? (
                <div style={{ padding: '1rem', borderRadius: '22px', background: `rgba(${hexToRgb(theme.accent)}, 0.14)`, border: `1px solid rgba(${hexToRgb(theme.accent)}, 0.24)`, color: theme.secondary, fontWeight: 700, marginBottom: '0.7rem' }}>
                  You are currently leading. Wait for a counter or ask the auctioneer to mark the player sold.
                </div>
              ) : (
                <button className="btn btn-primary" disabled={bidding || !canAfford} onClick={event => placeBid(minimumBid, event)} style={{ width: '100%', marginBottom: '0.7rem' }}>
                  {leader ? `Bid ₹${minimumBid.toLocaleString()}` : `Buy At Base ₹${minimumBid.toLocaleString()}`}
                </button>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.65rem' }}>
                <input
                  className="input"
                  type="number"
                  value={customBid}
                  onChange={event => setCustomBid(event.target.value)}
                  onKeyDown={event => event.key === 'Enter' && handleCustomBid(event)}
                  placeholder={`Custom bid (min ₹${minimumBid.toLocaleString()})`}
                />
                <button className="btn btn-ghost" onClick={handleCustomBid} disabled={!customBid || parseInt(customBid, 10) < minimumBid || parseInt(customBid, 10) > purse}>
                  Place
                </button>
              </div>

              {isLeader && bidHistory.length > 0 && (
                <button className="btn btn-danger" onClick={undoBid} disabled={bidding} style={{ width: '100%', marginTop: '0.7rem' }}>
                  Remove My Last Bid
                </button>
              )}
            </div>

            <div className="glass-panel" style={{ borderRadius: '28px', padding: '1rem' }}>
              <div className="section-label" style={{ marginBottom: '0.75rem' }}>Live Team Purses</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(132px, 1fr))', gap: '0.65rem' }}>
                {PLAYERS.map(name => {
                  const amount = gs.purses?.[name] ?? STARTING_PURSE
                  const color = PLAYER_COLORS[name]
                  const active = name === player
                  const leading = name === leader
                  return (
                    <div key={name} style={{ padding: '0.8rem 0.6rem', borderRadius: '22px', background: active ? `linear-gradient(180deg, rgba(${hexToRgb(color)}, 0.18), rgba(255,255,255,0.04))` : 'rgba(255,255,255,0.035)', border: `1px solid ${active || leading ? `rgba(${hexToRgb(color)}, 0.26)` : 'rgba(255,255,255,0.06)'}` }}>
                      <div style={{ color, fontWeight: 800, marginBottom: '0.18rem', fontSize: '0.9rem' }}>{name}</div>
                      <div style={{ color: 'var(--muted)', fontSize: '0.72rem', marginBottom: '0.65rem' }}>{PLAYER_TEAMS[name]}</div>
                      <div style={{ height: 7, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: '0.5rem' }}>
                        <div style={{ width: `${(amount / STARTING_PURSE) * 100}%`, height: '100%', borderRadius: 999, background: `linear-gradient(90deg, ${color}, ${color}bb)` }} />
                      </div>
                      <div style={{ color: 'var(--soft)', fontSize: '0.8rem', fontWeight: 700 }}>{formatLakhs(amount)}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>

          <aside style={{ display: 'grid', gap: '1rem', alignSelf: 'start' }}>
            {isAdmin && (
              <div className="glass-panel" style={{ borderRadius: '32px', padding: '1rem' }}>
                <div className="section-label" style={{ marginBottom: '0.75rem' }}>Auctioneer Controls</div>
                <button className="btn" onClick={sellPlayer} disabled={!leader || bidding} style={{ width: '100%', marginBottom: '0.65rem', background: leader ? 'rgba(121,217,162,0.12)' : 'rgba(255,255,255,0.04)', color: leader ? '#b9ffd7' : 'var(--muted)', borderColor: leader ? 'rgba(121,217,162,0.22)' : 'rgba(255,255,255,0.06)' }}>
                  Mark Sold {leader ? `• ${leader}` : ''}
                </button>
                {!confirmSkip ? (
                  <button className="btn btn-ghost" onClick={() => setConfirmSkip(true)} style={{ width: '100%' }}>
                    Skip Player
                  </button>
                ) : (
                  <div style={{ display: 'grid', gap: '0.6rem' }}>
                    <div style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>Skip moves to the next player without sale.</div>
                    <button className="btn btn-danger" onClick={skipPlayer}>Confirm Skip</button>
                    <button className="btn btn-ghost" onClick={() => setConfirmSkip(false)}>Cancel</button>
                  </div>
                )}
              </div>
            )}

            <div className="glass-panel" style={{ borderRadius: '32px', padding: '1rem' }}>
              <div className="section-label" style={{ marginBottom: '0.75rem' }}>Round Status</div>
              <div style={{ display: 'grid', gap: '0.65rem' }}>
                <InfoRow label="Current leader" value={leader ? `${leader} • ${PLAYER_TEAMS[leader]}` : 'No bids yet'} valueColor={leader ? PLAYER_COLORS[leader] : 'var(--soft)'} />
                <InfoRow label="Last action" value={lastAction ? actionCopy(lastAction) : 'Waiting for input'} valueColor="var(--text)" />
                <InfoRow label="Bid history stack" value={`${bidHistory.filter(entry => entry?.bidder).length} entries`} valueColor="var(--text)" />
              </div>
            </div>

            <div className="glass-panel" style={{ borderRadius: '32px', padding: '1rem' }}>
              <div className="section-label" style={{ marginBottom: '0.75rem' }}>Recent Sales</div>
              <div style={{ display: 'grid', gap: '0.55rem', maxHeight: '48vh', overflow: 'auto', paddingRight: '0.1rem' }}>
                {sold.length === 0 ? (
                  <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>No completed sales yet.</div>
                ) : (
                  [...sold].reverse().map((sale, index) => {
                    const marquee = MARQUEE_PLAYERS.has(sale.player)
                    return (
                      <div key={`${sale.player}-${index}`} style={{ padding: '0.85rem', borderRadius: '22px', background: marquee ? 'linear-gradient(135deg, rgba(242,198,109,0.13), rgba(255,255,255,0.05))' : sale.winner === player ? `linear-gradient(135deg, rgba(${hexToRgb(theme.accent)}, 0.16), rgba(255,255,255,0.04))` : 'rgba(255,255,255,0.035)', border: `1px solid ${marquee ? 'rgba(242,198,109,0.22)' : 'rgba(255,255,255,0.06)'}` }}>
                        <div style={{ fontWeight: 700, color: marquee ? '#ffe0a2' : 'var(--text)', marginBottom: '0.22rem' }}>{sale.player}{marquee ? ' ✦' : ''}</div>
                        <div style={{ color: 'var(--muted)', fontSize: '0.82rem', marginBottom: '0.3rem' }}>{sale.winner} • {PLAYER_TEAMS[sale.winner]}</div>
                        <div style={{ fontWeight: 800 }}>₹{sale.price.toLocaleString()}</div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {isAdmin && (
              <div>
                {!confirmReset ? (
                  <button className="btn btn-ghost" onClick={() => setConfirmReset(true)} style={{ width: '100%' }}>
                    Reset Entire Auction
                  </button>
                ) : (
                  <div className="glass-panel" style={{ borderRadius: '28px', padding: '1rem', display: 'grid', gap: '0.65rem' }}>
                    <div style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>This clears the entire state for all players.</div>
                    <button className="btn btn-danger" onClick={onReset}>Confirm Reset</button>
                    <button className="btn btn-ghost" onClick={() => setConfirmReset(false)}>Cancel</button>
                  </div>
                )}
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value, accent }) {
  return (
    <div className="glass-panel" style={{ borderRadius: '22px', padding: '0.9rem' }}>
      <div className="section-label" style={{ marginBottom: '0.4rem' }}>{label}</div>
      <div style={{ fontWeight: 800, color: accent }}>{value}</div>
    </div>
  )
}

function InfoRow({ label, value, valueColor }) {
  return (
    <div style={{ padding: '0.8rem 0.9rem', borderRadius: '20px', background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="section-label" style={{ marginBottom: '0.28rem' }}>{label}</div>
      <div style={{ color: valueColor, fontWeight: 700 }}>{value}</div>
    </div>
  )
}

function actionCopy(action) {
  switch (action) {
    case 'bid':
      return 'Bid placed'
    case 'unbid':
      return 'Bid removed'
    case 'sold':
      return 'Player sold'
    case 'skip':
      return 'Player skipped'
    default:
      return action
  }
}
