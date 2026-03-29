import React, { useState, useEffect } from 'react'
import { supabase, PLAYERS } from './lib/supabase.js'
import Lobby from './components/Lobby.jsx'
import Auction from './components/Auction.jsx'
import Results from './components/Results.jsx'

// ── Liquid aura background — shared across all screens ──────────────────────
const SPARKS = Array.from({ length: 35 }, (_, i) => ({
  id: i,
  x: (i * 13.7 + 7) % 100,
  y: (i * 19.3 + 11) % 100,
  size: (i % 3) + 1,
  delay: ((i * 0.37) % 4).toFixed(2),
  dur: (1.6 + (i % 6) * 0.35).toFixed(1),
  color: ['#a78bfa', '#e879f9', '#fbbf24', '#818cf8', 'rgba(255,255,255,0.6)'][i % 5],
}))

function LiquidBackground() {
  return (
    <>
      <style>{`
        @keyframes blob1 {
          0%,100% { transform: translate(0,0) scale(1); }
          25%  { transform: translate(4%,7%) scale(1.07); }
          50%  { transform: translate(-3%,11%) scale(0.95); }
          75%  { transform: translate(6%,3%) scale(1.04); }
        }
        @keyframes blob2 {
          0%,100% { transform: translate(0,0) scale(1); }
          33%  { transform: translate(-5%,-7%) scale(1.1); }
          66%  { transform: translate(4%,-10%) scale(0.93); }
        }
        @keyframes blob3 {
          0%,100% { transform: translate(0,0) scale(1); }
          50%  { transform: translate(-5%,9%) scale(1.13); }
        }
        @keyframes blob4 {
          0%,100% { transform: translate(0,0) scale(1) rotate(0deg); }
          30%  { transform: translate(7%,4%) scale(1.06) rotate(4deg); }
          70%  { transform: translate(-4%,2%) scale(0.97) rotate(-3deg); }
        }
        @keyframes arcGlow {
          0%,100% { opacity: 0.35; }
          50%      { opacity: 0.65; }
        }
        @keyframes sparkle {
          0%,100% { opacity: 0; transform: scale(0.3); }
          50%      { opacity: 0.85; transform: scale(1); }
        }
      `}</style>

      <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>

        {/* Deep dark base — almost black with a purple tinge */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 25% 40%, #0d0020 0%, #03000d 55%, #000005 100%)' }} />

        {/* Large purple blob — top-left, drives the main hue */}
        <div style={{ position: 'absolute', top: '-30%', left: '-20%', width: '70%', height: '75%', background: 'radial-gradient(ellipse, rgba(109,40,217,0.55) 0%, rgba(91,33,182,0.2) 45%, transparent 70%)', filter: 'blur(80px)', animation: 'blob1 10s ease-in-out infinite' }} />

        {/* Pink/magenta blob — bottom-right */}
        <div style={{ position: 'absolute', bottom: '-28%', right: '-22%', width: '68%', height: '68%', background: 'radial-gradient(ellipse, rgba(219,39,119,0.5) 0%, rgba(168,85,247,0.22) 42%, transparent 70%)', filter: 'blur(80px)', animation: 'blob2 13s ease-in-out infinite reverse' }} />

        {/* White luminance — top-right, creates the "light" half */}
        <div style={{ position: 'absolute', top: '-10%', right: '5%', width: '55%', height: '50%', background: 'radial-gradient(ellipse, rgba(255,255,255,0.09) 0%, rgba(220,180,255,0.04) 40%, transparent 70%)', filter: 'blur(55px)', animation: 'blob3 16s ease-in-out infinite' }} />

        {/* Deep indigo blob — centre */}
        <div style={{ position: 'absolute', top: '30%', left: '15%', width: '45%', height: '45%', background: 'radial-gradient(ellipse, rgba(76,29,149,0.38) 0%, transparent 65%)', filter: 'blur(65px)', animation: 'blob4 19s ease-in-out infinite' }} />

        {/* Soft white shimmer — bottom-left */}
        <div style={{ position: 'absolute', bottom: '-5%', left: '-8%', width: '40%', height: '38%', background: 'radial-gradient(ellipse, rgba(255,255,255,0.05) 0%, transparent 65%)', filter: 'blur(50px)', animation: 'blob1 22s ease-in-out infinite reverse' }} />

        {/* Arc glow divider beam — subtle vertical light column */}
        <div style={{ position: 'absolute', left: '52%', top: 0, bottom: 0, width: 2, transform: 'translateX(-50%)', background: 'linear-gradient(180deg, transparent 0%, rgba(139,92,246,0) 8%, rgba(167,139,250,0.22) 28%, rgba(236,72,153,0.28) 50%, rgba(167,139,250,0.22) 72%, rgba(139,92,246,0) 92%, transparent 100%)', animation: 'arcGlow 7s ease-in-out infinite' }}>
          {/* Arc bulge at midpoint */}
          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 140, height: 320, background: 'radial-gradient(ellipse, rgba(139,92,246,0.18) 0%, transparent 70%)', filter: 'blur(25px)' }} />
        </div>

        {/* Dark vignette edges */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, transparent 35%, rgba(0,0,8,0.65) 100%)' }} />

        {/* Sparkle dots */}
        {SPARKS.map(s => (
          <div key={s.id} style={{ position: 'absolute', left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, borderRadius: '50%', background: s.color, animation: `sparkle ${s.dur}s ${s.delay}s ease-in-out infinite` }} />
        ))}
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  const [player, setPlayer] = useState(null)
  const [gameState, setGameState] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchGameState()
    const channel = supabase
      .channel('game_state')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'auction_state' }, () => fetchGameState())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  async function fetchGameState() {
    const { data, error } = await supabase
      .from('auction_state').select('*').eq('id', 1).single()
    if (error || !data) { setGameState(null); setLoading(false); return }
    setGameState(data)
    setLoading(false)
  }

  useEffect(() => {
    const saved = localStorage.getItem('wwe_player')
    if (saved && PLAYERS.includes(saved)) setPlayer(saved)
  }, [])

  function handleSelectPlayer(name) {
    setPlayer(name)
    localStorage.setItem('wwe_player', name)
  }

  async function handleReset() {
    const { error } = await supabase.from('auction_state').upsert({
      id: 1, phase: 'lobby', roster: [], roster_index: 0,
      current_superstar: null, current_ovr: null, current_bid: 0,
      current_leader: null, bid_history: [], purses: {}, sold_log: [],
    })
    if (error) throw error
    setPlayer(null)
    localStorage.removeItem('wwe_player')
    fetchGameState()
  }

  if (loading) return <><LiquidBackground /><LoadingScreen /></>
  if (!gameState) return <><LiquidBackground /><RecoveryScreen onReset={handleReset} /></>
  if (!player) return <><LiquidBackground /><Lobby onSelect={handleSelectPlayer} gameState={gameState} onReset={handleReset} /></>
  if (gameState?.phase === 'results') return <><LiquidBackground /><Results gameState={gameState} player={player} onReset={handleReset} /></>
  return <><LiquidBackground /><Auction player={player} gameState={gameState} onRefresh={fetchGameState} onReset={handleReset} /></>
}

function LoadingScreen() {
  return (
    <div style={{ position: 'relative', zIndex: 1, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Barlow Condensed, sans-serif' }}>
      <style>{`@keyframes shimmer{0%{background-position:200% center}100%{background-position:-200% center}}`}</style>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: '3.5rem', letterSpacing: '0.08em', background: 'linear-gradient(135deg, #a78bfa 0%, #ec4899 50%, #fbbf24 100%)', backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', animation: 'shimmer 3s linear infinite' }}>
          WWE 2K25
        </div>
        <div style={{ fontSize: '0.8rem', color: 'rgba(167,139,250,0.4)', marginTop: '0.5rem', letterSpacing: '0.4em' }}>CONNECTING...</div>
      </div>
    </div>
  )
}

function RecoveryScreen({ onReset }) {
  const [working, setWorking] = useState(false)
  const [error, setError] = useState(null)

  async function go() {
    setWorking(true)
    setError(null)
    try { await onReset() } catch (e) { setError(e?.message || String(e)) }
    setWorking(false)
  }

  return (
    <div style={{ position: 'relative', zIndex: 1, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'Barlow Condensed, sans-serif' }}>
      <style>{`
        @keyframes shimmer{0%{background-position:200% center}100%{background-position:-200% center}}
        .init-btn { transition: all 0.2s; }
        .init-btn:not(:disabled):hover { transform: translateY(-2px); box-shadow: 0 10px 40px rgba(124,58,237,0.55) !important; }
        .init-btn:disabled { opacity: 0.45; cursor: not-allowed; }
      `}</style>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: '3rem', letterSpacing: '0.08em', background: 'linear-gradient(135deg, #a78bfa 0%, #ec4899 50%, #fbbf24 100%)', backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', animation: 'shimmer 4s linear infinite', marginBottom: '0.25rem' }}>
          WWE 2K25
        </div>
        <div style={{ fontSize: '0.75rem', color: 'rgba(167,139,250,0.4)', letterSpacing: '0.4em', marginBottom: '2.5rem' }}>AUCTION HOUSE</div>
        <div style={{ fontSize: '0.95rem', color: 'rgba(167,139,250,0.5)', marginBottom: '0.75rem', lineHeight: 1.7, letterSpacing: '0.05em' }}>
          No auction data found.<br />The row may be missing from Supabase.
        </div>
        {error && (
          <div style={{ fontSize: '0.8rem', color: '#fb7185', marginBottom: '1.25rem', wordBreak: 'break-all', lineHeight: 1.6, padding: '0.7rem 0.9rem', background: 'rgba(251,113,133,0.08)', boxShadow: 'inset 0 0 0 1px rgba(251,113,133,0.2)', borderRadius: 10 }}>
            Error: {error}
          </div>
        )}
        <button className="init-btn" onClick={go} disabled={working}
          style={{ padding: '1rem 2.8rem', background: 'linear-gradient(135deg, #7c3aed, #a21caf)', border: 'none', borderRadius: 14, fontFamily: 'Bebas Neue', fontSize: '1.2rem', letterSpacing: '0.15em', color: '#fff', cursor: 'pointer', boxShadow: '0 6px 28px rgba(124,58,237,0.4), inset 0 1px 0 rgba(255,255,255,0.15)', textShadow: '0 0 20px rgba(255,255,255,0.3)' }}>
          {working ? 'Initialising...' : 'Initialise Auction Data'}
        </button>
      </div>
    </div>
  )
}
