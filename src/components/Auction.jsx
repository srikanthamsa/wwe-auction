import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { supabase, PLAYERS, BID_INCREMENT, getBaseBid, getTier, STARTING_PURSE } from '../lib/supabase.js'

const PLAYER_COLORS = {
  Srikant: '#818cf8',
  Ashpak: '#34d399',
  KVD:     '#fbbf24',
  Ekansh:  '#e879f9',
  Debu:    '#fb7185',
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}

function pc(name) { return PLAYER_COLORS[name] || '#a78bfa' }

function useRipple() {
  const [ripples, setRipples] = useState([])
  function trigger(x, y, color) {
    const id = Date.now()
    setRipples(r => [...r, { id, x, y, color }])
    setTimeout(() => setRipples(r => r.filter(rp => rp.id !== id)), 800)
  }
  return [ripples, trigger]
}

// Static sparkle positions — deterministic so no re-randomise on render
const SPARKS = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  x: (i * 13.7 + 7) % 100,
  y: (i * 19.3 + 11) % 100,
  size: (i % 3) + 1,
  delay: ((i * 0.37) % 3).toFixed(2),
  dur:   (1.4 + (i % 5) * 0.4).toFixed(1),
  color: ['#a78bfa', '#e879f9', '#fbbf24', '#818cf8'][i % 4],
}))

function SparkleField() {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
      {SPARKS.map(s => (
        <div key={s.id} style={{
          position: 'absolute', left: `${s.x}%`, top: `${s.y}%`,
          width: s.size, height: s.size, borderRadius: '50%',
          background: s.color,
          animation: `sparkle ${s.dur}s ${s.delay}s ease-in-out infinite`,
        }} />
      ))}
    </div>
  )
}

export default function Auction({ player, gameState, onRefresh, onReset }) {
  const [customBid, setCustomBid] = useState('')
  const [bidding, setBidding] = useState(false)
  const [lastAction, setLastAction] = useState(null)
  const [actionKey, setActionKey] = useState(0)
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmSkip, setConfirmSkip] = useState(false)
  const [soldFlash, setSoldFlash] = useState(null)
  const [prevStar, setPrevStar] = useState(null)
  const [ripples, triggerRipple] = useRipple()
  const inputRef = useRef(null)

  const gs = gameState
  const purse      = gs?.purses?.[player] ?? STARTING_PURSE
  const currentBid = gs?.current_bid ?? 0
  const leader     = gs?.current_leader
  const isLeader   = leader === player
  const isAdmin    = player === 'Srikant'
  const bidHistory = gs?.bid_history ?? []
  const sold       = gs?.sold_log ?? []
  const total      = gs?.roster?.length ?? 0
  const doneIdx    = gs?.roster_index ?? 0
  const tier       = gs ? getTier(gs.current_ovr) : { label: 'B', color: '#cd7f32' }
  const nextBid    = currentBid + BID_INCREMENT
  const canAfford  = purse >= nextBid

  const tierStyle = {
    S: { from: '#fbbf24', to: '#f59e0b', label: 'S-TIER' },
    A: { from: '#c0c0c0', to: '#94a3b8', label: 'A-TIER' },
    B: { from: '#cd7f32', to: '#92400e', label: 'B-TIER' },
  }[tier.label] || { from: '#cd7f32', to: '#92400e', label: 'B-TIER' }

  // Per-player analytics
  const analytics = useMemo(() => PLAYERS.map(p => {
    const bought    = sold.filter(s => s.winner === p)
    const spent     = bought.reduce((a, s) => a + s.price, 0)
    const remaining = gs?.purses?.[p] ?? STARTING_PURSE
    const avgPrice  = bought.length > 0 ? Math.round(spent / bought.length) : 2500
    const estMore   = remaining > 0 ? Math.floor(remaining / Math.max(avgPrice, 500)) : 0
    return { name: p, bought, spent, remaining, avgPrice, estMore }
  }), [sold, gs?.purses])

  // Sold flash on superstar change
  useEffect(() => {
    if (!gs) return
    if (prevStar && prevStar !== gs.current_superstar && sold.length > 0) {
      setSoldFlash(sold[sold.length - 1])
      setTimeout(() => setSoldFlash(null), 2800)
    }
    setPrevStar(gs.current_superstar)
  }, [gs?.current_superstar])

  // Realtime subscription
  useEffect(() => {
    const ch = supabase.channel('auction_live')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'auction_state' }, () => {
        onRefresh()
        setBidding(false)
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  function flash(action) {
    setLastAction(action)
    setActionKey(k => k + 1)
    setTimeout(() => setLastAction(null), 1300)
  }

  const placeBid = useCallback(async (amount, e) => {
    if (bidding || purse < amount) return
    if (e) triggerRipple(e.clientX, e.clientY, '#8b5cf6')
    setBidding(true)
    flash('bid')
    await supabase.from('auction_state').update({
      current_bid: amount, current_leader: player,
      bid_history: [...bidHistory, { bidder: leader, bid: currentBid }],
    }).eq('id', 1)
    setBidding(false)
  }, [bidding, purse, player, leader, currentBid, bidHistory])

  async function undoBid(e) {
    if (bidding || !isLeader || bidHistory.length === 0) return
    if (e) triggerRipple(e.clientX, e.clientY, '#fb7185')
    setBidding(true)
    flash('unbid')
    const newHist = [...bidHistory]
    const prev = newHist.pop()
    await supabase.from('auction_state').update({
      current_bid: prev?.bid ?? getBaseBid(gs.current_ovr),
      current_leader: prev?.bidder ?? null,
      bid_history: newHist,
    }).eq('id', 1)
    setBidding(false)
  }

  async function sellSuperstar(e) {
    if (!isAdmin || !leader) return
    if (e) triggerRipple(e.clientX, e.clientY, '#34d399')
    flash('sold')
    const newLog    = [...sold, { superstar: gs.current_superstar, ovr: gs.current_ovr, winner: leader, price: currentBid }]
    const newPurses = { ...gs.purses }
    newPurses[leader] = (newPurses[leader] ?? 0) - currentBid
    const nextIdx = doneIdx + 1
    if (nextIdx >= total) {
      await supabase.from('auction_state').update({ phase: 'results', sold_log: newLog, purses: newPurses }).eq('id', 1)
      return
    }
    const next = gs.roster[nextIdx]
    await supabase.from('auction_state').update({
      roster_index: nextIdx, current_superstar: next[0], current_ovr: next[1],
      current_bid: getBaseBid(next[1]), current_leader: null,
      bid_history: [], sold_log: newLog, purses: newPurses, phase: 'bidding',
    }).eq('id', 1)
  }

  async function skipSuperstar() {
    if (!isAdmin) return
    flash('skip')
    setConfirmSkip(false)
    const nextIdx = doneIdx + 1
    if (nextIdx >= total) {
      await supabase.from('auction_state').update({ phase: 'results' }).eq('id', 1)
      return
    }
    const next = gs.roster[nextIdx]
    await supabase.from('auction_state').update({
      roster_index: nextIdx, current_superstar: next[0], current_ovr: next[1],
      current_bid: getBaseBid(next[1]), current_leader: null, bid_history: [],
    }).eq('id', 1)
  }

  function handleCustomBid(e) {
    const val = parseInt(customBid, 10)
    if (isNaN(val) || val <= currentBid || val > purse) return
    placeBid(val, e)
    setCustomBid('')
  }

  if (!gs) return null

  const actionLabel = { bid: '✓ Bid placed', unbid: '↩ Bid removed', sold: '🔨 Sold!', skip: '→ Skipped' }
  const progressPct = total > 0 ? ((doneIdx + 1) / total) * 100 : 0

  return (
    <div style={{ minHeight: '100vh', background: '#07040f', fontFamily: 'Barlow Condensed, sans-serif', position: 'relative', overflow: 'hidden' }}>

      <style>{`
        @keyframes sparkle    { 0%,100%{opacity:0;transform:scale(0.3)} 50%{opacity:1;transform:scale(1)} }
        @keyframes starIn     { 0%{opacity:0;transform:translateY(28px)} 100%{opacity:1;transform:translateY(0)} }
        @keyframes actionPop  { 0%{opacity:0;transform:translateY(5px)} 15%{opacity:1;transform:translateY(0)} 80%{opacity:1} 100%{opacity:0} }
        @keyframes rippleOut  { 0%{transform:translate(-50%,-50%) scale(0);opacity:0.8} 100%{transform:translate(-50%,-50%) scale(10);opacity:0} }
        @keyframes glowPulse  { 0%,100%{opacity:0.4} 50%{opacity:0.9} }
        @keyframes shimmer    { 0%{background-position:200% center} 100%{background-position:-200% center} }
        @keyframes soldPop    { 0%{opacity:0;transform:scale(0.8)} 12%{opacity:1;transform:scale(1.04)} 20%{transform:scale(1)} 80%{opacity:1;transform:scale(1)} 100%{opacity:0;transform:scale(1.05)} }
        @keyframes leaderPulse{ 0%,100%{box-shadow:0 0 12px rgba(139,92,246,0.2)} 50%{box-shadow:0 0 28px rgba(139,92,246,0.5)} }
        @keyframes float      { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }

        .bid-btn { transition: transform 0.12s ease, filter 0.12s ease, box-shadow 0.12s ease; cursor: pointer; }
        .bid-btn:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.2); }
        .bid-btn:active:not(:disabled) { transform: translateY(1px) scale(0.97); }
        .bid-btn:disabled { opacity: 0.25; cursor: not-allowed; }

        .player-card { transition: border-color 0.3s, background 0.3s, box-shadow 0.3s; }

        .auction-layout {
          display: grid;
          grid-template-columns: 1fr 300px;
          min-height: calc(100vh - 60px);
        }
        .sidebar {
          border-left: 1px solid rgba(139,92,246,0.12);
          background: rgba(8,4,18,0.7);
          backdrop-filter: blur(12px);
          overflow-y: auto;
          position: sticky;
          top: 60px;
          max-height: calc(100vh - 60px);
        }
        @media (max-width: 820px) {
          .auction-layout { grid-template-columns: 1fr; }
          .sidebar { position: static; max-height: none; border-left: none; border-top: 1px solid rgba(139,92,246,0.12); }
        }

        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.25); border-radius: 2px; }

        .custom-input:focus { border-color: rgba(139,92,246,0.5) !important; outline: none; }
      `}</style>

      <SparkleField />

      {/* Ambient background glows */}
      <div style={{ position: 'fixed', top: '25%', left: '35%', transform: 'translate(-50%,-50%)', width: 700, height: 700, background: 'radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0, animation: 'glowPulse 6s ease-in-out infinite' }} />
      <div style={{ position: 'fixed', top: '65%', left: '65%', transform: 'translate(-50%,-50%)', width: 500, height: 500, background: 'radial-gradient(circle, rgba(236,72,153,0.05) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0, animation: 'glowPulse 8s ease-in-out infinite reverse' }} />

      {/* Ripple layer */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 200, overflow: 'hidden' }}>
        {ripples.map(rp => (
          <div key={rp.id} style={{ position: 'absolute', left: rp.x, top: rp.y, width: 80, height: 80, borderRadius: '50%', background: `radial-gradient(circle, ${rp.color}60 0%, transparent 70%)`, animation: 'rippleOut 0.8s ease-out forwards', pointerEvents: 'none' }} />
        ))}
      </div>

      {/* SOLD overlay */}
      {soldFlash && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 150, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(7,4,15,0.93)', animation: 'soldPop 2.8s ease forwards', pointerEvents: 'none', backdropFilter: 'blur(16px)' }}>
          <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.7rem', letterSpacing: '0.5em', color: 'rgba(167,139,250,0.5)', marginBottom: '0.6rem', textTransform: 'uppercase' }}>Sold to</div>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: 'clamp(4rem, 15vw, 8rem)', letterSpacing: '0.04em', lineHeight: 1, color: pc(soldFlash.winner), textShadow: `0 0 80px rgba(${hexToRgb(pc(soldFlash.winner))},0.6), 0 0 160px rgba(${hexToRgb(pc(soldFlash.winner))},0.3)`, animation: 'float 2.5s ease-in-out infinite' }}>
            {soldFlash.winner}
          </div>
          <div style={{ marginTop: '0.6rem', fontFamily: 'Bebas Neue', fontSize: '2.5rem', letterSpacing: '0.08em', background: 'linear-gradient(135deg, #a78bfa, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            ₹{soldFlash.price.toLocaleString()}
          </div>
          <div style={{ marginTop: '0.35rem', fontFamily: 'Barlow Condensed', fontSize: '0.9rem', color: 'rgba(167,139,250,0.45)', letterSpacing: '0.2em' }}>{soldFlash.superstar}</div>
        </div>
      )}

      {/* ── TOP BAR ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.5rem', background: 'rgba(7,4,15,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(139,92,246,0.12)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.2rem', background: 'linear-gradient(135deg, #a78bfa, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', letterSpacing: '0.08em' }}>WWE 2K25</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ fontSize: '0.55rem', color: 'rgba(167,139,250,0.4)', letterSpacing: '0.25em' }}>{doneIdx + 1} / {total} SUPERSTARS</div>
            <div style={{ height: 3, width: 90, background: 'rgba(139,92,246,0.15)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progressPct}%`, background: 'linear-gradient(90deg, #7c3aed, #ec4899)', borderRadius: 2, transition: 'width 0.5s ease' }} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.5rem', color: 'rgba(167,139,250,0.35)', letterSpacing: '0.25em', marginBottom: 1 }}>PLAYING AS</div>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: '1rem', color: pc(player), letterSpacing: '0.08em', textShadow: `0 0 16px rgba(${hexToRgb(pc(player))},0.5)` }}>{player}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.5rem', color: 'rgba(167,139,250,0.35)', letterSpacing: '0.25em', marginBottom: 1 }}>PURSE</div>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: '1rem', color: '#fbbf24', letterSpacing: '0.05em', textShadow: '0 0 12px rgba(251,191,36,0.4)' }}>₹{purse.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* ── MAIN LAYOUT ── */}
      <div className="auction-layout" style={{ position: 'relative', zIndex: 1 }}>

        {/* ── LEFT: Bidding area ── */}
        <div style={{ display: 'flex', flexDirection: 'column', padding: '0 1.5rem', maxWidth: 560, margin: '0 auto', width: '100%' }}>

          {/* Superstar hero */}
          <div key={gs.current_superstar} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2.5rem 0 1.75rem', textAlign: 'center' }}>
            {/* Tier badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.25rem 0.9rem', background: `linear-gradient(135deg, ${tierStyle.from}20, ${tierStyle.to}10)`, border: `1px solid ${tierStyle.from}50`, borderRadius: 20, marginBottom: '1rem', animation: 'starIn 0.4s ease' }}>
              <span style={{ fontFamily: 'Bebas Neue', fontSize: '0.9rem', color: tierStyle.from, letterSpacing: '0.08em' }}>{tierStyle.label}</span>
              <span style={{ fontSize: '0.6rem', color: `${tierStyle.from}aa`, letterSpacing: '0.2em' }}>· OVR {gs.current_ovr}</span>
            </div>

            {/* Name with aura */}
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <div style={{ position: 'absolute', inset: '-30px -20px', background: 'radial-gradient(ellipse, rgba(139,92,246,0.15) 0%, transparent 70%)', pointerEvents: 'none', animation: 'glowPulse 3s ease-in-out infinite', borderRadius: '50%' }} />
              <div style={{ fontFamily: 'Bebas Neue', fontSize: 'clamp(2.4rem, 8.5vw, 4.8rem)', letterSpacing: '0.02em', lineHeight: 0.92, animation: 'starIn 0.35s ease', background: 'linear-gradient(180deg, #ffffff 0%, #c4b5fd 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', position: 'relative', textAlign: 'center' }}>
                {gs.current_superstar}
              </div>
            </div>

            <div style={{ fontSize: '0.65rem', color: 'rgba(167,139,250,0.3)', letterSpacing: '0.25em', marginTop: '0.7rem', animation: 'starIn 0.5s ease' }}>
              BASE ₹{getBaseBid(gs.current_ovr).toLocaleString()}
            </div>
          </div>

          {/* Current bid */}
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.55rem', letterSpacing: '0.4em', color: 'rgba(167,139,250,0.35)', marginBottom: '0.3rem' }}>CURRENT BID</div>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: 'clamp(2rem, 7vw, 3.5rem)', letterSpacing: '0.05em', lineHeight: 1, background: 'linear-gradient(135deg, #a78bfa 0%, #ec4899 50%, #fbbf24 100%)', backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', animation: 'shimmer 5s linear infinite' }}>
              ₹{currentBid.toLocaleString()}
            </div>
            <div style={{ marginTop: '0.5rem' }}>
              {leader ? (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.2rem 0.8rem', background: `rgba(${hexToRgb(pc(leader))}, 0.1)`, border: `1px solid rgba(${hexToRgb(pc(leader))}, 0.3)`, borderRadius: 20 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: pc(leader), boxShadow: `0 0 8px rgba(${hexToRgb(pc(leader))}, 0.8)` }} />
                  <span style={{ fontSize: '0.8rem', color: pc(leader), letterSpacing: '0.1em', fontWeight: 700 }}>
                    {isLeader ? 'YOU ARE WINNING' : `${leader} is leading`}
                  </span>
                </div>
              ) : (
                <div style={{ fontSize: '0.75rem', color: 'rgba(167,139,250,0.25)', letterSpacing: '0.15em' }}>No bids yet — be the first!</div>
              )}
            </div>
          </div>

          {/* Action feedback */}
          <div style={{ height: '1.4rem', marginBottom: '0.6rem', position: 'relative', textAlign: 'center' }}>
            {lastAction && (
              <div key={actionKey} style={{ position: 'absolute', inset: 0, fontSize: '0.8rem', letterSpacing: '0.2em', animation: 'actionPop 1.3s ease forwards', color: lastAction === 'unbid' ? '#fb7185' : lastAction === 'sold' ? '#34d399' : '#a78bfa' }}>
                {actionLabel[lastAction]}
              </div>
            )}
          </div>

          {/* Bid controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', marginBottom: '0.9rem' }}>

            {/* Quick raise */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
              {[BID_INCREMENT, 1000, 2000].map(inc => {
                const amt = nextBid + inc - BID_INCREMENT
                const ok  = !bidding && !isLeader && purse >= amt
                return (
                  <button key={inc} className="bid-btn" disabled={!ok} onClick={e => placeBid(amt, e)}
                    style={{ padding: '0.8rem 0.4rem', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 10, fontFamily: 'Bebas Neue', fontSize: '1rem', letterSpacing: '0.1em', color: '#a78bfa' }}>
                    +₹{inc >= 1000 ? `${inc / 1000}k` : inc}
                  </button>
                )
              })}
            </div>

            {/* Primary bid / leading state */}
            {isLeader ? (
              <div style={{ padding: '1rem', background: `rgba(${hexToRgb(pc(player))}, 0.07)`, border: `1px solid rgba(${hexToRgb(pc(player))}, 0.25)`, borderRadius: 12, textAlign: 'center', animation: 'leaderPulse 2.5s ease-in-out infinite' }}>
                <div style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: `rgba(${hexToRgb(pc(player))}, 0.6)`, marginBottom: '0.2rem' }}>CURRENT LEADER</div>
                <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.15rem', letterSpacing: '0.1em', color: pc(player) }}>You're winning — hold tight!</div>
              </div>
            ) : (
              <button className="bid-btn" disabled={bidding || !canAfford} onClick={e => placeBid(nextBid, e)}
                style={{ padding: '1rem', background: canAfford ? 'linear-gradient(135deg, rgba(139,92,246,0.22), rgba(236,72,153,0.16))' : 'rgba(255,255,255,0.02)', border: `1px solid ${canAfford ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.05)'}`, borderRadius: 12, fontFamily: 'Bebas Neue', fontSize: '1.3rem', letterSpacing: '0.15em', color: canAfford ? '#a78bfa' : 'rgba(167,139,250,0.18)', boxShadow: canAfford ? '0 4px 24px rgba(139,92,246,0.18)' : 'none' }}>
                BID ₹{nextBid.toLocaleString()}
              </button>
            )}

            {/* Custom amount */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input ref={inputRef} className="custom-input" type="number" value={customBid}
                onChange={e => setCustomBid(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCustomBid(e)}
                placeholder={`Custom (min ₹${nextBid.toLocaleString()})`}
                style={{ flex: 1, padding: '0.7rem 0.9rem', background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.18)', borderRadius: 10, color: '#e2e8f0', fontFamily: 'Barlow Condensed', fontSize: '0.9rem', letterSpacing: '0.05em', transition: 'border-color 0.2s' }} />
              <button className="bid-btn" onClick={handleCustomBid}
                disabled={!customBid || parseInt(customBid) <= currentBid || parseInt(customBid) > purse}
                style={{ padding: '0.7rem 1rem', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 10, fontFamily: 'Barlow Condensed', fontSize: '0.85rem', letterSpacing: '0.1em', color: '#a78bfa' }}>
                Place
              </button>
            </div>

            {/* Un-bid */}
            {isLeader && bidHistory.length > 0 && (
              <button className="bid-btn" onClick={e => undoBid(e)} disabled={bidding}
                style={{ padding: '0.6rem', background: 'rgba(251,113,133,0.07)', border: '1px solid rgba(251,113,133,0.22)', borderRadius: 10, fontSize: '0.8rem', letterSpacing: '0.2em', color: '#fb7185', textTransform: 'uppercase' }}>
                ↩ Remove my last bid
              </button>
            )}
          </div>

          {/* Admin controls */}
          {isAdmin && (
            <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.25rem' }}>
              <button className="bid-btn" onClick={e => sellSuperstar(e)} disabled={!leader || bidding}
                style={{ flex: 1, padding: '0.9rem', background: leader ? 'linear-gradient(135deg, rgba(52,211,153,0.18), rgba(16,185,129,0.1))' : 'rgba(255,255,255,0.02)', border: `1px solid ${leader ? 'rgba(52,211,153,0.45)' : 'rgba(255,255,255,0.05)'}`, borderRadius: 12, fontFamily: 'Bebas Neue', fontSize: '1.1rem', letterSpacing: '0.15em', color: leader ? '#34d399' : 'rgba(52,211,153,0.2)', boxShadow: leader ? '0 4px 20px rgba(52,211,153,0.12)' : 'none' }}>
                🔨 Sold — {leader || 'no bids'}
              </button>
              {!confirmSkip ? (
                <button className="bid-btn" onClick={() => setConfirmSkip(true)}
                  style={{ padding: '0.9rem 1rem', background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 12, fontSize: '0.8rem', letterSpacing: '0.15em', color: 'rgba(167,139,250,0.45)', whiteSpace: 'nowrap' }}>
                  Skip
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button className="bid-btn" onClick={skipSuperstar}
                    style={{ padding: '0.75rem', background: 'rgba(251,113,133,0.1)', border: '1px solid rgba(251,113,133,0.3)', borderRadius: 10, fontSize: '0.75rem', color: '#fb7185', whiteSpace: 'nowrap' }}>
                    Confirm
                  </button>
                  <button className="bid-btn" onClick={() => setConfirmSkip(false)}
                    style={{ padding: '0.75rem', background: 'transparent', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 10, fontSize: '0.75rem', color: 'rgba(167,139,250,0.4)' }}>
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Reset — Srikant only, subtle */}
          {isAdmin && (
            <div style={{ textAlign: 'center', paddingBottom: '2.5rem', marginTop: 'auto' }}>
              {!confirmReset ? (
                <button onClick={() => setConfirmReset(true)}
                  style={{ background: 'none', border: 'none', fontSize: '0.6rem', letterSpacing: '0.25em', color: 'rgba(167,139,250,0.18)', cursor: 'pointer', textTransform: 'uppercase' }}>
                  Reset entire auction
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(167,139,250,0.4)', letterSpacing: '0.1em' }}>Wipes everything.</span>
                  <button onClick={onReset} style={{ background: 'none', border: '1px solid rgba(251,113,133,0.35)', borderRadius: 6, padding: '0.3rem 0.8rem', fontSize: '0.7rem', letterSpacing: '0.15em', color: '#fb7185', cursor: 'pointer', fontFamily: 'Barlow Condensed' }}>Yes, reset</button>
                  <button onClick={() => setConfirmReset(false)} style={{ background: 'none', border: 'none', fontSize: '0.7rem', color: 'rgba(167,139,250,0.25)', cursor: 'pointer', fontFamily: 'Barlow Condensed' }}>Cancel</button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT: Analytics Sidebar ── */}
        <div className="sidebar" style={{ padding: '1.25rem 1rem' }}>

          <SidebarDivider label="Live Analytics" />

          {/* Player analytics cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.5rem' }}>
            {analytics.map(a => {
              const col    = pc(a.name)
              const rgb    = hexToRgb(col)
              const isMe   = a.name === player
              const isWin  = a.name === leader
              const pct    = Math.max(0, Math.min(100, (a.remaining / STARTING_PURSE) * 100))

              return (
                <div key={a.name} className="player-card"
                  style={{ padding: '0.8rem', background: isWin ? `rgba(${rgb},0.1)` : isMe ? `rgba(${rgb},0.06)` : 'rgba(139,92,246,0.04)', border: `1px solid ${isWin ? `rgba(${rgb},0.4)` : isMe ? `rgba(${rgb},0.22)` : 'rgba(139,92,246,0.1)'}`, borderRadius: 12, boxShadow: isWin ? `0 0 20px rgba(${rgb},0.12)` : 'none' }}>

                  {/* Name row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.55rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: col, boxShadow: `0 0 8px rgba(${rgb},0.7)` }} />
                      <span style={{ fontFamily: 'Bebas Neue', fontSize: '0.95rem', color: col, letterSpacing: '0.08em' }}>{a.name}</span>
                      {isMe && <span style={{ fontSize: '0.5rem', color: `rgba(${rgb},0.55)`, letterSpacing: '0.12em', background: `rgba(${rgb},0.1)`, padding: '1px 5px', borderRadius: 6 }}>YOU</span>}
                    </div>
                    {isWin && (
                      <span style={{ fontSize: '0.55rem', color: col, letterSpacing: '0.1em', padding: '0.1rem 0.45rem', background: `rgba(${rgb},0.15)`, borderRadius: 10, border: `1px solid rgba(${rgb},0.3)` }}>LEADING</span>
                    )}
                  </div>

                  {/* Purse bar */}
                  <div style={{ marginBottom: '0.55rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: '0.55rem', color: 'rgba(167,139,250,0.4)', letterSpacing: '0.12em' }}>PURSE REMAINING</span>
                      <span style={{ fontFamily: 'Bebas Neue', fontSize: '0.75rem', color: col, letterSpacing: '0.04em' }}>₹{a.remaining.toLocaleString()}</span>
                    </div>
                    <div style={{ height: 5, background: 'rgba(139,92,246,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${col}, rgba(${rgb},0.55))`, borderRadius: 3, transition: 'width 0.6s ease', boxShadow: `0 0 6px rgba(${rgb},0.4)` }} />
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.3rem', marginBottom: a.bought.length > 0 ? '0.5rem' : 0 }}>
                    {[
                      { val: a.bought.length, label: 'Bought' },
                      { val: `~${a.estMore}`, label: 'Est. More' },
                      { val: a.bought.length > 0 ? `₹${a.avgPrice >= 1000 ? `${(a.avgPrice / 1000).toFixed(1)}k` : a.avgPrice}` : '—', label: 'Avg/Star' },
                    ].map(({ val, label }) => (
                      <div key={label} style={{ textAlign: 'center', padding: '0.3rem 0.2rem', background: 'rgba(139,92,246,0.06)', borderRadius: 7 }}>
                        <div style={{ fontFamily: 'Bebas Neue', fontSize: '0.95rem', color: col, letterSpacing: '0.04em' }}>{val}</div>
                        <div style={{ fontSize: '0.48rem', color: 'rgba(167,139,250,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Last 2 acquired */}
                  {a.bought.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.18rem' }}>
                      {a.bought.slice(-2).reverse().map((s, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '0.2rem 0.4rem', background: 'rgba(139,92,246,0.05)', borderRadius: 5, gap: '0.3rem' }}>
                          <span style={{ flex: 1, fontSize: '0.65rem', color: 'rgba(226,232,240,0.65)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.superstar}</span>
                          <span style={{ fontFamily: 'Bebas Neue', fontSize: '0.62rem', color: 'rgba(167,139,250,0.45)', whiteSpace: 'nowrap' }}>₹{s.price >= 1000 ? `${(s.price / 1000).toFixed(1)}k` : s.price}</span>
                        </div>
                      ))}
                      {a.bought.length > 2 && (
                        <div style={{ fontSize: '0.52rem', color: 'rgba(167,139,250,0.3)', letterSpacing: '0.1em', textAlign: 'center' }}>+{a.bought.length - 2} more</div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Recent sold log */}
          <SidebarDivider label={`Sold (${sold.length})`} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', paddingBottom: '1.5rem' }}>
            {sold.length === 0 ? (
              <div style={{ fontSize: '0.75rem', color: 'rgba(167,139,250,0.2)', letterSpacing: '0.1em', textAlign: 'center', padding: '0.75rem' }}>No sales yet</div>
            ) : (
              [...sold].reverse().slice(0, 12).map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.5rem', background: 'rgba(139,92,246,0.04)', borderRadius: 7, border: '1px solid rgba(139,92,246,0.08)' }}>
                  <div style={{ flex: 1, fontSize: '0.7rem', color: 'rgba(226,232,240,0.65)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{s.superstar}</div>
                  <div style={{ fontSize: '0.65rem', color: pc(s.winner), fontWeight: 700, whiteSpace: 'nowrap' }}>{s.winner}</div>
                  <div style={{ fontFamily: 'Bebas Neue', fontSize: '0.68rem', color: 'rgba(167,139,250,0.45)', whiteSpace: 'nowrap' }}>₹{s.price >= 1000 ? `${(s.price / 1000).toFixed(1)}k` : s.price}</div>
                </div>
              ))
            )}
            {sold.length > 12 && (
              <div style={{ fontSize: '0.58rem', color: 'rgba(167,139,250,0.3)', letterSpacing: '0.1em', textAlign: 'center', padding: '0.3rem' }}>+{sold.length - 12} more</div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

function SidebarDivider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem', fontFamily: 'Barlow Condensed', fontSize: '0.55rem', letterSpacing: '0.35em', color: 'rgba(167,139,250,0.4)', textTransform: 'uppercase' }}>
      <div style={{ flex: 1, height: 1, background: 'rgba(139,92,246,0.15)' }} />
      {label}
      <div style={{ flex: 1, height: 1, background: 'rgba(139,92,246,0.15)' }} />
    </div>
  )
}
