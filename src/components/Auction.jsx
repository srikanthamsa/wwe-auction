import React, { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, PLAYERS, BID_INCREMENT, getBaseBid, getTier } from '../lib/supabase.js'

const PLAYER_COLORS = {
  Srikant: '#6c8ebf', Ashpak: '#82b366', KVD: '#d6a94a', Ekansh: '#ae6aaf', Debu: '#bf6060'
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
  const [prevStar, setPrevStar] = useState(null)
  const [ripples, triggerRipple] = useRipple()
  const inputRef = useRef(null)

  const gs = gameState
  const purse = gs?.purses?.[player] ?? 50000
  const currentBid = gs?.current_bid ?? 0
  const leader = gs?.current_leader
  const isLeader = leader === player
  const isAdmin = player === 'Srikant'
  const bidHistory = gs?.bid_history ?? []
  const sold = gs?.sold_log ?? []
  const total = gs?.roster?.length ?? 0
  const doneIdx = gs?.roster_index ?? 0
  const tier = gs ? getTier(gs.current_ovr) : { label: 'B', color: '#cd7f32' }
  const nextBid = currentBid + BID_INCREMENT
  const canAfford = purse >= nextBid

  // detect superstar change → show sold flash
  useEffect(() => {
    if (!gs) return
    if (prevStar && prevStar !== gs.current_superstar && sold.length > 0) {
      const last = sold[sold.length - 1]
      setSoldFlash(last)
      setTimeout(() => setSoldFlash(null), 2500)
    }
    setPrevStar(gs.current_superstar)
  }, [gs?.current_superstar])

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
    if (bidding || purse < amount) return
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
      current_bid: prev?.bid ?? getBaseBid(gs.current_ovr),
      current_leader: prev?.bidder ?? null,
      bid_history: newHistory,
    }).eq('id', 1)
    setBidding(false)
  }

  async function sellSuperstar(e) {
    if (!isAdmin || !leader) return
    if (e) triggerRipple(e.clientX, e.clientY, '#82b366')
    flash('sold')
    const newLog = [...sold, { superstar: gs.current_superstar, ovr: gs.current_ovr, winner: leader, price: currentBid }]
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

  const actionLabel = {
    bid: '✓ Bid placed',
    unbid: '↩ Bid removed',
    sold: '🔨 Sold!',
    skip: '→ Skipped',
  }

  if (!gs) return null

  return (
    <div style={{ minHeight: '100vh', background: '#06040a', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>

      {/* global keyframes */}
      <style>{`
        @keyframes soldIn { 0%{opacity:0;transform:translateY(20px) scale(0.9)} 20%{opacity:1;transform:translateY(0) scale(1)} 80%{opacity:1;transform:translateY(0) scale(1)} 100%{opacity:0;transform:translateY(-10px) scale(0.95)} }
        @keyframes starIn { 0%{opacity:0;transform:translateY(32px)} 100%{opacity:1;transform:translateY(0)} }
        @keyframes actionPop { 0%{opacity:0;transform:translateY(6px)} 15%{opacity:1;transform:translateY(0)} 80%{opacity:1} 100%{opacity:0} }
        @keyframes rippleOut { 0%{transform:translate(-50%,-50%) scale(0);opacity:0.6} 100%{transform:translate(-50%,-50%) scale(6);opacity:0} }
        @keyframes glowPulse { 0%,100%{opacity:0.6} 50%{opacity:1} }
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

      {/* SOLD flash overlay */}
      {soldFlash && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 150, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(6,4,10,0.88)', animation: 'soldIn 2.5s ease forwards', pointerEvents: 'none' }}>
          <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.85rem', letterSpacing: '0.4em', color: '#555', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Sold to</div>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: 'clamp(3rem, 12vw, 6rem)', color: PlayerColor(soldFlash.winner), letterSpacing: '0.05em', lineHeight: 1, textShadow: `0 0 60px rgba(${hexToRgb(PlayerColor(soldFlash.winner))}, 0.5)` }}>{soldFlash.winner}</div>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#c8a84b', letterSpacing: '0.1em', marginTop: '0.25rem' }}>₹{soldFlash.price.toLocaleString()}</div>
        </div>
      )}

      {/* scanlines */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.05) 3px, rgba(0,0,0,0.05) 4px)' }} />

      {/* ambient glow behind superstar name */}
      <div style={{ position: 'fixed', top: '35%', left: '50%', transform: 'translate(-50%, -50%)', width: '800px', height: '400px', background: 'radial-gradient(ellipse, rgba(80,50,160,0.08) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0, animation: 'glowPulse 4s ease-in-out infinite' }} />

      {/* ── TOP BAR ── */}
      <div style={{ position: 'relative', zIndex: 10, padding: '0.8rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.1rem', color: '#c8a84b', letterSpacing: '0.08em' }}>WWE 2K25</div>
          <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.65rem', color: '#2a2020', letterSpacing: '0.25em' }}>{doneIdx + 1} / {total}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.65rem', color: '#2a2020', letterSpacing: '0.2em', marginBottom: '1px' }}>YOU</div>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: '1rem', color: PlayerColor(player), letterSpacing: '0.08em' }}>{player}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.65rem', color: '#2a2020', letterSpacing: '0.2em', marginBottom: '1px' }}>PURSE</div>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: '1rem', color: '#c8a84b', letterSpacing: '0.05em' }}>₹{purse.toLocaleString()}</div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: '560px', margin: '0 auto', width: '100%', padding: '0 1.25rem', position: 'relative', zIndex: 1 }}>

        {/* ── SUPERSTAR NAME — huge, centered, cinematic ── */}
        <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 0 2rem', textAlign: 'center' }} key={gs.current_superstar}>
          <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.7rem', letterSpacing: '0.4em', color: tier.color, marginBottom: '0.75rem', textTransform: 'uppercase', fontWeight: 700, animation: 'starIn 0.5s ease' }}>
            {tier.label}-TIER · OVR {gs.current_ovr}
          </div>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: 'clamp(2.8rem, 10vw, 5.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 0.95, textAlign: 'center', animation: 'starIn 0.45s ease', textShadow: '0 4px 60px rgba(255,255,255,0.06)' }}>
            {gs.current_superstar}
          </div>
          <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.75rem', color: '#2a2020', letterSpacing: '0.2em', marginTop: '0.6rem', animation: 'starIn 0.55s ease' }}>
            BASE ₹{getBaseBid(gs.current_ovr).toLocaleString()}
          </div>
        </div>

        {/* ── CURRENT BID ── */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.65rem', letterSpacing: '0.3em', color: '#2a2020', marginBottom: '0.3rem' }}>CURRENT BID</div>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: 'clamp(2.5rem, 8vw, 4rem)', color: '#c8a84b', letterSpacing: '0.05em', lineHeight: 1, textShadow: '0 0 40px rgba(200,168,75,0.25)' }}>
            ₹{currentBid.toLocaleString()}
          </div>
          {leader ? (
            <div style={{ marginTop: '0.4rem', fontFamily: 'Bebas Neue', fontSize: '1.1rem', color: PlayerColor(leader), letterSpacing: '0.1em', textShadow: `0 0 30px rgba(${hexToRgb(PlayerColor(leader))}, 0.4)` }}>
              {isLeader ? '← YOU ARE WINNING' : `↑ ${leader}`}
            </div>
          ) : (
            <div style={{ marginTop: '0.4rem', fontFamily: 'Barlow Condensed', fontSize: '0.85rem', color: '#2a2020', letterSpacing: '0.15em' }}>No bids yet</div>
          )}
        </div>

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
            {[BID_INCREMENT, 1000, 2000].map(inc => (
              <button key={inc} className="bid-btn"
                disabled={bidding || isLeader || !canAfford || purse < nextBid + inc - BID_INCREMENT}
                onClick={e => placeBid(nextBid + inc - BID_INCREMENT, e)}
                style={{ padding: '0.85rem 0.5rem', background: 'rgba(200,168,75,0.07)', border: '1px solid rgba(200,168,75,0.2)', borderRadius: '2px', fontFamily: 'Bebas Neue', fontSize: '1rem', letterSpacing: '0.1em', color: '#c8a84b', cursor: 'pointer' }}>
                +₹{inc >= 1000 ? `${inc / 1000}k` : inc}
              </button>
            ))}
          </div>

          {/* primary bid button OR winning state */}
          {isLeader ? (
            <div style={{ padding: '1rem', background: `rgba(${hexToRgb(PlayerColor(player))}, 0.08)`, border: `1px solid rgba(${hexToRgb(PlayerColor(player))}, 0.25)`, borderRadius: '2px', textAlign: 'center', fontFamily: 'Barlow Condensed', fontSize: '0.9rem', letterSpacing: '0.2em', color: PlayerColor(player) }}>
              You're leading — wait for someone to outbid
            </div>
          ) : (
            <button className="bid-btn"
              disabled={bidding || !canAfford}
              onClick={e => placeBid(nextBid, e)}
              style={{ padding: '1.1rem', background: canAfford ? 'rgba(200,168,75,0.13)' : 'rgba(255,255,255,0.02)', border: `1px solid ${canAfford ? 'rgba(200,168,75,0.45)' : 'rgba(255,255,255,0.05)'}`, borderRadius: '2px', fontFamily: 'Bebas Neue', fontSize: '1.25rem', letterSpacing: '0.15em', color: canAfford ? '#c8a84b' : '#2a2020', cursor: canAfford ? 'pointer' : 'not-allowed' }}>
              BID ₹{nextBid.toLocaleString()}
            </button>
          )}

          {/* custom amount */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input ref={inputRef} type="number" value={customBid}
              onChange={e => setCustomBid(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCustomBid(e)}
              placeholder={`Custom (min ₹${nextBid.toLocaleString()})`}
              style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '2px', color: '#fff', fontFamily: 'Barlow Condensed', fontSize: '0.95rem', outline: 'none', letterSpacing: '0.05em' }} />
            <button className="bid-btn" onClick={handleCustomBid}
              disabled={!customBid || parseInt(customBid) <= currentBid || parseInt(customBid) > purse}
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

        {/* ── AUCTIONEER CONTROLS (Srikant only) ── */}
        {isAdmin && (
          <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.25rem' }}>
            <button className="bid-btn"
              onClick={e => sellSuperstar(e)}
              disabled={!leader || bidding}
              style={{ flex: 1, padding: '1rem', background: leader ? 'rgba(130,179,102,0.1)' : 'rgba(255,255,255,0.02)', border: `1px solid ${leader ? 'rgba(130,179,102,0.4)' : 'rgba(255,255,255,0.05)'}`, borderRadius: '2px', fontFamily: 'Bebas Neue', fontSize: '1.1rem', letterSpacing: '0.15em', color: leader ? '#82b366' : '#2a2020', cursor: leader ? 'pointer' : 'not-allowed' }}>
              🔨 Sold — {leader ? leader : 'no bids'}
            </button>
            {!confirmSkip ? (
              <button className="bid-btn" onClick={() => setConfirmSkip(true)}
                style={{ padding: '1rem 1.1rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '2px', fontFamily: 'Barlow Condensed', fontSize: '0.8rem', letterSpacing: '0.15em', color: '#333', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Skip
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button className="bid-btn" onClick={skipSuperstar}
                  style={{ padding: '0.75rem 0.75rem', background: 'rgba(160,80,80,0.1)', border: '1px solid rgba(160,80,80,0.3)', borderRadius: '2px', fontFamily: 'Barlow Condensed', fontSize: '0.75rem', color: '#a05050', cursor: 'pointer' }}>
                  Confirm skip
                </button>
                <button className="bid-btn" onClick={() => setConfirmSkip(false)}
                  style={{ padding: '0.75rem 0.6rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '2px', fontFamily: 'Barlow Condensed', fontSize: '0.75rem', color: '#333', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── PURSE BARS ── */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.6rem', letterSpacing: '0.3em', color: '#222', marginBottom: '0.6rem', textTransform: 'uppercase' }}>Purses</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.4rem' }}>
            {PLAYERS.map(p => {
              const amt = gs.purses?.[p] ?? 50000
              const pct = (amt / 50000) * 100
              const col = PlayerColor(p)
              const isMe = p === player
              const isWinner = p === leader
              return (
                <div key={p} style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.6rem', letterSpacing: '0.05em', color: isMe ? col : isWinner ? '#c8a84b' : '#252525', fontWeight: isMe || isWinner ? 700 : 400, marginBottom: '3px', transition: 'color 0.3s' }}>
                    {p}{isWinner ? ' ★' : ''}
                  </div>
                  <div style={{ height: '36px', background: 'rgba(255,255,255,0.03)', borderRadius: '1px', overflow: 'hidden', position: 'relative' }}>
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${pct}%`, background: col, opacity: isMe ? 0.65 : 0.25, transition: 'height 0.5s ease, opacity 0.3s', borderRadius: '1px 1px 0 0' }} />
                  </div>
                  <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.55rem', color: '#252525', marginTop: '2px' }}>₹{Math.round(amt / 1000)}k</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── SOLD LOG ── */}
        <div style={{ paddingBottom: '2rem' }}>
          <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.6rem', letterSpacing: '0.3em', color: '#222', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Sold log ({sold.length})</div>
          {sold.length === 0 ? (
            <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.8rem', color: '#1e1e1e', letterSpacing: '0.1em' }}>No sales yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {[...sold].reverse().map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.45rem 0.6rem', background: s.winner === player ? `rgba(${hexToRgb(PlayerColor(player))}, 0.06)` : 'rgba(255,255,255,0.015)', borderRadius: '2px', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.65rem', color: '#252525', minWidth: '1.2rem' }}>{sold.length - i}</div>
                  <div style={{ flex: 1, fontFamily: 'Barlow Condensed', fontSize: '0.85rem', fontWeight: 700, color: '#3a3a3a', letterSpacing: '0.02em' }}>{s.superstar}</div>
                  <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.75rem', color: PlayerColor(s.winner), fontWeight: 700, minWidth: '3.5rem', textAlign: 'right' }}>{s.winner}</div>
                  <div style={{ fontFamily: 'Bebas Neue', fontSize: '0.9rem', color: '#7a6535', minWidth: '3.5rem', textAlign: 'right' }}>₹{s.price.toLocaleString()}</div>
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
                <button onClick={() => setConfirmReset(false)} style={{ background: 'none', border: 'none', fontFamily: 'Barlow Condensed', fontSize: '0.7rem', color: '#252525', cursor: 'pointer' }}>Cancel</button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
