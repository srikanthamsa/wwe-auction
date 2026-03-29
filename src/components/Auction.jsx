import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { supabase, PLAYERS, ADMIN_PLAYER, PLAYER_DISPLAY, BID_INCREMENT, getBaseBid, getTier, STARTING_PURSE } from '../lib/supabase.js'

// ── Player colours ───────────────────────────────────────────────────────────
const PLAYER_COLORS = {
  "Srikant Freakin' Hamsa":    '#818cf8',
  'Ashpak "KVD\'s Nightmare"': '#34d399',
  'KVD "The Never Seen 17"':   '#fbbf24',
  'Ekansh "The Beast" Tiwari': '#e879f9',
  'Debu "The Tribal Chief"':   '#fb7185',
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return `${r},${g},${b}`
}
function pc(name) { return PLAYER_COLORS[name] || '#a78bfa' }
function pFirst(name) { return PLAYER_DISPLAY[name]?.first || name }

// ── Superstar signature colours ──────────────────────────────────────────────
function getStarColors(name) {
  const n = name.toLowerCase()
  const m = (keys, cols) => keys.some(k => n.includes(k)) ? cols : null
  return (
    m(['seth rollins','freakin'],          ['#ff006e','#fb5607','#ffbe0b','#8338ec','#3a86ff']) ||
    m(['cody rhodes','el grande americano'],['#dc2626','#f8fafc','#1e40af']) ||
    m(['roman reigns'],                    ['#1d4ed8','#60a5fa','#e2e8f0','#94a3b8']) ||
    m(['brock lesnar'],                    ['#dc2626','#fbbf24','#1c1917']) ||
    m(['kofi kingston'],                   ['#16a34a','#22c55e','#fbbf24']) ||
    m(['john cena','super cena'],          ['#f97316','#1e40af','#10b981']) ||
    m(['randy orton'],                     ['#dc2626','#7f1d1d','#991b1b']) ||
    m(['cm punk'],                         ['#dc2626','#f8fafc','#1c1917']) ||
    m(['fiend','bray wyatt'],              ['#9333ea','#7c3aed','#dc2626','#1c1917']) ||
    m(['undertaker'],                      ['#6d28d9','#4c1d95','#a78bfa','#1c1917']) ||
    m(['triple h','jean-paul'],            ['#ca8a04','#fbbf24','#92400e']) ||
    m(['the rock',"rock '"],              ['#ca8a04','#dc2626','#78350f']) ||
    m(['hulk hogan','hollywood hogan'],    ['#facc15','#dc2626','#ea580c']) ||
    m(['goldberg'],                        ['#dc2626','#fbbf24','#1c1917']) ||
    m(['aj styles'],                       ['#1d4ed8','#dc2626','#f8fafc']) ||
    m(['finn bálor demon','demon'],        ['#dc2626','#1c1917','#991b1b']) ||
    m(['finn bálor'],                      ['#f8fafc','#3b82f6','#ec4899']) ||
    m(['shawn michaels'],                  ['#f472b6','#f8fafc','#ec4899']) ||
    m(['batista'],                         ['#1d4ed8','#60a5fa','#94a3b8']) ||
    m(['eddie guerrero'],                  ['#7c3aed','#ea580c','#facc15']) ||
    m(['kurt angle'],                      ['#dc2626','#f8fafc','#1e40af']) ||
    m(['sami zayn'],                       ['#ea580c','#dc2626','#f97316']) ||
    m(['kevin owens'],                     ['#15803d','#22c55e','#1c1917']) ||
    m(['drew mcintyre'],                   ['#1e40af','#60a5fa','#e2e8f0']) ||
    m(['gunther'],                         ['#1d4ed8','#ca8a04','#1e3a8a']) ||
    m(['damian priest'],                   ['#7c3aed','#6d28d9','#4c1d95']) ||
    m(['la knight'],                       ['#ca8a04','#fbbf24','#1c1917']) ||
    m(['jey uso'],                         ['#84cc16','#a3e635','#fbbf24']) ||
    m(['jimmy uso'],                       ['#f97316','#ea580c','#dc2626']) ||
    m(['solo sikoa'],                      ['#1d4ed8','#1e3a8a','#60a5fa']) ||
    m(['jacob fatu'],                      ['#dc2626','#7f1d1d','#1c1917']) ||
    m(['logan paul'],                      ['#ca8a04','#fbbf24','#0ea5e9']) ||
    m(['stone cold','steve austin'],       ['#94a3b8','#334155','#cbd5e1']) ||
    m(['randy savage','macho man'],        ['#ec4899','#facc15','#a855f7']) ||
    m(['bret hart'],                       ['#ec4899','#f472b6','#1c1917']) ||
    m(['razor ramon','scott hall'],        ['#ca8a04','#fbbf24','#1c1917']) ||
    m(['ultimate warrior'],               ['#7c3aed','#db2777','#dc2626','#ea580c']) ||
    m(['rey mysterio'],                    ['#16a34a','#7c3aed','#dc2626']) ||
    m(['shinsuke nakamura'],              ['#7c3aed','#dc2626','#f8fafc']) ||
    m(['sheamus'],                        ['#16a34a','#f8fafc','#15803d']) ||
    m(['braun strowman'],                 ['#dc2626','#9ca3af','#374151']) ||
    m(['rob van dam'],                    ['#16a34a','#ca8a04','#22c55e']) ||
    m(['bron breakker'],                  ['#1d4ed8','#dc2626','#3b82f6']) ||
    m(['carmelo hayes'],                  ['#7c3aed','#ca8a04','#a855f7']) ||
    m(['dominik mysterio'],               ['#15803d','#1c1917','#22c55e']) ||
    m(['kevin nash','diesel'],            ['#1e293b','#1d4ed8','#334155']) ||
    m(['elite'],                          ['#fbbf24','#f59e0b','#a78bfa']) ||
    ['#a78bfa','#e879f9','#818cf8']
  )
}

// Injects a dynamic @keyframes into the document for the current superstar
function useStarColorAnim(name) {
  const colors = useMemo(() => getStarColors(name), [name])
  useEffect(() => {
    let el = document.getElementById('star-color-anim')
    if (!el) { el = document.createElement('style'); el.id = 'star-color-anim'; document.head.appendChild(el) }
    const steps = colors.map((c, i) =>
      `${Math.round((i / colors.length) * 100)}% { color:${c}; text-shadow: 0 0 60px ${c}99, 0 0 120px ${c}44; }`
    ).join('\n')
    el.textContent = `@keyframes starColor {\n${steps}\n100%{color:${colors[0]};text-shadow:0 0 60px ${colors[0]}99,0 0 120px ${colors[0]}44;}}`
  }, [name, colors])
  const dur = `${Math.max(1.4, colors.length * 0.65)}s`
  return { animation: `starColor ${dur} ease-in-out infinite`, color: colors[0] }
}

// ── Ripple ────────────────────────────────────────────────────────────────────
function useRipple() {
  const [ripples, setRipples] = useState([])
  function trigger(x, y, color) {
    const id = Date.now()
    setRipples(r => [...r, { id, x, y, color }])
    setTimeout(() => setRipples(r => r.filter(rp => rp.id !== id)), 800)
  }
  return [ripples, trigger]
}

// ── Button helpers ────────────────────────────────────────────────────────────
const btnSmall = {
  cursor: 'pointer', fontFamily: 'Outfit, sans-serif', letterSpacing: '0.06em',
  transition: 'transform 0.12s ease, filter 0.12s ease', userSelect: 'none', border: 'none',
}
const btnGhost = {
  ...btnSmall, background: 'rgba(15,23,42,0.055)',
  boxShadow: 'inset 0 0 0 1px rgba(15,23,42,0.08)', color: 'rgba(15,23,42,0.65)',
}
const btnDanger = {
  ...btnSmall, background: 'rgba(239,68,68,0.1)',
  boxShadow: 'inset 0 0 0 1px rgba(239,68,68,0.18)', color: '#f87171',
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Auction({ player, gameState, onRefresh, onReset }) {
  const [customBid, setCustomBid]     = useState('')
  const [bidding, setBidding]         = useState(false)
  const [lastAction, setLastAction]   = useState(null)
  const [actionKey, setActionKey]     = useState(0)
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmSkip, setConfirmSkip]   = useState(false)
  const [flash, setFlash]             = useState(null)   // { type:'sold'|'skip', ... }
  const [prevStar, setPrevStar]       = useState(null)
  const prevSoldCountRef              = useRef(0)
  const [ripples, triggerRipple]      = useRipple()
  const inputRef                      = useRef(null)

  const gs         = gameState
  const purse      = gs?.purses?.[player] ?? STARTING_PURSE
  const currentBid = gs?.current_bid ?? 0
  const leader     = gs?.current_leader
  const isLeader   = leader === player
  const isAdmin    = player === ADMIN_PLAYER
  const bidHistory = gs?.bid_history ?? []
  const sold       = gs?.sold_log ?? []
  const total      = gs?.roster?.length ?? 0
  const doneIdx    = gs?.roster_index ?? 0
  const tier       = gs ? getTier(gs.current_ovr) : { label: 'B' }
  const nextBid    = currentBid + BID_INCREMENT
  const canAfford  = purse >= nextBid
  const progressPct = total > 0 ? ((doneIdx + 1) / total) * 100 : 0

  const tierStyle = { S: { from:'#fbbf24', to:'#f59e0b', label:'S-TIER' }, A: { from:'#c0c0c0', to:'#94a3b8', label:'A-TIER' }, B: { from:'#cd7f32', to:'#92400e', label:'B-TIER' } }[tier.label] || { from:'#cd7f32', to:'#92400e', label:'B-TIER' }

  const starAnimStyle = useStarColorAnim(gs?.current_superstar || '')

  // Analytics per player
  const analytics = useMemo(() => PLAYERS.map(p => {
    const bought    = sold.filter(s => s.winner === p)
    const spent     = bought.reduce((a, s) => a + s.price, 0)
    const remaining = gs?.purses?.[p] ?? STARTING_PURSE
    const avgPrice  = bought.length > 0 ? Math.round(spent / bought.length) : 2500
    const estMore   = remaining > 0 ? Math.floor(remaining / Math.max(avgPrice, 500)) : 0
    return { name: p, bought, spent, remaining, avgPrice, estMore }
  }), [sold, gs?.purses])

  // Sold/skip flash — differentiate by whether sold count increased
  useEffect(() => {
    if (!gs) return
    if (prevStar && prevStar !== gs.current_superstar) {
      const newCount = sold.length
      if (newCount > prevSoldCountRef.current) {
        setFlash({ type: 'sold', ...sold[sold.length - 1] })
      } else {
        setFlash({ type: 'skip', superstar: prevStar })
      }
      prevSoldCountRef.current = newCount
      setTimeout(() => setFlash(null), 2400)
    }
    setPrevStar(gs.current_superstar)
  }, [gs?.current_superstar])

  // Realtime
  useEffect(() => {
    const ch = supabase.channel('auction_live')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'auction_state' }, () => {
        onRefresh(); setBidding(false)
      }).subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  function triggerAction(action) {
    setLastAction(action); setActionKey(k => k + 1)
    setTimeout(() => setLastAction(null), 1300)
  }

  const placeBid = useCallback(async (amount, e) => {
    if (bidding || purse < amount) return
    if (e) triggerRipple(e.clientX, e.clientY, '#8b5cf6')
    setBidding(true); triggerAction('bid')
    await supabase.from('auction_state').update({
      current_bid: amount, current_leader: player,
      bid_history: [...bidHistory, { bidder: leader, bid: currentBid }],
    }).eq('id', 1)
    setBidding(false)
  }, [bidding, purse, player, leader, currentBid, bidHistory])

  async function undoBid(e) {
    if (bidding || !isLeader || bidHistory.length === 0) return
    if (e) triggerRipple(e.clientX, e.clientY, '#fb7185')
    setBidding(true); triggerAction('unbid')
    const newHist = [...bidHistory]; const prev = newHist.pop()
    await supabase.from('auction_state').update({
      current_bid: prev?.bid ?? getBaseBid(gs.current_ovr),
      current_leader: prev?.bidder ?? null, bid_history: newHist,
    }).eq('id', 1)
    setBidding(false)
  }

  async function sellSuperstar(e) {
    if (!isAdmin || !leader) return
    if (e) triggerRipple(e.clientX, e.clientY, '#34d399')
    triggerAction('sold')
    const newLog    = [...sold, { superstar: gs.current_superstar, ovr: gs.current_ovr, winner: leader, price: currentBid }]
    const newPurses = { ...gs.purses }; newPurses[leader] = (newPurses[leader] ?? 0) - currentBid
    const nextIdx   = doneIdx + 1
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
    triggerAction('skip'); setConfirmSkip(false)
    const nextIdx = doneIdx + 1
    if (nextIdx >= total) { await supabase.from('auction_state').update({ phase: 'results' }).eq('id', 1); return }
    const next = gs.roster[nextIdx]
    await supabase.from('auction_state').update({
      roster_index: nextIdx, current_superstar: next[0], current_ovr: next[1],
      current_bid: getBaseBid(next[1]), current_leader: null, bid_history: [],
    }).eq('id', 1)
  }

  function handleCustomBid(e) {
    const val = parseInt(customBid, 10)
    if (isNaN(val) || val <= currentBid || val > purse) return
    placeBid(val, e); setCustomBid('')
  }

  if (!gs) return null

  const actionLabel = { bid:'✓ Bid placed', unbid:'↩ Bid removed', sold:'🔨 Sold!', skip:'→ Skipped' }

  return (
    <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', fontFamily: 'Outfit, sans-serif' }}>
      <style>{`
        @keyframes starIn     { 0%{opacity:0;transform:translateY(22px)} 100%{opacity:1;transform:translateY(0)} }
        @keyframes actionPop  { 0%{opacity:0;transform:translateY(5px)} 15%{opacity:1;transform:translateY(0)} 80%{opacity:1} 100%{opacity:0} }
        @keyframes rippleOut  { 0%{transform:translate(-50%,-50%) scale(0);opacity:0.8} 100%{transform:translate(-50%,-50%) scale(10);opacity:0} }
        @keyframes shimmer    { 0%{background-position:200% center} 100%{background-position:-200% center} }
        @keyframes flashIn    { 0%{opacity:0;transform:scale(0.85) translateY(10px)} 12%{opacity:1;transform:scale(1.02) translateY(0)} 18%{transform:scale(1)} 80%{opacity:1} 100%{opacity:0;transform:scale(1.03)} }
        @keyframes leaderPulse{ 0%,100%{box-shadow:0 0 0 1px rgba(15,23,42,0.06) inset} 50%{box-shadow:0 0 0 1px rgba(15,23,42,0.1) inset, 0 0 20px rgba(139,92,246,0.2)} }
        @keyframes glowPulse  { 0%,100%{opacity:0.4} 50%{opacity:0.85} }
        @keyframes pulseGradient { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }

        .pitch-black-pulse {
          background: linear-gradient(90deg, #020617 0%, #2e1065 50%, #020617 100%);
          background-size: 200% 200%;
          animation: pulseGradient 6s ease infinite;
          background-attachment: fixed;
        }

        .bid-btn:hover:not(:disabled) { transform: translateY(-2px) !important; filter: brightness(1.18); }
        .bid-btn:active:not(:disabled){ transform: translateY(1px) scale(0.97) !important; }
        .bid-btn:disabled { opacity: 0.25 !important; cursor: not-allowed !important; }

        .auction-layout {
          display: grid;
          display: block;
          padding-right: 310px;
          min-height: calc(100vh - 72px);
        }
        .sidebar {
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          overflow-y: auto;
          position: fixed;
          top: 0;
          right: 0;
          width: 310px;
          height: 100vh;
          max-height: 100vh;
          z-index: 150;
          box-shadow: -8px 0 40px rgba(0,0,0,0.15);
          border-left: 1px solid rgba(255,255,255,0.05);
        }
        @media (max-width: 820px) {
          .auction-layout { grid-template-columns: 1fr; }
          .sidebar { position:static; max-height:none; box-shadow: 0 -1px 0 rgba(0,0,0,0.05); border-left:none; border-top:1px solid rgba(15,23,42,0.6); }
        }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.25); border-radius: 2px; }
        .bid-input:focus { box-shadow: inset 0 0 0 1px rgba(30,41,59,0.4) !important; outline: none; }
      `}</style>

      {/* Ripples */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 200, overflow: 'hidden' }}>
        {ripples.map(rp => (
          <div key={rp.id} style={{ position:'absolute', left:rp.x, top:rp.y, width:80, height:80, borderRadius:'50%', background:`radial-gradient(circle,${rp.color}55 0%,transparent 70%)`, animation:'rippleOut 0.8s ease-out forwards', pointerEvents:'none' }} />
        ))}
      </div>

      {/* Flash overlay — SOLD or SKIPPED */}
      {flash && (
        <div style={{ position:'fixed', inset:0, zIndex:150, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'rgba(15,23,42,0.7)', animation:'flashIn 2.4s ease forwards', pointerEvents:'none', backdropFilter:'blur(20px)' }}>
          {flash.type === 'sold' ? (
            <>
              <div style={{ fontSize:'0.7rem', letterSpacing:'0.5em', color:'rgba(30,41,59,0.5)', marginBottom:'0.6rem', textTransform:'uppercase' }}>Sold to</div>
              <div style={{ fontFamily:'Bebas Neue', fontSize:'clamp(4rem,15vw,8rem)', letterSpacing:'0.04em', lineHeight:1, color:pc(flash.winner), textShadow:`0 0 80px rgba(${hexToRgb(pc(flash.winner))},0.6),0 0 160px rgba(${hexToRgb(pc(flash.winner))},0.3)` }}>
                {pFirst(flash.winner)}
              </div>
              <div style={{ marginTop:'0.6rem', fontFamily:'Bebas Neue', fontSize:'2.5rem', background:'linear-gradient(135deg,#a78bfa,#ec4899)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', letterSpacing:'0.08em' }}>
                ₹{flash.price.toLocaleString()}
              </div>
              <div style={{ marginTop:'0.35rem', fontSize:'0.9rem', color:'rgba(30,41,59,0.45)', letterSpacing:'0.2em' }}>{flash.superstar}</div>
            </>
          ) : (
            <>
              <div style={{ fontFamily:'Bebas Neue', fontSize:'clamp(3rem,12vw,6rem)', letterSpacing:'0.08em', color:'rgba(30,41,59,0.5)', lineHeight:1 }}>SKIPPED</div>
              <div style={{ marginTop:'0.5rem', fontSize:'1rem', color:'rgba(15,23,42,0.85)', letterSpacing:'0.2em' }}>{flash.superstar}</div>
            </>
          )}
        </div>
      )}

      {/* ── TOP BAR ── */}
      <div className="pitch-black-pulse" style={{ position:'sticky', top:0, zIndex:100, height:72, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 2rem', width:'calc(100% - 310px)', boxShadow:'0 1px 0 rgba(0,0,0,0.03), 0 4px 32px rgba(0,0,0,0.05)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'1.25rem' }}>
          <div style={{ fontFamily:'Bebas Neue', fontSize:'1.75rem', letterSpacing:'0.08em', background:'linear-gradient(135deg,#a78bfa,#ec4899)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>WWE 2K25</div>
          <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
            <div style={{ fontSize:'0.7rem', color:'rgba(255,255,255,0.45)', letterSpacing:'0.2em' }}>{doneIdx + 1} / {total} SUPERSTARS</div>
            <div style={{ height:3, width:100, background:'rgba(139,92,246,0.15)', borderRadius:2, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${progressPct}%`, background:'linear-gradient(90deg,#7c3aed,#ec4899)', borderRadius:2, transition:'width 0.5s ease' }} />
            </div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'2rem' }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:'0.6rem', color:'rgba(255,255,255,0.35)', letterSpacing:'0.25em', marginBottom:2 }}>PLAYING AS</div>
            <div style={{ fontFamily:'Bebas Neue', fontSize:'1.15rem', color:pc(player), letterSpacing:'0.08em', textShadow:`0 0 16px rgba(${hexToRgb(pc(player))},0.55)` }}>{pFirst(player)}</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:'0.6rem', color:'rgba(255,255,255,0.35)', letterSpacing:'0.25em', marginBottom:2 }}>PURSE</div>
            <div style={{ fontFamily:'Bebas Neue', fontSize:'1.15rem', color:'#fbbf24', letterSpacing:'0.05em', textShadow:'0 0 14px rgba(251,191,36,0.4)' }}>₹{purse.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* ── MAIN GRID ── */}
      <div className="auction-layout">

        {/* ── LEFT: Bidding ── */}
        <div style={{ display:'flex', flexDirection:'column', padding:'0 2rem', maxWidth:580, margin:'0 auto', width:'100%' }}>

          {/* Superstar hero */}
          <div key={gs.current_superstar} style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'2.5rem 0 2rem', textAlign:'center' }}>
            {/* Tier badge */}
            <div style={{ display:'inline-flex', alignItems:'center', gap:'0.4rem', padding:'0.3rem 1rem', background:`linear-gradient(135deg,${tierStyle.from}33,${tierStyle.to}22)`, boxShadow:`inset 0 0 0 1px ${tierStyle.from}44`, borderRadius:20, marginBottom:'1.1rem', animation:'starIn 0.4s ease' }}>
              <span style={{ fontFamily:'Bebas Neue', fontSize:'1rem', color:tierStyle.from, letterSpacing:'0.1em' }}>{tierStyle.label}</span>
              <span style={{ fontSize:'0.7rem', color:`${tierStyle.from}99`, letterSpacing:'0.2em' }}>· OVR {gs.current_ovr}</span>
            </div>

            {/* Name */}
            <div style={{ position:'relative', display:'inline-block' }}>
              <div style={{ position:'absolute', inset:'-35px -20px', background:'radial-gradient(ellipse, rgba(139,92,246,0.12) 0%, transparent 70%)', pointerEvents:'none', animation:'glowPulse 3s ease-in-out infinite', borderRadius:'50%' }} />
              <div style={{ fontFamily:'Bebas Neue', fontSize:'clamp(2.6rem,8.5vw,5.2rem)', letterSpacing:'0.02em', lineHeight:0.9, animation:'starIn 0.35s ease', position:'relative', textAlign:'center', ...starAnimStyle }}>
                {gs.current_superstar}
              </div>
            </div>

            <div style={{ fontSize:'0.7rem', color:'rgba(15,23,42,0.85)', letterSpacing:'0.25em', marginTop:'0.8rem', animation:'starIn 0.5s ease' }}>
              BASE ₹{getBaseBid(gs.current_ovr).toLocaleString()}
            </div>
          </div>

          {/* Current bid */}
          <div style={{ textAlign:'center', marginBottom:'1.5rem' }}>
            <div style={{ fontSize:'0.65rem', letterSpacing:'0.4em', color:'rgba(15,23,42,0.85)', fontWeight:600, marginBottom:'0.3rem' }}>CURRENT BID</div>
            <div style={{ fontFamily:'Bebas Neue', fontSize:'clamp(2.2rem,7vw,3.8rem)', letterSpacing:'0.05em', lineHeight:1, background:'linear-gradient(135deg,#a78bfa 0%,#ec4899 50%,#fbbf24 100%)', backgroundSize:'200% auto', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', animation:'shimmer 5s linear infinite' }}>
              ₹<NumberTicker value={currentBid} />
            </div>
            <div style={{ marginTop:'0.5rem' }}>
              {leader ? (
                <div style={{ display:'inline-flex', alignItems:'center', gap:'0.4rem', padding:'0.25rem 0.9rem', background:`rgba(${hexToRgb(pc(leader))},0.1)`, boxShadow:`inset 0 0 0 1px rgba(${hexToRgb(pc(leader))},0.28)`, borderRadius:20 }}>
                  <div style={{ width:7, height:7, borderRadius:'50%', background:pc(leader), boxShadow:`0 0 10px rgba(${hexToRgb(pc(leader))},0.8)` }} />
                  <span style={{ fontSize:'0.85rem', color:pc(leader), letterSpacing:'0.1em', fontWeight:700 }}>
                    {isLeader ? 'YOU ARE WINNING' : `${pFirst(leader)} is leading`}
                  </span>
                </div>
              ) : (
                <div style={{ display:'inline-block', padding:'0.4rem 1.2rem', background:'rgba(15,23,42,0.06)', borderRadius:20, fontSize:'0.85rem', color:'rgba(15,23,42,0.7)', letterSpacing:'0.15em', fontWeight:600 }}>No bids yet — be first!</div>
              )}
            </div>
          </div>

          {/* Action feedback */}
          <div style={{ height:'1.5rem', marginBottom:'0.7rem', position:'relative', textAlign:'center' }}>
            {lastAction && (
              <div key={actionKey} style={{ position:'absolute', inset:0, fontSize:'0.9rem', letterSpacing:'0.2em', animation:'actionPop 1.3s ease forwards', color: lastAction==='unbid'?'#fb7185':lastAction==='sold'?'#34d399':'#a78bfa' }}>
                {actionLabel[lastAction]}
              </div>
            )}
          </div>

          {/* ── BID CONTROLS ── */}
          <div className="glass-container" style={{ display:'flex', flexDirection:'column', gap:'0.6rem', marginBottom:'1rem' }}>

            {/* Quick raise */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'0.5rem' }}>
              {[BID_INCREMENT, 1000, 2000].map(inc => {
                const amt = nextBid + inc - BID_INCREMENT
                const ok  = !bidding && !isLeader && purse >= amt
                return (
                  <div key={inc} className="glow-wrap glow-wrap-full">
                    <div className="glow-layer" style={{ opacity: ok ? 0.35 : 0 }} />
                    <button className="glow-inner bid-btn" disabled={!ok} onClick={e => placeBid(amt, e)}
                      style={{ padding:'0.85rem 0.4rem', borderRadius:12, fontFamily:'Bebas Neue', fontSize:'1.05rem', width:'100%' }}>
                      +₹{inc >= 1000 ? `${inc/1000}k` : inc}
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Primary bid / leading */}
            {isLeader ? (
              <div style={{ padding:'1.1rem', background:`rgba(${hexToRgb(pc(player))},0.07)`, boxShadow:`inset 0 0 0 1px rgba(${hexToRgb(pc(player))},0.22)`, borderRadius:14, textAlign:'center', animation:'leaderPulse 2.5s ease-in-out infinite' }}>
                <div style={{ fontSize:'0.65rem', letterSpacing:'0.3em', color:`rgba(${hexToRgb(pc(player))},0.6)`, marginBottom:'0.2rem' }}>CURRENT LEADER</div>
                <div style={{ fontFamily:'Bebas Neue', fontSize:'1.2rem', letterSpacing:'0.1em', color:pc(player) }}>You're winning — hold tight!</div>
              </div>
            ) : (
              <div className="glow-wrap glow-wrap-full">
                <div className="glow-layer" />
                <button className="glow-inner bid-btn" disabled={bidding || !canAfford} onClick={e => placeBid(nextBid, e)}
                  style={{ padding:'1.05rem', borderRadius:14, fontFamily:'Bebas Neue', fontSize:'1.4rem', letterSpacing:'0.15em', width:'100%' }}>
                  BID ₹{nextBid.toLocaleString()}
                </button>
              </div>
            )}

            {/* Custom amount */}
            <div style={{ display:'flex', gap:'0.5rem' }}>
              <input ref={inputRef} className="bid-input" type="number" value={customBid}
                onChange={e => setCustomBid(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCustomBid(e)}
                placeholder={`Custom (min ₹${nextBid.toLocaleString()})`}
                style={{ flex:1, padding:'0.75rem 1rem', background:'rgba(139,92,246,0.08)', boxShadow:'inset 0 0 0 1px rgba(139,92,246,0.18)', borderRadius:12, border:'none', color:'#e2e8f0', fontFamily:'Outfit', fontSize:'0.95rem', letterSpacing:'0.05em', transition:'box-shadow 0.2s' }} />
              <div className="glow-wrap">
                <div className="glow-layer" style={{ borderRadius:12 }} />
                <button className="glow-inner bid-btn" onClick={handleCustomBid}
                  disabled={!customBid || parseInt(customBid) <= currentBid || parseInt(customBid) > purse}
                  style={{ padding:'0.75rem 1.1rem', borderRadius:12, fontSize:'0.9rem' }}>
                  Place
                </button>
              </div>
            </div>

            {/* Un-bid */}
            {isLeader && bidHistory.length > 0 && (
              <button className="bid-btn" onClick={e => undoBid(e)} disabled={bidding}
                style={{ ...btnDanger, padding:'0.65rem', borderRadius:12, fontSize:'0.85rem', letterSpacing:'0.1em' }}>
                ↩ Remove my last bid
              </button>
            )}
          </div>

          {/* Admin controls */}
          {isAdmin && (
            <div style={{ display:'flex', gap:'0.6rem', marginBottom:'1.25rem' }}>
              <div className="glow-wrap" style={{ flex:1 }}>
                <div className="glow-layer" style={{ background:'linear-gradient(90deg,#10b981,#34d399,#6ee7b7)', opacity: leader ? 0.55 : 0.15 }} />
                <button className="glow-inner bid-btn" onClick={e => sellSuperstar(e)} disabled={!leader || bidding}
                  style={{ padding:'0.95rem', borderRadius:14, fontFamily:'Bebas Neue', fontSize:'1.15rem', letterSpacing:'0.15em', width:'100%' }}>
                  🔨 Sold — {leader ? pFirst(leader) : 'no bids'}
                </button>
              </div>
              {!confirmSkip ? (
                <button className="bid-btn" onClick={() => setConfirmSkip(true)}
                  style={{ ...btnGhost, padding:'0.95rem 1.1rem', borderRadius:14, fontSize:'0.85rem', letterSpacing:'0.1em', whiteSpace:'nowrap' }}>
                  Skip
                </button>
              ) : (
                <div style={{ display:'flex', gap:'0.4rem' }}>
                  <button className="bid-btn" onClick={skipSuperstar}
                    style={{ ...btnDanger, padding:'0.8rem', borderRadius:12, fontSize:'0.8rem', whiteSpace:'nowrap' }}>
                    Confirm
                  </button>
                  <button className="bid-btn" onClick={() => setConfirmSkip(false)}
                    style={{ ...btnGhost, padding:'0.8rem', borderRadius:12, fontSize:'0.8rem' }}>
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Subtle reset */}
          {isAdmin && (
            <div style={{ textAlign:'center', paddingBottom:'2.5rem', marginTop:'auto' }}>
              {!confirmReset ? (
                  <button onClick={() => setConfirmReset(true)}
                  style={{ background:'none', border:'none', fontSize:'0.65rem', letterSpacing:'0.25em', color:'rgba(15,23,42,0.4)', cursor:'pointer', textTransform:'uppercase', fontFamily:'Outfit' }}>
                  Reset entire auction
                </button>
              ) : (
                <div style={{ display:'flex', gap:'0.75rem', justifyContent:'center', alignItems:'center' }}>
                  <span style={{ fontSize:'0.75rem', color:'rgba(30,41,59,0.4)', letterSpacing:'0.1em' }}>Wipes everything.</span>
                  <button onClick={onReset} style={{ ...btnDanger, padding:'0.35rem 0.9rem', borderRadius:8, fontSize:'0.75rem', letterSpacing:'0.15em', fontFamily:'Outfit' }}>Yes, reset</button>
                  <button onClick={() => setConfirmReset(false)} style={{ background:'none', border:'none', fontSize:'0.75rem', color:'rgba(30,41,59,0.25)', cursor:'pointer', fontFamily:'Outfit' }}>Cancel</button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT: Sidebar ── */}
        <div className="sidebar pitch-black-pulse" style={{ padding:'calc(72px + 1.5rem) 1.1rem 1.5rem 1.1rem', position:'relative' }}>

          {/* Arc glow bulge on left edge */}
          <div style={{ position:'absolute', left:-50, top:'25%', bottom:'25%', width:100, background:'radial-gradient(ellipse, rgba(139,92,246,0.18) 0%, transparent 70%)', filter:'blur(18px)', pointerEvents:'none' }} />

          <SidebarDivider label="Live Analytics" />

          <div style={{ display:'flex', flexDirection:'column', gap:'0.7rem', marginBottom:'1.75rem' }}>
            {analytics.map(a => {
              const col   = pc(a.name)
              const rgb   = hexToRgb(col)
              const isMe  = a.name === player
              const isWin = a.name === leader
              const pct   = Math.max(0, Math.min(100, (a.remaining / STARTING_PURSE) * 100))
              return (
                <div key={a.name}
                  style={{ padding:'0.85rem', background: isWin ? `rgba(${rgb},0.1)` : isMe ? `rgba(${rgb},0.06)` : 'rgba(255,255,255,0.03)', boxShadow: isWin ? `inset 0 0 0 1px rgba(${rgb},0.35), 0 0 20px rgba(${rgb},0.1)` : isMe ? `inset 0 0 0 1px rgba(${rgb},0.18)` : 'inset 0 0 0 1px rgba(255,255,255,0.08)', borderRadius:14, transition:'all 0.3s' }}>

                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.55rem' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'0.45rem' }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', background:col, boxShadow:`0 0 8px rgba(${rgb},0.8)` }} />
                      <span style={{ fontFamily:'Bebas Neue', fontSize:'1.05rem', color:col, letterSpacing:'0.08em' }}>{pFirst(a.name)}</span>
                      {isMe && <span style={{ fontSize:'0.52rem', color:`rgba(${rgb},0.6)`, background:`rgba(${rgb},0.12)`, padding:'1px 5px', borderRadius:6, letterSpacing:'0.1em' }}>YOU</span>}
                    </div>
                    {isWin && <span style={{ fontSize:'0.58rem', color:col, padding:'0.1rem 0.5rem', background:`rgba(${rgb},0.15)`, boxShadow:`inset 0 0 0 1px rgba(${rgb},0.3)`, borderRadius:10, letterSpacing:'0.1em' }}>LEADING</span>}
                  </div>

                  {/* Purse bar */}
                  <div style={{ marginBottom:'0.55rem' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                      <span style={{ fontSize:'0.58rem', color:'rgba(255,255,255,0.4)', letterSpacing:'0.1em' }}>PURSE</span>
                      <span style={{ fontFamily:'Bebas Neue', fontSize:'0.78rem', color:col }}>₹{a.remaining.toLocaleString()}</span>
                    </div>
                    <div style={{ height:5, background:'rgba(255,255,255,0.08)', borderRadius:3, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${pct}%`, background:`linear-gradient(90deg,${col},rgba(${rgb},0.55))`, borderRadius:3, transition:'width 0.6s ease', boxShadow:`0 0 8px rgba(${rgb},0.4)` }} />
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'0.3rem', marginBottom: a.bought.length>0 ? '0.5rem' : 0 }}>
                    {[
                      { val: a.bought.length, label:'Bought' },
                      { val: `~${a.estMore}`, label:'Est. More' },
                      { val: a.bought.length>0 ? `₹${a.avgPrice>=1000?`${(a.avgPrice/1000).toFixed(1)}k`:a.avgPrice}` : '—', label:'Avg/Star' },
                    ].map(({ val, label }) => (
                      <div key={label} style={{ textAlign:'center', padding:'0.3rem 0.2rem', background:'rgba(0,0,0,0.2)', borderRadius:8 }}>
                        <div style={{ fontFamily:'Bebas Neue', fontSize:'1rem', color:col }}>{val}</div>
                        <div style={{ fontSize:'0.48rem', color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.1em' }}>{label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Last 2 superstars */}
                  {a.bought.length > 0 && (
                    <div style={{ display:'flex', flexDirection:'column', gap:'0.18rem' }}>
                      {a.bought.slice(-2).reverse().map((s, i) => (
                        <div key={i} style={{ display:'flex', alignItems:'center', gap:'0.3rem', padding:'0.22rem 0.45rem', background:'rgba(0,0,0,0.2)', borderRadius:6 }}>
                          <span style={{ flex:1, fontSize:'0.67rem', color:'rgba(255,255,255,0.65)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.superstar}</span>
                          <span style={{ fontFamily:'Bebas Neue', fontSize:'0.62rem', color:'rgba(255,255,255,0.45)', whiteSpace:'nowrap' }}>₹{s.price>=1000?`${(s.price/1000).toFixed(1)}k`:s.price}</span>
                        </div>
                      ))}
                      {a.bought.length > 2 && <div style={{ fontSize:'0.52rem', color:'rgba(255,255,255,0.3)', textAlign:'center', letterSpacing:'0.1em' }}>+{a.bought.length-2} more</div>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Sold log */}
          <SidebarDivider label={`Sold (${sold.length})`} />
          <div style={{ display:'flex', flexDirection:'column', gap:'0.2rem', paddingBottom:'1.5rem' }}>
            {sold.length === 0 ? (
              <div style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.2)', textAlign:'center', padding:'0.75rem', letterSpacing:'0.1em' }}>No sales yet</div>
            ) : [...sold].reverse().slice(0, 12).map((s, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:'0.4rem', padding:'0.38rem 0.55rem', background:'rgba(0,0,0,0.2)', boxShadow:'inset 0 0 0 1px rgba(255,255,255,0.08)', borderRadius:8 }}>
                <div style={{ flex:1, fontSize:'0.72rem', color:'rgba(255,255,255,0.65)', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.superstar}</div>
                <div style={{ fontSize:'0.68rem', color:pc(s.winner), fontWeight:700, whiteSpace:'nowrap' }}>{pFirst(s.winner)}</div>
                <div style={{ fontFamily:'Bebas Neue', fontSize:'0.7rem', color:'rgba(255,255,255,0.45)', whiteSpace:'nowrap' }}>₹{s.price>=1000?`${(s.price/1000).toFixed(1)}k`:s.price}</div>
              </div>
            ))}
            {sold.length > 12 && <div style={{ fontSize:'0.6rem', color:'rgba(255,255,255,0.3)', textAlign:'center', padding:'0.3rem', letterSpacing:'0.1em' }}>+{sold.length-12} more</div>}
          </div>
        </div>
      </div>
    </div>
  )
}

function SidebarDivider({ label }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'1rem', fontFamily:'Outfit', fontSize:'0.58rem', letterSpacing:'0.38em', color:'rgba(255,255,255,0.4)', textTransform:'uppercase' }}>
      <div style={{ flex:1, height:1, background:'rgba(139,92,246,0.15)' }} />
      {label}
      <div style={{ flex:1, height:1, background:'rgba(139,92,246,0.15)' }} />
    </div>
  )
}


function NumberTicker({ value }) {
  const [displayVal, setDisplayVal] = React.useState(value)
  
  React.useEffect(() => {
    let startTimestamp = null
    const startVal = displayVal
    const endVal = value
    const duration = 350
    
    if (startVal === endVal) return;
    
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp
      const progress = Math.min((timestamp - startTimestamp) / duration, 1)
      const easeOut = 1 - Math.pow(1 - progress, 3) 
      setDisplayVal(Math.floor(startVal + (endVal - startVal) * easeOut))
      if (progress < 1) {
        window.requestAnimationFrame(step)
      } else {
        setDisplayVal(endVal)
      }
    }
    window.requestAnimationFrame(step)
  }, [value])
  
  return <>{displayVal.toLocaleString()}</>
}
