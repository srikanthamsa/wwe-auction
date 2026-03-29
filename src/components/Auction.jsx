import React, { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, PLAYERS, BID_INCREMENT, ROUND_DURATION, getBaseBid, getTier } from '../lib/supabase.js'

const PLAYER_COLORS = {
  Srikant: '#6c8ebf', Ashpak: '#82b366', KVD: '#d6a94a', Ekansh: '#ae6aaf', Debu: '#bf6060'
}

function getPlayerColor(name) { return PLAYER_COLORS[name] || '#888' }

export default function Auction({ player, gameState, onRefresh }) {
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION)
  const [customBid, setCustomBid] = useState('')
  const [bidding, setBidding] = useState(false)
  const [justBid, setJustBid] = useState(false)
  const [prevStar, setPrevStar] = useState(null)
  const [soldFlash, setSoldFlash] = useState(false)
  const timerRef = useRef(null)
  const endRef = useRef(null)

  const gs = gameState
  const purse = gs?.purses?.[player] ?? 50000
  const currentBid = gs?.current_bid ?? 0
  const leader = gs?.current_leader
  const isLeader = leader === player
  const canAfford = purse >= currentBid + BID_INCREMENT
  const nextBid = currentBid + BID_INCREMENT
  const sold = gs?.sold_log ?? []
  const total = gs?.roster?.length ?? 0
  const done = gs?.roster_index ?? 0
  const tier = gs ? getTier(gs.current_ovr) : { label: 'B', color: '#cd7f32' }

  // countdown timer
  useEffect(() => {
    if (!gs?.timer_end) return
    function tick() {
      const left = Math.max(0, Math.ceil((new Date(gs.timer_end) - Date.now()) / 1000))
      setTimeLeft(left)
      if (left === 0) {
        clearInterval(timerRef.current)
        // Only the leader (or fallback: Srikant) triggers the advance
        if (player === 'Srikant') {
          setTimeout(() => advanceRound(), 1200)
        }
      }
    }
    tick()
    timerRef.current = setInterval(tick, 500)
    return () => clearInterval(timerRef.current)
  }, [gs?.timer_end])

  // detect superstar change for sold flash
  useEffect(() => {
    if (!gs) return
    if (prevStar && prevStar !== gs.current_superstar) {
      setSoldFlash(true)
      setTimeout(() => setSoldFlash(false), 1800)
    }
    setPrevStar(gs.current_superstar)
  }, [gs?.current_superstar])

  // realtime subscription
  useEffect(() => {
    const ch = supabase.channel('auction_live')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'auction_state' }, () => {
        onRefresh()
        setBidding(false)
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  const placeBid = useCallback(async (amount) => {
    if (bidding || purse < amount) return
    setBidding(true)
    setJustBid(true)
    setTimeout(() => setJustBid(false), 600)
    await supabase.from('auction_state').update({
      current_bid: amount,
      current_leader: player,
      timer_end: new Date(Date.now() + ROUND_DURATION * 1000).toISOString(),
    }).eq('id', 1)
    setBidding(false)
  }, [bidding, purse, player])

  async function advanceRound() {
    if (!gs) return
    const newLog = [...(gs.sold_log || [])]
    if (gs.current_leader) {
      newLog.push({
        superstar: gs.current_superstar,
        ovr: gs.current_ovr,
        winner: gs.current_leader,
        price: gs.current_bid,
      })
    }
    const newPurses = { ...gs.purses }
    if (gs.current_leader) {
      newPurses[gs.current_leader] = (newPurses[gs.current_leader] || 0) - gs.current_bid
    }
    const nextIdx = (gs.roster_index || 0) + 1
    if (nextIdx >= gs.roster.length) {
      await supabase.from('auction_state').update({
        phase: 'results', sold_log: newLog, purses: newPurses,
      }).eq('id', 1)
      return
    }
    const next = gs.roster[nextIdx]
    await supabase.from('auction_state').update({
      roster_index: nextIdx,
      current_superstar: next[0],
      current_ovr: next[1],
      current_bid: getBaseBid(next[1]),
      current_leader: null,
      timer_end: new Date(Date.now() + ROUND_DURATION * 1000).toISOString(),
      sold_log: newLog,
      purses: newPurses,
      phase: 'bidding',
    }).eq('id', 1)
  }

  function handleCustomBid() {
    const val = parseInt(customBid, 10)
    if (isNaN(val) || val <= currentBid || val > purse) return
    placeBid(val)
    setCustomBid('')
  }

  const timerPct = (timeLeft / ROUND_DURATION) * 100
  const timerColor = timeLeft <= 5 ? '#e05555' : timeLeft <= 10 ? '#d6a94a' : '#c8a84b'

  if (!gs) return null

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      {/* scanlines */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)' }} />

      {/* sold flash overlay */}
      {soldFlash && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', animation: 'fadeOut 1.8s forwards' }}>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: 'clamp(4rem, 15vw, 8rem)', color: '#c8a84b', letterSpacing: '0.1em', textShadow: '0 0 80px rgba(200,168,75,0.8)' }}>
            SOLD!
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeOut { 0%{opacity:1} 70%{opacity:1} 100%{opacity:0} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes slideUp { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-4px)} 75%{transform:translateX(4px)} }
        .bid-btn:hover { filter: brightness(1.15); transform: scale(1.02); }
        .bid-btn:active { transform: scale(0.97); }
        .bid-btn:disabled { opacity: 0.35; pointer-events: none; }
      `}</style>

      {/* top bar */}
      <div style={{ position: 'relative', zIndex: 10, padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.3rem', color: '#c8a84b', letterSpacing: '0.05em' }}>WWE 2K25</div>
        <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.8rem', letterSpacing: '0.2em', color: '#555', textTransform: 'uppercase' }}>
          {done + 1} / {total}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.7rem', color: '#555', letterSpacing: '0.15em' }}>YOUR PURSE</div>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.1rem', color: getPlayerColor(player) }}>₹{purse.toLocaleString()}</div>
        </div>
      </div>

      {/* timer bar */}
      <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', position: 'relative', zIndex: 10 }}>
        <div style={{ height: '100%', width: `${timerPct}%`, background: timerColor, transition: 'width 0.5s linear, background 0.3s', boxShadow: `0 0 8px ${timerColor}` }} />
      </div>

      {/* main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1, padding: '0 1rem', maxWidth: '540px', margin: '0 auto', width: '100%' }}>

        {/* superstar card */}
        <div style={{ marginTop: '1.5rem', marginBottom: '1rem', animation: 'slideUp 0.4s ease' }} key={gs.current_superstar}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.7rem', letterSpacing: '0.3em', color: '#555', textTransform: 'uppercase' }}>Now Bidding</div>
            <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.75rem', letterSpacing: '0.1em', color: tier.color, fontWeight: 700 }}>{tier.label}-TIER</div>
          </div>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: 'clamp(2.2rem, 8vw, 3.5rem)', color: '#fff', letterSpacing: '0.03em', lineHeight: 1, textShadow: '0 2px 40px rgba(200,168,75,0.15)' }}>
            {gs.current_superstar}
          </div>
          <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.9rem', color: '#555', letterSpacing: '0.15em', marginTop: '0.2rem' }}>
            OVR {gs.current_ovr} · BASE ₹{getBaseBid(gs.current_ovr).toLocaleString()}
          </div>
        </div>

        {/* bid display */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', padding: '1.25rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div>
              <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.7rem', letterSpacing: '0.25em', color: '#555', marginBottom: '0.15rem' }}>CURRENT BID</div>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: 'clamp(2rem, 7vw, 3rem)', color: '#c8a84b', letterSpacing: '0.05em' }}>₹{currentBid.toLocaleString()}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.7rem', letterSpacing: '0.25em', color: '#555', marginBottom: '0.15rem' }}>LEADER</div>
              {leader ? (
                <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.4rem', color: getPlayerColor(leader), letterSpacing: '0.05em' }}>{leader}</div>
              ) : (
                <div style={{ fontFamily: 'Barlow Condensed', fontSize: '1rem', color: '#444' }}>—</div>
              )}
            </div>
          </div>

          {/* timer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.2rem', color: timerColor, minWidth: '2rem', animation: timeLeft <= 5 ? 'pulse 0.5s infinite' : 'none' }}>{timeLeft}</div>
            <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.75rem', color: '#444', letterSpacing: '0.1em' }}>SECONDS REMAINING</div>
          </div>
        </div>

        {/* bidding controls */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.5rem' }}>
            {[BID_INCREMENT, 1000, 2000].map(inc => (
              <button
                key={inc}
                className="bid-btn"
                disabled={bidding || !canAfford || isLeader}
                onClick={() => placeBid(nextBid + inc - BID_INCREMENT)}
                style={{
                  padding: '0.9rem 0.5rem',
                  background: isLeader ? 'rgba(200,168,75,0.08)' : 'rgba(200,168,75,0.12)',
                  border: `1px solid ${isLeader ? 'rgba(200,168,75,0.15)' : 'rgba(200,168,75,0.3)'}`,
                  borderRadius: '4px', color: '#c8a84b',
                  fontFamily: 'Bebas Neue', fontSize: '1.1rem', letterSpacing: '0.1em',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                +₹{inc.toLocaleString()}
              </button>
            ))}
          </div>

          {/* quick raise to next bid */}
          {!isLeader && (
            <button
              className="bid-btn"
              disabled={bidding || !canAfford}
              onClick={() => placeBid(nextBid)}
              style={{
                width: '100%', padding: '1rem',
                background: justBid ? 'rgba(200,168,75,0.3)' : 'rgba(200,168,75,0.18)',
                border: '1px solid rgba(200,168,75,0.5)', borderRadius: '4px',
                fontFamily: 'Bebas Neue', fontSize: '1.2rem', letterSpacing: '0.1em',
                color: '#c8a84b', cursor: 'pointer', transition: 'all 0.15s',
                marginBottom: '0.5rem',
              }}
            >
              BID ₹{nextBid.toLocaleString()}
            </button>
          )}

          {isLeader && (
            <div style={{ textAlign: 'center', padding: '0.75rem', background: `rgba(${hexToRgb(getPlayerColor(player))}, 0.1)`, border: `1px solid rgba(${hexToRgb(getPlayerColor(player))}, 0.3)`, borderRadius: '4px', marginBottom: '0.5rem', fontFamily: 'Barlow Condensed', fontSize: '0.9rem', letterSpacing: '0.15em', color: getPlayerColor(player) }}>
              YOU'RE WINNING — HOLD ON
            </div>
          )}

          {/* custom bid */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="number"
              value={customBid}
              onChange={e => setCustomBid(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCustomBid()}
              placeholder={`Custom bid (min ₹${nextBid.toLocaleString()})`}
              style={{
                flex: 1, padding: '0.75rem 0.75rem',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '4px', color: '#fff', fontFamily: 'Barlow Condensed',
                fontSize: '1rem', outline: 'none',
              }}
            />
            <button
              className="bid-btn"
              onClick={handleCustomBid}
              disabled={!customBid || parseInt(customBid) <= currentBid || parseInt(customBid) > purse}
              style={{
                padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px',
                color: '#fff', fontFamily: 'Barlow Condensed', fontSize: '1rem',
                cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
              }}
            >
              Place
            </button>
          </div>
        </div>

        {/* purse overview */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.7rem', letterSpacing: '0.25em', color: '#444', marginBottom: '0.5rem' }}>ALL PURSES</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.4rem' }}>
            {PLAYERS.map(p => {
              const amt = gs.purses?.[p] ?? 50000
              const pct = (amt / 50000) * 100
              const col = getPlayerColor(p)
              return (
                <div key={p} style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.65rem', color: p === player ? col : '#555', letterSpacing: '0.05em', fontWeight: p === player ? 700 : 400, marginBottom: '3px' }}>{p}</div>
                  <div style={{ height: '32px', background: 'rgba(255,255,255,0.04)', borderRadius: '2px', overflow: 'hidden', position: 'relative' }}>
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${pct}%`, background: col, opacity: p === player ? 0.7 : 0.35, transition: 'height 0.5s' }} />
                  </div>
                  <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.6rem', color: '#444', marginTop: '2px' }}>₹{(amt / 1000).toFixed(0)}k</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* sold log */}
        <div style={{ flex: 1 }} ref={endRef}>
          <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.7rem', letterSpacing: '0.25em', color: '#444', marginBottom: '0.5rem' }}>SOLD LOG</div>
          {sold.length === 0 ? (
            <div style={{ color: '#333', fontFamily: 'Barlow Condensed', fontSize: '0.85rem', letterSpacing: '0.1em' }}>No sales yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', paddingBottom: '2rem' }}>
              {[...sold].reverse().map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.6rem', background: 'rgba(255,255,255,0.02)', borderRadius: '3px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.75rem', color: '#333', minWidth: '1rem' }}>{sold.length - i}</div>
                  <div style={{ flex: 1, fontFamily: 'Barlow Condensed', fontSize: '0.85rem', color: '#aaa', fontWeight: 600 }}>{s.superstar}</div>
                  <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.75rem', color: getPlayerColor(s.winner), fontWeight: 700, minWidth: '3.5rem', textAlign: 'right' }}>{s.winner}</div>
                  <div style={{ fontFamily: 'Bebas Neue', fontSize: '0.9rem', color: '#c8a84b', minWidth: '3.5rem', textAlign: 'right' }}>₹{s.price.toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}
