import React, { useState, useEffect } from 'react'
import { supabase, PLAYERS } from './lib/supabase.js'
import Lobby from './components/Lobby.jsx'
import Auction from './components/Auction.jsx'
import Results from './components/Results.jsx'

// ── Sparkle dots ─────────────────────────────────────────────────────────────
const SPARKS = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  x: (i * 13.7 + 7) % 100,
  y: (i * 19.3 + 11) % 100,
  size: (i % 3) + 1,
  delay: ((i * 0.37) % 4).toFixed(2),
  dur: (1.6 + (i % 6) * 0.35).toFixed(1),
  color: ['#a78bfa', '#e879f9', '#c4b5fd', '#818cf8', 'rgba(255,255,255,0.7)'][i % 5],
}))

// ── Liquid background — white bloom + vivid purple clouds + dark bottom ───────
function LiquidBackground() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');

        /* ── Blob animations ── */
        @keyframes blob1 {
          0%,100% { transform: translate(0,0) scale(1); }
          25%      { transform: translate(3%,7%) scale(1.07); }
          50%      { transform: translate(-2%,10%) scale(0.95); }
          75%      { transform: translate(5%,3%) scale(1.04); }
        }
        @keyframes blob2 {
          0%,100% { transform: translate(0,0) scale(1); }
          33%     { transform: translate(-4%,-6%) scale(1.09); }
          66%     { transform: translate(3%,-9%) scale(0.93); }
        }
        @keyframes blob3 {
          0%,100% { transform: translate(0,0) scale(1); }
          50%     { transform: translate(-4%,7%) scale(1.11); }
        }
        @keyframes blob4 {
          0%,100% { transform: translate(0,0) scale(1) rotate(0deg); }
          30%     { transform: translate(6%,3%) scale(1.05) rotate(3deg); }
          70%     { transform: translate(-3%,2%) scale(0.97) rotate(-2deg); }
        }
        @keyframes arcGlow  { 0%,100%{opacity:0.3} 50%{opacity:0.65} }
        @keyframes sparkle  { 0%,100%{opacity:0;transform:scale(0.3)} 50%{opacity:0.9;transform:scale(1)} }

        /* ── Global Glow Button ── */
        .glow-wrap {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .glow-wrap-full { width: 100%; }
        .glow-wrap-full .glow-inner { width: 100%; }

        .glow-layer {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, #6366f1, #ec4899, #fbbf24);
          border-radius: 10px;
          filter: blur(8px);
          opacity: 0.4;
          transition: opacity 0.3s ease, filter 0.3s ease;
          pointer-events: none;
        }
        .glow-wrap:hover .glow-layer { opacity: 0.75; filter: blur(12px); }

        .glow-inner {
          position: relative;
          background: #0d0920;
          color: #fff;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          font-family: 'Outfit', sans-serif;
          font-weight: 600;
          letter-spacing: 0.03em;
          cursor: pointer;
          transition: background 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease;
        }
        .glow-inner:hover:not(:disabled) {
          background: #1a1035;
          transform: translateY(-1px);
        }
        .glow-inner:active:not(:disabled) { transform: translateY(1px) scale(0.98); }
        .glow-inner:disabled { opacity: 0.4; cursor: not-allowed; }

        /* ── Global font override ── */
        body { font-family: 'Outfit', sans-serif; }

        /* ── Scrollbar ── */
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.3); border-radius: 2px; }

        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>

        {/* Deep dark base — near-black with purple undertone */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 40% 30%, #180038 0%, #06001a 50%, #020008 100%)' }} />

        {/* ★ White bloom at top — the key element from the reference */}
        <div style={{ position: 'absolute', top: '-35%', left: '-15%', width: '130%', height: '70%', background: 'radial-gradient(ellipse at 50% 10%, rgba(255,255,255,0.22) 0%, rgba(210,185,255,0.09) 38%, transparent 65%)', filter: 'blur(50px)', animation: 'blob3 16s ease-in-out infinite' }} />

        {/* Main vivid purple/indigo cloud — right side, matches reference */}
        <div style={{ position: 'absolute', top: '5%', right: '-18%', width: '72%', height: '72%', background: 'radial-gradient(ellipse, rgba(55,25,190,0.8) 0%, rgba(70,15,160,0.55) 35%, transparent 65%)', filter: 'blur(55px)', animation: 'blob1 10s ease-in-out infinite' }} />

        {/* Luminous inner white glow within the purple zone */}
        <div style={{ position: 'absolute', top: '18%', right: '12%', width: '42%', height: '48%', background: 'radial-gradient(ellipse, rgba(255,255,255,0.14) 0%, rgba(190,160,255,0.06) 45%, transparent 70%)', filter: 'blur(35px)', animation: 'blob2 14s ease-in-out infinite reverse' }} />

        {/* Left purple cloud */}
        <div style={{ position: 'absolute', top: '10%', left: '-22%', width: '58%', height: '65%', background: 'radial-gradient(ellipse, rgba(75,25,200,0.55) 0%, transparent 65%)', filter: 'blur(70px)', animation: 'blob4 18s ease-in-out infinite' }} />

        {/* Centre deep indigo */}
        <div style={{ position: 'absolute', top: '32%', left: '18%', width: '48%', height: '48%', background: 'radial-gradient(ellipse, rgba(45,15,120,0.45) 0%, transparent 65%)', filter: 'blur(65px)', animation: 'blob3 20s ease-in-out infinite reverse' }} />

        {/* Dark gradient covering the bottom half — gives the deep navy look */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%', background: 'linear-gradient(180deg, transparent 0%, rgba(2,0,10,0.75) 55%, rgba(2,0,10,0.97) 100%)' }} />

        {/* Arc glow column divider */}
        <div style={{ position: 'absolute', left: '52%', top: 0, bottom: 0, width: 2, transform: 'translateX(-50%)', background: 'linear-gradient(180deg, transparent 0%, rgba(139,92,246,0) 8%, rgba(167,139,250,0.18) 28%, rgba(236,72,153,0.22) 50%, rgba(167,139,250,0.18) 72%, rgba(139,92,246,0) 92%, transparent 100%)', animation: 'arcGlow 7s ease-in-out infinite' }}>
          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 160, height: 340, background: 'radial-gradient(ellipse, rgba(139,92,246,0.15) 0%, transparent 70%)', filter: 'blur(28px)' }} />
        </div>

        {/* Edge vignette */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, transparent 30%, rgba(2,0,10,0.55) 100%)' }} />

        {/* Sparkles */}
        {SPARKS.map(s => (
          <div key={s.id} style={{ position: 'absolute', left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, borderRadius: '50%', background: s.color, animation: `sparkle ${s.dur}s ${s.delay}s ease-in-out infinite` }} />
        ))}
      </div>
    </>
  )
}

export default function App() {
  const [player, setPlayer] = useState(null)
  const [gameState, setGameState] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchGameState()
    const ch = supabase
      .channel('game_state')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'auction_state' }, () => fetchGameState())
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  async function fetchGameState() {
    const { data, error } = await supabase.from('auction_state').select('*').eq('id', 1).single()
    if (error || !data) { setGameState(null); setLoading(false); return }
    setGameState(data); setLoading(false)
  }

  useEffect(() => {
    const saved = localStorage.getItem('wwe_player')
    if (saved && PLAYERS.includes(saved)) setPlayer(saved)
  }, [])

  function handleSelectPlayer(name) { setPlayer(name); localStorage.setItem('wwe_player', name) }

  async function handleReset() {
    const { error } = await supabase.from('auction_state').upsert({
      id: 1, phase: 'lobby', roster: [], roster_index: 0,
      current_superstar: null, current_ovr: null, current_bid: 0,
      current_leader: null, bid_history: [], purses: {}, sold_log: [],
    })
    if (error) throw error
    setPlayer(null); localStorage.removeItem('wwe_player'); fetchGameState()
  }

  if (loading)      return <><LiquidBackground /><LoadingScreen /></>
  if (!gameState)   return <><LiquidBackground /><RecoveryScreen onReset={handleReset} /></>
  if (!player)      return <><LiquidBackground /><Lobby onSelect={handleSelectPlayer} gameState={gameState} onReset={handleReset} /></>
  if (gameState?.phase === 'results') return <><LiquidBackground /><Results gameState={gameState} player={player} onReset={handleReset} /></>
  return <><LiquidBackground /><Auction player={player} gameState={gameState} onRefresh={fetchGameState} onReset={handleReset} /></>
}

function LoadingScreen() {
  return (
    <div style={{ position: 'relative', zIndex: 1, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{`@keyframes shimmer{0%{background-position:200% center}100%{background-position:-200% center}}`}</style>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: '3.5rem', letterSpacing: '0.08em', background: 'linear-gradient(135deg,#a78bfa 0%,#ec4899 50%,#fbbf24 100%)', backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', animation: 'shimmer 3s linear infinite' }}>WWE 2K25</div>
        <div style={{ fontFamily: 'Outfit', fontSize: '0.85rem', color: 'rgba(167,139,250,0.45)', marginTop: '0.5rem', letterSpacing: '0.15em' }}>CONNECTING...</div>
      </div>
    </div>
  )
}

function RecoveryScreen({ onReset }) {
  const [working, setWorking] = useState(false)
  const [error, setError] = useState(null)
  async function go() {
    setWorking(true); setError(null)
    try { await onReset() } catch (e) { setError(e?.message || String(e)) }
    setWorking(false)
  }
  return (
    <div style={{ position: 'relative', zIndex: 1, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <style>{`@keyframes shimmer{0%{background-position:200% center}100%{background-position:-200% center}}`}</style>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: '3rem', letterSpacing: '0.08em', background: 'linear-gradient(135deg,#a78bfa,#ec4899,#fbbf24)', backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', animation: 'shimmer 4s linear infinite', marginBottom: '0.25rem' }}>WWE 2K25</div>
        <div style={{ fontFamily: 'Outfit', fontSize: '0.8rem', color: 'rgba(167,139,250,0.4)', letterSpacing: '0.25em', marginBottom: '2.5rem' }}>AUCTION HOUSE</div>
        <div style={{ fontFamily: 'Outfit', fontSize: '1rem', color: 'rgba(167,139,250,0.5)', marginBottom: '0.75rem', lineHeight: 1.7 }}>
          No auction data found.<br />The row may be missing from Supabase.
        </div>
        {error && (
          <div style={{ fontFamily: 'Outfit', fontSize: '0.85rem', color: '#fb7185', marginBottom: '1.25rem', wordBreak: 'break-all', lineHeight: 1.6, padding: '0.7rem 0.9rem', background: 'rgba(251,113,133,0.08)', boxShadow: 'inset 0 0 0 1px rgba(251,113,133,0.2)', borderRadius: 10 }}>
            Error: {error}
          </div>
        )}
        <div className="glow-wrap" onClick={!working ? go : undefined} style={{ cursor: working ? 'wait' : 'pointer' }}>
          <div className="glow-layer" />
          <button className="glow-inner" disabled={working} style={{ padding: '1rem 2.8rem', fontSize: '1.05rem', fontWeight: 700, letterSpacing: '0.05em' }}>
            {working ? 'Initialising...' : 'Initialise Auction Data'}
          </button>
        </div>
      </div>
    </div>
  )
}
