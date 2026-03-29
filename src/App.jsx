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
          50%     { transform: translate(8%,12%) scale(1.1); }
        }
        @keyframes blob2 {
          0%,100% { transform: translate(0,0) scale(1); }
          50%     { transform: translate(-10%,-12%) scale(1.12); }
        }
        @keyframes blob3 {
          0%,100% { transform: translate(0,0) scale(1); }
          50%     { transform: translate(-12%,9%) scale(1.08); }
        }
        @keyframes blob4 {
          0%,100% { transform: translate(0,0) scale(1) rotate(0deg); }
          50%     { transform: translate(14%,-8%) scale(0.97) rotate(6deg); }
        }
        @keyframes arcGlow  { 0%,100%{opacity:0.3} 50%{opacity:0.65} }
        @keyframes sparkle  { 0%,100%{opacity:0;transform:scale(0.3)} 50%{opacity:0.6;transform:scale(1)} }

        /* ── Glass Container for buttons ── */
        .glass-container {
          background: rgba(255, 255, 255, 0.45);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.6);
          border-radius: 20px;
          padding: 1.5rem;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.04), inset 0 0 0 1px rgba(255,255,255,0.8);
        }

        /* ── Global Minimal Button (hijacking glow-wrap) ── */
        .glow-wrap { display: inline-flex; width: 100%; position: relative; }
        .glow-wrap-full { width: 100%; }
        .glow-wrap-full .glow-inner { width: 100%; }
        .glow-layer { display: none !important; }

        .glow-inner, .minimal-btn {
          position: relative;
          background: #ffffff;
          color: #0f172a;
          border: 1px solid rgba(0,0,0,0.06) !important;
          border-radius: 12px !important;
          font-family: 'Outfit', sans-serif;
          font-weight: 600;
          letter-spacing: 0.03em;
          cursor: pointer;
          transition: all 0.2s ease !important;
          box-shadow: 0 2px 5px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,1) !important;
        }
        .glow-inner:hover:not(:disabled) {
          background: #f8fafc !important;
          transform: translateY(-1px) !important;
          box-shadow: 0 6px 16px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,1) !important;
          border-color: rgba(99, 102, 241, 0.15) !important;
        }
        .glow-inner:active:not(:disabled) { 
          transform: translateY(0) scale(0.98) !important; 
        }
        .glow-inner:disabled { 
          opacity: 0.5 !important; 
          cursor: not-allowed !important; 
          background: #f1f5f9 !important; 
          box-shadow: none !important;
          color: #94a3b8 !important;
        }

        /* ── Global override ── */
        body { font-family: 'Outfit', sans-serif; background: #ffffff; color: #0f172a; }

        /* ── Scrollbar ── */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 3px; }

        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none', background: '#fafafa' }}>

        {/* Soft white base */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 50%, #ffffff 0%, #f1f5f9 100%)' }} />

        {/* Blurry colorful gooey liquids */}
        {/* Blue */}
        <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '80%', height: '80%', background: 'radial-gradient(ellipse, rgba(37,99,235,0.45) 0%, transparent 60%)', filter: 'blur(90px)', animation: 'blob1 30s ease-in-out infinite' }} />
        
        {/* Purple/Violet */}
        <div style={{ position: 'absolute', top: '15%', right: '-15%', width: '75%', height: '75%', background: 'radial-gradient(ellipse, rgba(147,51,234,0.35) 0%, rgba(30,41,59,0.2) 50%, transparent 70%)', filter: 'blur(100px)', animation: 'blob2 35s ease-in-out infinite reverse' }} />
        
        {/* Red */}
        <div style={{ position: 'absolute', bottom: '-20%', left: '10%', width: '70%', height: '70%', background: 'radial-gradient(ellipse, rgba(220,38,38,0.35) 0%, transparent 60%)', filter: 'blur(80px)', animation: 'blob3 32s ease-in-out infinite' }} />
        
        {/* Black/Charcoal gooey accent */}
        <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: '60%', height: '60%', background: 'radial-gradient(ellipse, rgba(15,23,42,0.25) 0%, rgba(15,23,42,0.1) 50%, transparent 70%)', filter: 'blur(80px)', animation: 'blob4 38s ease-in-out infinite reverse' }} />

        {/* Central unifying bloom */}
        <div style={{ position: 'absolute', top: '25%', left: '25%', width: '50%', height: '50%', background: 'radial-gradient(ellipse, rgba(255,255,255,0.6) 0%, transparent 60%)', filter: 'blur(70px)', animation: 'blob1 25s ease-in-out infinite' }} />

        {/* Edge vignette light */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, transparent 40%, rgba(255,255,255,0.4) 100%)' }} />

        {/* Sparkles */}
        {SPARKS.map(s => (
          <div key={s.id} style={{ position: 'absolute', left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, borderRadius: '50%', background: s.color.replace('255,255,255','139,92,246'), animation: `sparkle ${s.dur}s ${s.delay}s ease-in-out infinite` }} />
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
        <div style={{ fontFamily: 'Outfit', fontSize: '0.85rem', color: 'rgba(30,41,59,0.45)', marginTop: '0.5rem', letterSpacing: '0.15em' }}>CONNECTING...</div>
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
        <div style={{ fontFamily: 'Outfit', fontSize: '0.8rem', color: 'rgba(30,41,59,0.4)', letterSpacing: '0.25em', marginBottom: '2.5rem' }}>AUCTION HOUSE</div>
        <div style={{ fontFamily: 'Outfit', fontSize: '1rem', color: 'rgba(30,41,59,0.5)', marginBottom: '0.75rem', lineHeight: 1.7 }}>
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
