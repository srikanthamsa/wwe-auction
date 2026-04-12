import React, { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, PLAYERS, PLAYER_TEAMS, BID_INCREMENT, STARTING_PURSE, getBaseBid, getTier, formatINR, shuffle } from '../lib/supabase.js'
import { MARQUEE_PLAYERS, PLAYER_CATEGORIES } from '../lib/roster.js'

const CAT_LABEL = { BAT: 'Batters', BOWL: 'Bowlers', ALL: 'All-rounders', WK: 'Batters' }
const CAT_COLOR = { BAT: '#4a9eff', BOWL: '#ff6b4a', ALL: '#a78bfa', WK: '#4a9eff' }
function effectiveCat(name) {
  const c = PLAYER_CATEGORIES[name]
  return c === 'WK' ? 'BAT' : c || 'BAT'
}
import { Hammer, Star, Warning, SkipForward, Diamond, ChevronRight, RefreshCw } from '../lib/icons.jsx'

const PLAYER_COLORS = {
  Srikant: '#e60026',  // RCB
  Ashpak: '#f96a17',   // SRH
  KVD: '#f0c040',      // CSK
  Ekansh: '#6a3fa0',   // KKR
  Debu: '#005da0',     // MI
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}

function PlayerColor(name) { return PLAYER_COLORS[name] || '#888' }

// Ripple feedback hook
function useRipple() {
  const [ripples, setRipples] = useState([])
  function trigger(x, y, color) {
    const id = Date.now()
    setRipples(r => [...r, { id, x, y, color }])
    setTimeout(() => setRipples(r => r.filter(rp => rp.id !== id)), 700)
  }
  return [ripples, trigger]
}

export default function Auction({ player, gameState, onRefresh, onReset }) {
  const [customBid, setCustomBid] = useState('')
  const [bidding, setBidding] = useState(false)
  const [lastAction, setLastAction] = useState(null) // 'bid' | 'unbid' | 'sold' | 'skip'
  const [actionKey, setActionKey] = useState(0)
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmSkip, setConfirmSkip] = useState(false)
  const [soldFlash, setSoldFlash] = useState(null) // { winner, price }
  const [prevPlayer, setPrevPlayer] = useState(null)
  const [ripples, triggerRipple] = useRipple()
  const inputRef = useRef(null)

  const gs = gameState
  const purse = gs?.purses?.[player] ?? STARTING_PURSE
  const currentBid = gs?.current_bid ?? 0
  const leader = gs?.current_leader
  const isLeader = leader === player
  const isAdmin = player === 'Srikant'
  const bidHistory = gs?.bid_history ?? []
  const sold = gs?.sold_log ?? []
  const total = gs?.roster?.length ?? 0
  const doneIdx = gs?.roster_index ?? 0
  const tier = gs ? getTier(gs.current_ovr) : { label: 'B', color: '#cd7f32' }
  const openingBid = gs ? getBaseBid(gs.current_ovr) : 100
  const minimumBid = leader ? currentBid + BID_INCREMENT : currentBid
  const canAfford = purse >= minimumBid
  const isMarquee = MARQUEE_PLAYERS.has(gs?.current_player)
  const quickRaiseOptions = [10, 25, 50]  // Lakhs

  // derived display state
  const pursePct = purse / STARTING_PURSE
  const purseWarning = pursePct < 0.2
  const purseCritical = pursePct < 0.1
  const progressPct = total > 0 ? (doneIdx / total) * 100 : 0
  const heatPct = currentBid > openingBid ? Math.min(100, ((currentBid - openingBid) / (openingBid * 8)) * 100) : 0
  const liveBidTrail = [
    ...bidHistory.filter(b => b?.bidder).slice(-2),
    ...(leader ? [{ bidder: leader, bid: currentBid }] : [])
  ]

  // category state
  const currentCat = gs ? effectiveCat(gs.current_player) : 'BAT'
  const remaining = gs?.roster?.slice(doneIdx) ?? []
  const catCounts = { BAT: 0, BOWL: 0, ALL: 0 }
  remaining.forEach(p => { const c = effectiveCat(p[0]); if (c in catCounts) catCounts[c]++ })

  async function jumpToCategory(cat) {
    const idx = gs.roster.findIndex((p, i) => i > doneIdx && effectiveCat(p[0]) === cat)
    if (idx === -1) return
    const next = gs.roster[idx]
    await supabase.from('auction_state').update({
      roster_index: idx, current_player: next[0], current_ovr: next[1],
      current_bid: getBaseBid(next[1]), current_leader: null, bid_history: [],
    }).eq('id', 1)
  }

  // detect player change → show sold or skipped flash
  useEffect(() => {
    if (!gs) return
    if (prevPlayer && prevPlayer !== gs.current_player) {
      const lastSold = sold.length > 0 ? sold[sold.length - 1] : null
      if (lastSold && lastSold.player === prevPlayer) {
        setSoldFlash({ type: 'sold', ...lastSold })
      } else {
        setSoldFlash({ type: 'skip', player: prevPlayer })
      }
      setTimeout(() => setSoldFlash(null), 2500)
    }
    setPrevPlayer(gs.current_player)
  }, [gs?.current_player])

  // realtime
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
    setTimeout(() => setLastAction(null), 1200)
  }

  const placeBid = useCallback(async (amount, e) => {
    const floor = leader ? currentBid + BID_INCREMENT : currentBid
    if (bidding || purse < amount || amount < floor) return
    if (e) triggerRipple(e.clientX, e.clientY, '#c8a84b')
    setBidding(true)
    flash('bid')
    const newHistory = [...bidHistory, { bidder: leader, bid: currentBid }]
    await supabase.from('auction_state').update({
      current_bid: amount,
      current_leader: player,
      bid_history: newHistory,
    }).eq('id', 1)
    setBidding(false)
  }, [bidding, purse, player, leader, currentBid, bidHistory])

  async function undoBid(e) {
    if (bidding || !isLeader || bidHistory.length === 0) return
    if (e) triggerRipple(e.clientX, e.clientY, '#bf6060')
    setBidding(true)
    flash('unbid')
    const newHistory = [...bidHistory]
    const prev = newHistory.pop()
    await supabase.from('auction_state').update({
      current_bid: prev?.bid ?? openingBid,
      current_leader: prev?.bidder ?? null,
      bid_history: newHistory,
    }).eq('id', 1)
    setBidding(false)
  }

  async function sellPlayer(e) {
    if (!isAdmin || !leader) return
    if (e) triggerRipple(e.clientX, e.clientY, '#82b366')
    flash('sold')
    const bidTrail = [
      ...bidHistory.filter(entry => entry?.bidder),
      { bidder: leader, bid: currentBid },
    ]
    const newLog = [...sold, { player: gs.current_player, ovr: gs.current_ovr, winner: leader, price: currentBid, bidTrail }]
    const newPurses = { ...gs.purses }
    newPurses[leader] = (newPurses[leader] ?? 0) - currentBid
    const nextIdx = doneIdx + 1
    if (nextIdx >= total) {
      const soldNames = new Set(newLog.map(s => s.player))
      const unsold = gs.roster.filter(p => !soldNames.has(p[0]))
      if (unsold.length > 0 && gs.phase === 'bidding') {
        const retryRoster = shuffle([...unsold])
        const next = retryRoster[0]
        await supabase.from('auction_state').update({
          phase: 'bidding_r2', roster: retryRoster, roster_index: 0,
          current_player: next[0], current_ovr: next[1],
          current_bid: getBaseBid(next[1]), current_leader: null,
          bid_history: [], sold_log: newLog, purses: newPurses,
        }).eq('id', 1)
      } else {
        await supabase.from('auction_state').update({ phase: 'results', sold_log: newLog, purses: newPurses }).eq('id', 1)
      }
      return
    }
    const next = gs.roster[nextIdx]
    await supabase.from('auction_state').update({
      roster_index: nextIdx, current_player: next[0], current_ovr: next[1],
      current_bid: getBaseBid(next[1]), current_leader: null,
      bid_history: [], sold_log: newLog, purses: newPurses, phase: gs.phase,
    }).eq('id', 1)
  }

  async function skipPlayer() {
    if (!isAdmin) return
    flash('skip')
    setConfirmSkip(false)
    const nextIdx = doneIdx + 1
    if (nextIdx >= total) {
      const soldNames = new Set(sold.map(s => s.player))
      const unsold = gs.roster.filter(p => !soldNames.has(p[0]) && p[0] !== gs.current_player)
      if (unsold.length > 0 && gs.phase === 'bidding') {
        const retryRoster = shuffle([...unsold, [gs.current_player, gs.current_ovr]])
        const next = retryRoster[0]
        await supabase.from('auction_state').update({
          phase: 'bidding_r2', roster: retryRoster, roster_index: 0,
          current_player: next[0], current_ovr: next[1],
          current_bid: getBaseBid(next[1]), current_leader: null, bid_history: [],
        }).eq('id', 1)
      } else {
        await supabase.from('auction_state').update({ phase: 'results' }).eq('id', 1)
      }
      return
    }
    const next = gs.roster[nextIdx]
    await supabase.from('auction_state').update({
      roster_index: nextIdx, current_player: next[0], current_ovr: next[1],
      current_bid: getBaseBid(next[1]), current_leader: null, bid_history: [],
    }).eq('id', 1)
  }

  function handleCustomBid(e) {
    const val = parseInt(customBid, 10)
    if (isNaN(val) || val < minimumBid || val > purse) return
    placeBid(val, e)
    setCustomBid('')
  }

  const actionLabel = {
    bid: '✓ Bid placed',
    unbid: '↩ Bid removed',
    sold: '🔨 Sold!',
    skip: '→ Skipped',
  }

  if (!gs || !gs.current_player) return null

  return (
    <div style={{ minHeight: '100vh', background: '#06040a', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>

      {/* global keyframes */}
      <style>{`
        @keyframes soldIn { 0%{opacity:0;transform:translateY(20px) scale(0.9)} 20%{opacity:1;transform:translateY(0) scale(1)} 80%{opacity:1;transform:translateY(0) scale(1)} 100%{opacity:0;transform:translateY(-10px) scale(0.95)} }
        @keyframes starIn { 0%{opacity:0;transform:translateY(32px)} 100%{opacity:1;transform:translateY(0)} }
        @keyframes actionPop { 0%{opacity:0;transform:translateY(6px)} 15%{opacity:1;transform:translateY(0)} 80%{opacity:1} 100%{opacity:0} }
        @keyframes rippleOut { 0%{transform:translate(-50%,-50%) scale(0);opacity:0.6} 100%{transform:translate(-50%,-50%) scale(6);opacity:0} }
        @keyframes glowPulse { 0%,100%{opacity:0.6} 50%{opacity:1} }
        @keyframes premiumShimmer { 0%{transform:translateX(-130%) skewX(-20deg)} 100%{transform:translateX(130%) skewX(-20deg)} }
        @keyframes premiumHalo { 0%,100%{opacity:0.45;transform:scale(0.98)} 50%{opacity:0.85;transform:scale(1.02)} }
        @keyframes charIn { 0%{opacity:0;transform:translateY(18px)} 100%{opacity:1;transform:translateY(0)} }
        @keyframes pursePulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes leadPulse { 0%,100%{opacity:0.08} 50%{opacity:0.18} }
        @keyframes heatGlow { 0%,100%{filter:brightness(1)} 50%{filter:brightness(1.4)} }
        @keyframes hammerSwing { 0%{transform:rotate(-55deg) scale(0.8);opacity:0} 25%{opacity:1;transform:rotate(15deg) scale(1.1)} 50%{transform:rotate(-8deg)} 70%{transform:rotate(5deg)} 85%{transform:rotate(-2deg)} 100%{transform:rotate(0deg)} }
        @keyframes hammerImpact { 0%,90%{opacity:0;transform:scale(0.3)} 95%{opacity:1;transform:scale(1.4)} 100%{opacity:0;transform:scale(2)} }
        .bid-btn { transition: all 0.15s; }
        .bid-btn:hover:not(:disabled) { filter: brightness(1.2); transform: scale(1.03); }
        .bid-btn:active:not(:disabled) { transform: scale(0.96); }
        .bid-btn:disabled { opacity: 0.25; cursor: not-allowed; }
      `}</style>

      {/* ripple layer */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 200, overflow: 'hidden' }}>
        {ripples.map(rp => (
          <div key={rp.id} style={{ position: 'absolute', left: rp.x, top: rp.y, width: '120px', height: '120px', borderRadius: '50%', background: `radial-gradient(circle, ${rp.color}33 0%, transparent 70%)`, animation: 'rippleOut 0.7s ease-out forwards', pointerEvents: 'none' }} />
        ))}
      </div>

      {/* SOLD / SKIPPED flash overlay */}
      {soldFlash && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 150, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(6,4,10,0.88)', animation: 'soldIn 2.5s ease forwards', pointerEvents: 'none' }}>
          {soldFlash.type === 'skip' ? (
            <>
              <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.85rem', letterSpacing: '0.4em', color: '#555', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Skipped</div>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: 'clamp(2.2rem, 9vw, 4rem)', color: '#647089', letterSpacing: '0.05em', lineHeight: 0.95, textAlign: 'center' }}>
                {soldFlash.player}
              </div>
              <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.8rem', letterSpacing: '0.3em', color: '#444', marginTop: '0.5rem' }}>No bids — passed</div>
            </>
          ) : (
            <>
              {MARQUEE_PLAYERS.has(soldFlash.player) && (
                <>
                  <div style={{ position: 'absolute', inset: '18% 24%', borderRadius: '28px', background: 'radial-gradient(circle, rgba(255,222,125,0.18), transparent 68%)', animation: 'premiumHalo 2.2s ease-in-out infinite' }} />
                  <div style={{ position: 'absolute', inset: '18% 24%', overflow: 'hidden', borderRadius: '28px' }}>
                    <div style={{ position: 'absolute', inset: '-20%', background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.06) 48%, rgba(255,231,160,0.35) 52%, transparent 70%)', animation: 'premiumShimmer 2.4s linear infinite' }} />
                  </div>
                </>
              )}
              {MARQUEE_PLAYERS.has(soldFlash.player) && (
                <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.8rem', letterSpacing: '0.5em', color: '#f4d27a', marginBottom: '0.75rem', textTransform: 'uppercase' }}>
                  Premium Marquee Player
                </div>
              )}
              <div style={{ marginBottom: '0.5rem', animation: 'hammerSwing 0.7s cubic-bezier(0.25,0.46,0.45,0.94) forwards', transformOrigin: '70% 30%', display: 'flex', justifyContent: 'center' }}>
                <Hammer size={64} color={PlayerColor(soldFlash.winner)} style={{ filter: `drop-shadow(0 0 20px rgba(${hexToRgb(PlayerColor(soldFlash.winner))},0.6))` }} />
              </div>
              <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.85rem', letterSpacing: '0.4em', color: '#555', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Sold to</div>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: 'clamp(3rem, 12vw, 6rem)', color: PlayerColor(soldFlash.winner), letterSpacing: '0.05em', lineHeight: 1, textShadow: `0 0 60px rgba(${hexToRgb(PlayerColor(soldFlash.winner))}, 0.5)` }}>{soldFlash.winner}</div>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: 'clamp(2.2rem, 9vw, 4rem)', color: MARQUEE_PLAYERS.has(soldFlash.player) ? '#f8e6a0' : '#fff', letterSpacing: '0.05em', lineHeight: 0.95, marginTop: '0.65rem', textAlign: 'center', textShadow: MARQUEE_PLAYERS.has(soldFlash.player) ? '0 0 45px rgba(248,230,160,0.4)' : 'none' }}>
                {soldFlash.player}
              </div>
              <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.8rem', letterSpacing: '0.3em', color: '#555', marginTop: '0.25rem' }}>{PLAYER_TEAMS[soldFlash.winner]}</div>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#c8a84b', letterSpacing: '0.1em', marginTop: '0.25rem' }}>{formatINR(soldFlash.price)}</div>
            </>
          )}
        </div>
      )}

      {/* scanlines */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.05) 3px, rgba(0,0,0,0.05) 4px)' }} />

      {/* ambient glow */}
      <div style={{ position: 'fixed', top: '35%', left: '50%', transform: 'translate(-50%, -50%)', width: '800px', height: '400px', background: 'radial-gradient(ellipse, rgba(200,168,75,0.06) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0, animation: 'glowPulse 4s ease-in-out infinite' }} />

      {/* ── TOP BAR ── */}
      <div style={{ position: 'relative', zIndex: 10, padding: '0.8rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.1rem', color: '#c8a84b', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            IPL Mega Auction
            {gs?.phase === 'bidding_r2' && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'rgba(200,168,75,0.15)', border: '1px solid rgba(200,168,75,0.3)', borderRadius: '2px', padding: '0 5px', fontSize: '0.6rem', letterSpacing: '0.2em', verticalAlign: 'middle' }}>
                <RefreshCw size={9} color="#c8a84b" /> R2
              </span>
            )}
          </div>
          <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.65rem', color: '#8a93a8', letterSpacing: '0.25em' }}>{doneIdx + 1} / {total}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.65rem', color: '#8a93a8', letterSpacing: '0.2em', marginBottom: '1px' }}>YOU</div>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: '1rem', color: PlayerColor(player), letterSpacing: '0.08em' }}>{player} <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>{PLAYER_TEAMS[player]}</span></div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.65rem', color: purseWarning ? '#e06040' : '#8a93a8', letterSpacing: '0.2em', marginBottom: '1px', transition: 'color 0.4s', display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'flex-end' }}>
            {purseCritical && <Warning size={11} color="#e04040" />}
            {!purseCritical && purseWarning && <Warning size={11} color="#e08040" />}
            PURSE
          </div>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: '1rem', letterSpacing: '0.05em', color: purseCritical ? '#e04040' : purseWarning ? '#e08040' : '#c8a84b', animation: purseCritical ? 'pursePulse 0.9s ease-in-out infinite' : purseWarning ? 'pursePulse 1.8s ease-in-out infinite' : 'none', transition: 'color 0.4s' }}>
            {formatINR(purse)}
          </div>
        </div>
      </div>

      {/* ── PROGRESS BAR ── */}
      <div style={{ position: 'relative', zIndex: 10, height: '3px', background: 'rgba(255,255,255,0.04)' }}>
        <div style={{ height: '100%', width: `${progressPct}%`, background: 'linear-gradient(90deg, #7a6535, #c8a84b)', transition: 'width 0.6s ease', boxShadow: '0 0 8px rgba(200,168,75,0.6)' }} />
      </div>

      {/* ── ADMIN TOP CONTROLS (Srikant only) ── */}
      {isAdmin && (
        <div style={{ position: 'relative', zIndex: 10, padding: '0.5rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.04)', maxWidth: '560px', margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {/* category jump strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.35rem' }}>
              {[{ cat: 'BAT', label: 'Batters' }, { cat: 'BOWL', label: 'Bowlers' }, { cat: 'ALL', label: 'All-rounders' }].map(({ cat, label }) => {
                const count = catCounts[cat]
                const isCurrent = currentCat === cat
                const color = CAT_COLOR[cat]
                return (
                  <button key={cat} className="bid-btn"
                    disabled={count === 0 || isCurrent}
                    onClick={() => jumpToCategory(cat)}
                    style={{ padding: '0.45rem 0.4rem', background: isCurrent ? `${color}18` : 'transparent', border: `1px solid ${isCurrent ? color + '60' : 'rgba(255,255,255,0.06)'}`, borderRadius: '2px', fontFamily: 'Barlow Condensed', fontSize: '0.7rem', letterSpacing: '0.12em', color: isCurrent ? color : count === 0 ? '#2a2a2a' : '#647089', cursor: count === 0 || isCurrent ? 'default' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
                    <span style={{ fontWeight: 700 }}>{label}</span>
                    <span style={{ fontSize: '0.55rem', opacity: 0.7 }}>{count} left</span>
                  </button>
                )
              })}
            </div>
            <button className="bid-btn"
              onClick={e => sellPlayer(e)}
              disabled={!leader || bidding}
              style={{ width: '100%', padding: '0.85rem', background: leader ? 'rgba(130,179,102,0.12)' : 'rgba(255,255,255,0.02)', border: `1px solid ${leader ? 'rgba(130,179,102,0.45)' : 'rgba(255,255,255,0.05)'}`, borderRadius: '3px', fontFamily: 'Bebas Neue', fontSize: '1.15rem', letterSpacing: '0.15em', color: leader ? '#82b366' : '#647089', cursor: leader ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <Hammer size={18} color={leader ? '#82b366' : '#647089'} />
              SOLD {leader ? `→ ${leader}` : '— no bids'}
            </button>
            {!confirmSkip ? (
              <button className="bid-btn" onClick={() => setConfirmSkip(true)}
                style={{ width: '100%', padding: '0.6rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '3px', fontFamily: 'Barlow Condensed', fontSize: '0.8rem', letterSpacing: '0.2em', color: '#3a3a3a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                <SkipForward size={12} color="#3a3a3a" /> Skip player
              </button>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                <button className="bid-btn" onClick={skipPlayer}
                  style={{ padding: '0.7rem', background: 'rgba(160,80,80,0.1)', border: '1px solid rgba(160,80,80,0.35)', borderRadius: '3px', fontFamily: 'Barlow Condensed', fontSize: '0.8rem', letterSpacing: '0.1em', color: '#c06060', cursor: 'pointer' }}>
                  Confirm skip
                </button>
                <button className="bid-btn" onClick={() => setConfirmSkip(false)}
                  style={{ padding: '0.7rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '3px', fontFamily: 'Barlow Condensed', fontSize: '0.8rem', letterSpacing: '0.1em', color: '#647089', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: '560px', margin: '0 auto', width: '100%', padding: '0 1.25rem 6rem', position: 'relative', zIndex: 1 }}>

        {/* ── PLAYER NAME — huge, centered, cinematic ── */}
        <div style={{ flex: '0 0 auto', padding: '3rem 0 2rem' }} key={gs.current_player}>
          <div
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              overflow: 'hidden',
              padding: isMarquee ? '2rem 1.25rem' : 0,
              borderRadius: isMarquee ? '28px' : 0,
              border: isMarquee ? '1px solid rgba(248,214,128,0.35)' : 'none',
              background: isMarquee ? 'linear-gradient(135deg, rgba(200,168,75,0.16), rgba(255,255,255,0.03) 45%, rgba(200,168,75,0.08))' : 'transparent',
              boxShadow: isMarquee ? '0 0 80px rgba(200,168,75,0.18), inset 0 0 30px rgba(255,240,190,0.05)' : 'none',
            }}
          >
            {isMarquee && (
              <>
                <div style={{ position: 'absolute', inset: '-20%', background: 'radial-gradient(circle, rgba(255,223,120,0.18), transparent 60%)', animation: 'premiumHalo 2.3s ease-in-out infinite' }} />
                <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', inset: '-25%', background: 'linear-gradient(110deg, transparent 35%, rgba(255,255,255,0.08) 48%, rgba(255,225,135,0.4) 52%, transparent 68%)', animation: 'premiumShimmer 2.8s linear infinite' }} />
                </div>
              </>
            )}
            {isMarquee && (
              <div style={{ position: 'relative', fontFamily: 'Barlow Condensed', fontSize: '0.78rem', letterSpacing: '0.45em', color: '#f6d57c', marginBottom: '0.75rem', textTransform: 'uppercase', fontWeight: 700, animation: 'starIn 0.4s ease' }}>
                Marquee Player
              </div>
            )}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', animation: 'starIn 0.5s ease', justifyContent: 'center' }}>
              <span style={{ fontFamily: 'Barlow Condensed', fontSize: '0.7rem', letterSpacing: '0.4em', color: tier.color, textTransform: 'uppercase', fontWeight: 700 }}>
                {tier.label}-TIER · OVR {gs.current_ovr}
              </span>
              <span style={{ fontFamily: 'Barlow Condensed', fontSize: '0.65rem', letterSpacing: '0.25em', color: CAT_COLOR[currentCat], background: `${CAT_COLOR[currentCat]}18`, border: `1px solid ${CAT_COLOR[currentCat]}40`, borderRadius: '2px', padding: '1px 6px', textTransform: 'uppercase', fontWeight: 700 }}>
                {CAT_LABEL[currentCat]}
              </span>
            </div>
            <div style={{ position: 'relative', fontFamily: 'Bebas Neue', fontSize: 'clamp(2.8rem, 10vw, 5.5rem)', color: isMarquee ? '#f8e6a0' : '#fff', letterSpacing: '0.02em', lineHeight: 0.95, textAlign: 'center', textShadow: isMarquee ? '0 0 45px rgba(248,230,160,0.42)' : '0 4px 60px rgba(255,255,255,0.06)' }}>
              {gs.current_player.split('').map((ch, i) => (
                <span key={i} style={{ display: 'inline-block', animation: 'charIn 0.35s ease both', animationDelay: `${i * 0.025}s` }}>{ch === ' ' ? '\u00A0' : ch}</span>
              ))}
            </div>
            <div style={{ position: 'relative', fontFamily: 'Barlow Condensed', fontSize: '0.75rem', color: isMarquee ? '#d3b568' : '#aeb8cc', letterSpacing: '0.2em', marginTop: '0.6rem', animation: 'starIn 0.55s ease' }}>
              BASE {formatINR(openingBid)}
            </div>
          </div>
        </div>

        {/* ── HEAT METER ── */}
        {heatPct > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.55rem', letterSpacing: '0.3em', color: '#555', textTransform: 'uppercase' }}>Bid heat</div>
              <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.55rem', color: heatPct > 70 ? '#e04040' : heatPct > 40 ? '#e08040' : '#c8a84b', letterSpacing: '0.1em' }}>
                {heatPct > 70 ? 'HOT' : heatPct > 40 ? 'WARM' : 'RISING'}
              </div>
            </div>
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${heatPct}%`, background: heatPct > 70 ? 'linear-gradient(90deg, #c8a84b, #e04040)' : heatPct > 40 ? 'linear-gradient(90deg, #c8a84b, #e08040)' : '#c8a84b', transition: 'width 0.4s ease', animation: heatPct > 70 ? 'heatGlow 1s ease-in-out infinite' : 'none', boxShadow: heatPct > 70 ? '0 0 8px rgba(224,64,64,0.7)' : '0 0 6px rgba(200,168,75,0.4)' }} />
            </div>
          </div>
        )}

        {/* ── CURRENT BID ── */}
        <div style={{ textAlign: 'center', marginBottom: liveBidTrail.length > 0 ? '0.75rem' : '1.75rem' }}>
          <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.65rem', letterSpacing: '0.3em', color: '#8a93a8', marginBottom: '0.3rem' }}>CURRENT BID</div>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: 'clamp(2.5rem, 8vw, 4rem)', color: '#c8a84b', letterSpacing: '0.05em', lineHeight: 1, textShadow: '0 0 40px rgba(200,168,75,0.25)' }}>
            {formatINR(currentBid)}
          </div>
          {leader ? (
            <div style={{ marginTop: '0.4rem', fontFamily: 'Bebas Neue', fontSize: '1.1rem', color: PlayerColor(leader), letterSpacing: '0.1em', textShadow: `0 0 30px rgba(${hexToRgb(PlayerColor(leader))}, 0.4)` }}>
              {isLeader ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}><Star size={14} color={PlayerColor(leader)} /> YOU ARE WINNING</span> : `↑ ${leader} (${PLAYER_TEAMS[leader]})`}
            </div>
          ) : (
            <div style={{ marginTop: '0.4rem', fontFamily: 'Barlow Condensed', fontSize: '0.85rem', color: '#c7d0e0', letterSpacing: '0.15em' }}>Open for base-price purchase</div>
          )}
        </div>

        {/* ── LIVE BID TRAIL ── */}
        {liveBidTrail.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '1.25rem', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '2px', border: '1px solid rgba(255,255,255,0.04)' }}>
            {liveBidTrail.map((entry, i) => (
              <React.Fragment key={i}>
                {i > 0 && <ChevronRight size={11} color="#333" />}
                <span style={{ fontFamily: 'Barlow Condensed', fontSize: '0.75rem', color: entry.bidder === player ? PlayerColor(player) : '#8a93a8', fontWeight: entry.bidder === player ? 700 : 400, letterSpacing: '0.05em' }}>
                  {entry.bidder === player ? 'YOU' : entry.bidder} <span style={{ color: i === liveBidTrail.length - 1 ? '#c8a84b' : '#555' }}>{formatINR(entry.bid)}</span>
                </span>
              </React.Fragment>
            ))}
          </div>
        )}

        {/* ── ACTION FEEDBACK ── */}
        <div style={{ textAlign: 'center', height: '1.5rem', marginBottom: '0.75rem', position: 'relative' }}>
          {lastAction && (
            <div key={actionKey} style={{ position: 'absolute', left: 0, right: 0, fontFamily: 'Barlow Condensed', fontSize: '0.8rem', letterSpacing: '0.2em', color: lastAction === 'unbid' ? '#bf6060' : lastAction === 'sold' ? '#82b366' : '#c8a84b', animation: 'actionPop 1.2s ease forwards' }}>
              {actionLabel[lastAction]}
            </div>
          )}
        </div>

        {/* ── BID CONTROLS ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>

          {/* quick raise buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
            {quickRaiseOptions.map(inc => {
              const amount = currentBid + inc
              return (
              <button key={inc} className="bid-btn"
                disabled={bidding || isLeader || purse < amount}
                onClick={e => placeBid(amount, e)}
                style={{ padding: '0.85rem 0.5rem', background: 'rgba(200,168,75,0.07)', border: '1px solid rgba(200,168,75,0.2)', borderRadius: '2px', fontFamily: 'Bebas Neue', fontSize: '1rem', letterSpacing: '0.1em', color: '#c8a84b', cursor: 'pointer' }}>
                +{formatINR(inc)}
              </button>
            )})}
          </div>

          {/* primary bid button OR winning state */}
          {isLeader ? (
            <div style={{ position: 'relative', padding: '1rem', borderRadius: '2px', textAlign: 'center', border: `1px solid rgba(${hexToRgb(PlayerColor(player))}, 0.5)`, overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, background: `rgba(${hexToRgb(PlayerColor(player))}, 0.08)`, animation: 'leadPulse 1.8s ease-in-out infinite' }} />
              <div style={{ position: 'relative', fontFamily: 'Bebas Neue', fontSize: '1.1rem', letterSpacing: '0.2em', color: PlayerColor(player), textShadow: `0 0 20px rgba(${hexToRgb(PlayerColor(player))}, 0.6)`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                <Star size={14} color={PlayerColor(player)} /> YOU'RE LEADING
              </div>
              <div style={{ position: 'relative', fontFamily: 'Barlow Condensed', fontSize: '0.7rem', letterSpacing: '0.15em', color: `rgba(${hexToRgb(PlayerColor(player))}, 0.6)`, marginTop: '2px' }}>
                Wait for someone to outbid
              </div>
            </div>
          ) : (
            <button className="bid-btn"
              disabled={bidding || !canAfford}
              onClick={e => placeBid(minimumBid, e)}
              style={{ padding: '1.1rem', background: canAfford ? 'rgba(200,168,75,0.13)' : 'rgba(255,255,255,0.02)', border: `1px solid ${canAfford ? 'rgba(200,168,75,0.45)' : 'rgba(255,255,255,0.05)'}`, borderRadius: '2px', fontFamily: 'Bebas Neue', fontSize: '1.25rem', letterSpacing: '0.15em', color: canAfford ? '#c8a84b' : '#647089', cursor: canAfford ? 'pointer' : 'not-allowed' }}>
              {leader ? `BID ${formatINR(minimumBid)}` : `BUY AT BASE ${formatINR(minimumBid)}`}
            </button>
          )}

          {/* custom amount */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input ref={inputRef} type="number" value={customBid}
              onChange={e => setCustomBid(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCustomBid(e)}
              placeholder={`Custom (min ${formatINR(minimumBid)})`}
              style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '2px', color: '#fff', fontFamily: 'Barlow Condensed', fontSize: '0.95rem', outline: 'none', letterSpacing: '0.05em' }} />
            <button className="bid-btn" onClick={handleCustomBid}
              disabled={!customBid || parseInt(customBid, 10) < minimumBid || parseInt(customBid, 10) > purse}
              style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '2px', fontFamily: 'Barlow Condensed', fontSize: '0.9rem', letterSpacing: '0.1em', color: '#888', cursor: 'pointer' }}>
              Place
            </button>
          </div>

          {/* un-bid */}
          {isLeader && bidHistory.length > 0 && (
            <button className="bid-btn" onClick={e => undoBid(e)}
              disabled={bidding}
              style={{ padding: '0.65rem', background: 'rgba(191,96,96,0.06)', border: '1px solid rgba(191,96,96,0.2)', borderRadius: '2px', fontFamily: 'Barlow Condensed', fontSize: '0.8rem', letterSpacing: '0.2em', color: '#bf6060', cursor: 'pointer', textTransform: 'uppercase' }}>
              ↩ Remove my last bid
            </button>
          )}
        </div>

        {/* admin controls moved to top bar */}

        {/* purse section removed — moved to sticky footer below */}

        {/* ── SOLD LOG ── */}
        <div style={{ paddingBottom: '2rem' }}>
          <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.6rem', letterSpacing: '0.3em', color: '#8a93a8', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Sold log ({sold.length})</div>
          {sold.length === 0 ? (
            <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.8rem', color: '#d3dced', letterSpacing: '0.1em' }}>No sales yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {[...sold].reverse().map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.45rem 0.6rem', background: MARQUEE_PLAYERS.has(s.player) ? 'linear-gradient(135deg, rgba(200,168,75,0.12), rgba(255,255,255,0.02))' : s.winner === player ? `rgba(${hexToRgb(PlayerColor(player))}, 0.06)` : 'rgba(255,255,255,0.015)', borderRadius: '2px', border: `1px solid ${MARQUEE_PLAYERS.has(s.player) ? 'rgba(248,214,128,0.28)' : 'rgba(255,255,255,0.03)'}` }}>
                  <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.65rem', color: '#a7b1c5', minWidth: '1.2rem' }}>{sold.length - i}</div>
                  <div style={{ flex: 1, fontFamily: 'Barlow Condensed', fontSize: '0.85rem', fontWeight: 700, color: MARQUEE_PLAYERS.has(s.player) ? '#f1d88b' : '#3a3a3a', letterSpacing: '0.02em' }}>
                    {s.player}{MARQUEE_PLAYERS.has(s.player) ? <Diamond size={10} color="#c8a84b" style={{ marginLeft: 4, verticalAlign: 'middle' }} /> : ''}
                  </div>
                  <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.75rem', color: PlayerColor(s.winner), fontWeight: 700, minWidth: '3.5rem', textAlign: 'right' }}>{s.winner}</div>
                  <div style={{ fontFamily: 'Bebas Neue', fontSize: '0.9rem', color: '#7a6535', minWidth: '3.5rem', textAlign: 'right' }}>{formatINR(s.price)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── ADMIN RESET ── */}
        {isAdmin && (
          <div style={{ textAlign: 'center', paddingBottom: '3rem' }}>
            {!confirmReset ? (
              <button onClick={() => setConfirmReset(true)}
                style={{ background: 'none', border: 'none', fontFamily: 'Barlow Condensed', fontSize: '0.65rem', letterSpacing: '0.25em', color: '#1e1414', cursor: 'pointer', textTransform: 'uppercase' }}>
                Reset entire auction
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', alignItems: 'center' }}>
                <span style={{ fontFamily: 'Barlow Condensed', fontSize: '0.75rem', color: '#3a3028', letterSpacing: '0.1em' }}>Wipes everything.</span>
                <button onClick={onReset} style={{ background: 'none', border: '1px solid rgba(160,48,48,0.35)', borderRadius: '2px', padding: '0.3rem 0.8rem', fontFamily: 'Barlow Condensed', fontSize: '0.7rem', letterSpacing: '0.15em', color: '#802020', cursor: 'pointer' }}>Yes, reset</button>
                <button onClick={() => setConfirmReset(false)} style={{ background: 'none', border: 'none', fontFamily: 'Barlow Condensed', fontSize: '0.7rem', color: '#b5bfd2', cursor: 'pointer' }}>Cancel</button>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── STICKY PURSE FOOTER ── */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, background: 'rgba(6,4,10,0.96)', borderTop: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)', padding: '0.5rem 0.75rem 0.6rem' }}>
        <div style={{ maxWidth: '560px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.35rem' }}>
            {PLAYERS.map(p => {
              const amt = gs.purses?.[p] ?? STARTING_PURSE
              const pct = Math.max(0, (amt / STARTING_PURSE) * 100)
              const col = PlayerColor(p)
              const isMe = p === player
              const isWin = p === leader
              const pWarn = amt / STARTING_PURSE < 0.2
              const pCrit = amt / STARTING_PURSE < 0.1
              return (
                <div key={p} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.6rem', letterSpacing: '0.04em', color: isMe ? col : isWin ? '#c8a84b' : '#647089', fontWeight: isMe || isWin ? 700 : 400, transition: 'color 0.3s' }}>
                      {p}{isWin ? <Star size={8} color="#c8a84b" style={{ marginLeft: 2, verticalAlign: 'middle' }} /> : ''}
                    </div>
                    <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.5rem', color: pCrit ? '#e04040' : pWarn ? '#e08040' : '#555', animation: pCrit ? 'pursePulse 0.9s ease-in-out infinite' : 'none' }}>
                      {pCrit ? '⚠' : pWarn ? '!' : ''}
                    </div>
                  </div>
                  <div style={{ height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: pCrit ? '#e04040' : pWarn ? '#e08040' : col, opacity: isMe ? 0.9 : 0.4, transition: 'width 0.5s ease, background 0.4s', borderRadius: '2px' }} />
                  </div>
                  <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.5rem', color: pCrit ? '#e04040' : pWarn ? '#e08040' : '#3a3a3a', transition: 'color 0.4s', animation: pCrit ? 'pursePulse 0.9s ease-in-out infinite' : 'none' }}>
                    {formatINR(amt)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
