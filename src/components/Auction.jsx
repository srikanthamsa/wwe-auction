import React, { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, PLAYERS, PLAYER_TEAMS, BID_INCREMENT, STARTING_PURSE, getBaseBid, getTier } from '../lib/supabase.js'
import { MARQUEE_PLAYERS } from '../lib/roster.js'

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
  const quickRaiseOptions = [BID_INCREMENT, 500, 1000]

  // detect player change → show sold flash
  useEffect(() => {
    if (!gs) return
    if (prevPlayer && prevPlayer !== gs.current_player && sold.length > 0) {
      const last = sold[sold.length - 1]
      setSoldFlash(last)
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
      await supabase.from('auction_state').update({ phase: 'results', sold_log: newLog, purses: newPurses }).eq('id', 1)
      return
    }
    const next = gs.roster[nextIdx]
    await supabase.from('auction_state').update({
      roster_index: nextIdx, current_player: next[0], current_ovr: next[1],
      current_bid: getBaseBid(next[1]), current_leader: null,
      bid_history: [], sold_log: newLog, purses: newPurses, phase: 'bidding',
    }).eq('id', 1)
  }

  async function skipPlayer() {
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
        @keyframes premiumShimmer { 0%{transform:translateX(-130%) skewX(-20deg)} 100%{transform:translateX(130%) skewX(-20deg)} }
        @keyframes premiumHalo { 0%,100%{opacity:0.45;transform:scale(0.98)} 50%{opacity:0.85;transform:scale(1.02)} }
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
          <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.85rem', letterSpacing: '0.4em', color: '#555', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Sold to</div>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: 'clamp(3rem, 12vw, 6rem)', color: PlayerColor(soldFlash.winner), letterSpacing: '0.05em', lineHeight: 1, textShadow: `0 0 60px rgba(${hexToRgb(PlayerColor(soldFlash.winner))}, 0.5)` }}>{soldFlash.winner}</div>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: 'clamp(2.2rem, 9vw, 4rem)', color: MARQUEE_PLAYERS.has(soldFlash.player) ? '#f8e6a0' : '#fff', letterSpacing: '0.05em', lineHeight: 0.95, marginTop: '0.65rem', textAlign: 'center', textShadow: MARQUEE_PLAYERS.has(soldFlash.player) ? '0 0 45px rgba(248,230,160,0.4)' : 'none' }}>
            {soldFlash.player}
          </div>
          <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.8rem', letterSpacing: '0.3em', color: '#555', marginTop: '0.25rem' }}>{PLAYER_TEAMS[soldFlash.winner]}</div>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#c8a84b', letterSpacing: '0.1em', marginTop: '0.25rem' }}>₹{soldFlash.price.toLocaleString()}</div>
        </div>
      )}

      {/* scanlines */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.05) 3px, rgba(0,0,0,0.05) 4px)' }} />

      {/* ambient glow */}
      <div style={{ position: 'fixed', top: '35%', left: '50%', transform: 'translate(-50%, -50%)', width: '800px', height: '400px', background: 'radial-gradient(ellipse, rgba(200,168,75,0.06) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0, animation: 'glowPulse 4s ease-in-out infinite' }} />

      {/* ── TOP BAR ── */}
      <div style={{ position: 'relative', zIndex: 10, padding: '0.8rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.1rem', color: '#c8a84b', letterSpacing: '0.08em' }}>IPL Mega Auction</div>
          <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.65rem', color: '#8a93a8', letterSpacing: '0.25em' }}>{doneIdx + 1} / {total}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.65rem', color: '#8a93a8', letterSpacing: '0.2em', marginBottom: '1px' }}>YOU</div>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: '1rem', color: PlayerColor(player), letterSpacing: '0.08em' }}>{player} <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>{PLAYER_TEAMS[player]}</span></div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.65rem', color: '#8a93a8', letterSpacing: '0.2em', marginBottom: '1px' }}>PURSE</div>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: '1rem', color: '#c8a84b', letterSpacing: '0.05em' }}>₹{purse.toLocaleString()}</div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: '560px', margin: '0 auto', width: '100%', padding: '0 1.25rem', position: 'relative', zIndex: 1 }}>

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
            <div style={{ position: 'relative', fontFamily: 'Barlow Condensed', fontSize: '0.7rem', letterSpacing: '0.4em', color: tier.color, marginBottom: '0.75rem', textTransform: 'uppercase', fontWeight: 700, animation: 'starIn 0.5s ease' }}>
              {tier.label}-TIER · OVR {gs.current_ovr}
            </div>
            <div style={{ position: 'relative', fontFamily: 'Bebas Neue', fontSize: 'clamp(2.8rem, 10vw, 5.5rem)', color: isMarquee ? '#f8e6a0' : '#fff', letterSpacing: '0.02em', lineHeight: 0.95, textAlign: 'center', animation: 'starIn 0.45s ease', textShadow: isMarquee ? '0 0 45px rgba(248,230,160,0.42)' : '0 4px 60px rgba(255,255,255,0.06)' }}>
              {gs.current_player}
            </div>
            <div style={{ position: 'relative', fontFamily: 'Barlow Condensed', fontSize: '0.75rem', color: isMarquee ? '#d3b568' : '#aeb8cc', letterSpacing: '0.2em', marginTop: '0.6rem', animation: 'starIn 0.55s ease' }}>
              BASE ₹{openingBid.toLocaleString()}
            </div>
          </div>
        </div>

        {/* ── CURRENT BID ── */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.65rem', letterSpacing: '0.3em', color: '#8a93a8', marginBottom: '0.3rem' }}>CURRENT BID</div>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: 'clamp(2.5rem, 8vw, 4rem)', color: '#c8a84b', letterSpacing: '0.05em', lineHeight: 1, textShadow: '0 0 40px rgba(200,168,75,0.25)' }}>
            ₹{currentBid.toLocaleString()}
          </div>
          {leader ? (
            <div style={{ marginTop: '0.4rem', fontFamily: 'Bebas Neue', fontSize: '1.1rem', color: PlayerColor(leader), letterSpacing: '0.1em', textShadow: `0 0 30px rgba(${hexToRgb(PlayerColor(leader))}, 0.4)` }}>
              {isLeader ? '← YOU ARE WINNING' : `↑ ${leader} (${PLAYER_TEAMS[leader]})`}
            </div>
          ) : (
            <div style={{ marginTop: '0.4rem', fontFamily: 'Barlow Condensed', fontSize: '0.85rem', color: '#c7d0e0', letterSpacing: '0.15em' }}>Open for base-price purchase</div>
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
            {quickRaiseOptions.map(inc => {
              const amount = currentBid + inc
              return (
              <button key={inc} className="bid-btn"
                disabled={bidding || isLeader || purse < amount}
                onClick={e => placeBid(amount, e)}
                style={{ padding: '0.85rem 0.5rem', background: 'rgba(200,168,75,0.07)', border: '1px solid rgba(200,168,75,0.2)', borderRadius: '2px', fontFamily: 'Bebas Neue', fontSize: '1rem', letterSpacing: '0.1em', color: '#c8a84b', cursor: 'pointer' }}>
                +₹{inc.toLocaleString()}
              </button>
            )})}
          </div>

          {/* primary bid button OR winning state */}
          {isLeader ? (
            <div style={{ padding: '1rem', background: `rgba(${hexToRgb(PlayerColor(player))}, 0.08)`, border: `1px solid rgba(${hexToRgb(PlayerColor(player))}, 0.25)`, borderRadius: '2px', textAlign: 'center', fontFamily: 'Barlow Condensed', fontSize: '0.9rem', letterSpacing: '0.2em', color: PlayerColor(player) }}>
              You're leading — wait for someone to outbid
            </div>
          ) : (
            <button className="bid-btn"
              disabled={bidding || !canAfford}
              onClick={e => placeBid(minimumBid, e)}
              style={{ padding: '1.1rem', background: canAfford ? 'rgba(200,168,75,0.13)' : 'rgba(255,255,255,0.02)', border: `1px solid ${canAfford ? 'rgba(200,168,75,0.45)' : 'rgba(255,255,255,0.05)'}`, borderRadius: '2px', fontFamily: 'Bebas Neue', fontSize: '1.25rem', letterSpacing: '0.15em', color: canAfford ? '#c8a84b' : '#647089', cursor: canAfford ? 'pointer' : 'not-allowed' }}>
              {leader ? `BID ₹${minimumBid.toLocaleString()}` : `BUY AT BASE ₹${minimumBid.toLocaleString()}`}
            </button>
          )}

          {/* custom amount */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input ref={inputRef} type="number" value={customBid}
              onChange={e => setCustomBid(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCustomBid(e)}
              placeholder={`Custom (min ₹${minimumBid.toLocaleString()})`}
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

        {/* ── AUCTIONEER CONTROLS (Srikant only) ── */}
        {isAdmin && (
          <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.25rem' }}>
            <button className="bid-btn"
              onClick={e => sellPlayer(e)}
              disabled={!leader || bidding}
              style={{ flex: 1, padding: '1rem', background: leader ? 'rgba(130,179,102,0.1)' : 'rgba(255,255,255,0.02)', border: `1px solid ${leader ? 'rgba(130,179,102,0.4)' : 'rgba(255,255,255,0.05)'}`, borderRadius: '2px', fontFamily: 'Bebas Neue', fontSize: '1.1rem', letterSpacing: '0.15em', color: leader ? '#82b366' : '#647089', cursor: leader ? 'pointer' : 'not-allowed' }}>
              🔨 Sold — {leader ? `${leader} (${PLAYER_TEAMS[leader]})` : 'no bids'}
            </button>
            {!confirmSkip ? (
              <button className="bid-btn" onClick={() => setConfirmSkip(true)}
                style={{ padding: '1rem 1.1rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '2px', fontFamily: 'Barlow Condensed', fontSize: '0.8rem', letterSpacing: '0.15em', color: '#b5bfd2', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Skip
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button className="bid-btn" onClick={skipPlayer}
                  style={{ padding: '0.75rem 0.75rem', background: 'rgba(160,80,80,0.1)', border: '1px solid rgba(160,80,80,0.3)', borderRadius: '2px', fontFamily: 'Barlow Condensed', fontSize: '0.75rem', color: '#a05050', cursor: 'pointer' }}>
                  Confirm skip
                </button>
                <button className="bid-btn" onClick={() => setConfirmSkip(false)}
                  style={{ padding: '0.75rem 0.6rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '2px', fontFamily: 'Barlow Condensed', fontSize: '0.75rem', color: '#b5bfd2', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── PURSE BARS ── */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.6rem', letterSpacing: '0.3em', color: '#8a93a8', marginBottom: '0.6rem', textTransform: 'uppercase' }}>Purses</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.4rem' }}>
            {PLAYERS.map(p => {
              const amt = gs.purses?.[p] ?? STARTING_PURSE
              const pct = (amt / STARTING_PURSE) * 100
              const col = PlayerColor(p)
              const isMe = p === player
              const isWinner = p === leader
              return (
                <div key={p} style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.55rem', letterSpacing: '0.03em', color: isMe ? col : isWinner ? '#c8a84b' : '#b5bfd2', fontWeight: isMe || isWinner ? 700 : 500, marginBottom: '3px', transition: 'color 0.3s' }}>
                    {p}{isWinner ? ' ★' : ''}<br />
                    <span style={{ opacity: 0.6, fontSize: '0.5rem' }}>{PLAYER_TEAMS[p]}</span>
                  </div>
                  <div style={{ height: '36px', background: 'rgba(255,255,255,0.03)', borderRadius: '1px', overflow: 'hidden', position: 'relative' }}>
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${pct}%`, background: col, opacity: isMe ? 0.65 : 0.25, transition: 'height 0.5s ease, opacity 0.3s', borderRadius: '1px 1px 0 0' }} />
                  </div>
                  <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.55rem', color: '#d3dced', marginTop: '2px' }}>₹{(amt / 100000).toFixed(1)}L</div>
                </div>
              )
            })}
          </div>
        </div>

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
                    {s.player}{MARQUEE_PLAYERS.has(s.player) ? ' ✦' : ''}
                  </div>
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
                <button onClick={() => setConfirmReset(false)} style={{ background: 'none', border: 'none', fontFamily: 'Barlow Condensed', fontSize: '0.7rem', color: '#b5bfd2', cursor: 'pointer' }}>Cancel</button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
