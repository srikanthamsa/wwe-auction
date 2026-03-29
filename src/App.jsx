import React, { useState, useEffect } from 'react'
import { supabase, PLAYERS } from './lib/supabase.js'
import Lobby from './components/Lobby.jsx'
import Auction from './components/Auction.jsx'
import Results from './components/Results.jsx'

export default function App() {
  const [player, setPlayer] = useState(null)
  const [gameState, setGameState] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchGameState()
    const channel = supabase
      .channel('game_state')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'auction_state' }, () => {
        fetchGameState()
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  async function fetchGameState() {
    const { data, error } = await supabase
      .from('auction_state')
      .select('*')
      .eq('id', 1)
      .single()

    if (error || !data) {
      setGameState(null)
      setLoading(false)
      return
    }
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
      current_leader: null, bid_history: [], purses: {}, sold_log: []
    })
    if (error) throw error
    setPlayer(null)
    localStorage.removeItem('wwe_player')
    fetchGameState()
  }

  if (loading) return <LoadingScreen />
  if (!gameState) return <RecoveryScreen onReset={handleReset} />
  if (!player) return <Lobby onSelect={handleSelectPlayer} gameState={gameState} onReset={handleReset} />
  if (gameState?.phase === 'results') return <Results gameState={gameState} player={player} onReset={handleReset} />
  return <Auction player={player} gameState={gameState} onRefresh={fetchGameState} onReset={handleReset} />
}

function LoadingScreen() {
  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#07040f', fontFamily: 'Barlow Condensed, sans-serif' }}>
      <style>{`@keyframes glowPulse{0%,100%{opacity:0.4}50%{opacity:0.9}} @keyframes shimmer{0%{background-position:200% center}100%{background-position:-200% center}}`}</style>
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 500, height: 500, background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 65%)', pointerEvents: 'none', animation: 'glowPulse 3s ease-in-out infinite' }} />
      <div style={{ textAlign: 'center', position: 'relative' }}>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: '3rem', letterSpacing: '0.08em', background: 'linear-gradient(135deg, #a78bfa 0%, #ec4899 50%, #fbbf24 100%)', backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', animation: 'shimmer 3s linear infinite' }}>WWE 2K25</div>
        <div style={{ fontSize: '0.7rem', color: 'rgba(167,139,250,0.4)', marginTop: '0.5rem', letterSpacing: '0.4em' }}>CONNECTING...</div>
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
    try {
      await onReset()
    } catch (e) {
      setError(e?.message || String(e))
    }
    setWorking(false)
  }
  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#07040f', padding: '2rem', fontFamily: 'Barlow Condensed, sans-serif' }}>
      <style>{`@keyframes glowPulse{0%,100%{opacity:0.4}50%{opacity:0.9}} @keyframes shimmer{0%{background-position:200% center}100%{background-position:-200% center}} .init-btn{transition:all 0.2s} .init-btn:not(:disabled):hover{transform:translateY(-2px);box-shadow:0 8px 32px rgba(139,92,246,0.4)!important} .init-btn:disabled{opacity:0.5;cursor:not-allowed}`}</style>
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 500, height: 500, background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 65%)', pointerEvents: 'none', animation: 'glowPulse 4s ease-in-out infinite' }} />
      <div style={{ textAlign: 'center', maxWidth: 400, position: 'relative' }}>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: '2.8rem', letterSpacing: '0.08em', background: 'linear-gradient(135deg, #a78bfa 0%, #ec4899 50%, #fbbf24 100%)', backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', animation: 'shimmer 4s linear infinite', marginBottom: '0.25rem' }}>WWE 2K25</div>
        <div style={{ fontSize: '0.7rem', color: 'rgba(167,139,250,0.4)', letterSpacing: '0.4em', marginBottom: '2.5rem' }}>AUCTION HOUSE</div>
        <div style={{ fontSize: '0.9rem', color: 'rgba(167,139,250,0.45)', marginBottom: '0.75rem', lineHeight: 1.7, letterSpacing: '0.05em' }}>
          No auction data found.<br />The row may be missing from Supabase.
        </div>
        {error && (
          <div style={{ fontSize: '0.8rem', color: '#fb7185', marginBottom: '1.25rem', wordBreak: 'break-all', lineHeight: 1.6, padding: '0.6rem 0.8rem', background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.2)', borderRadius: 10 }}>
            Error: {error}
          </div>
        )}
        <button className="init-btn" onClick={go} disabled={working}
          style={{ padding: '0.9rem 2.5rem', background: 'linear-gradient(135deg, #7c3aed, #a21caf)', border: 'none', borderRadius: 12, fontFamily: 'Bebas Neue', fontSize: '1.1rem', letterSpacing: '0.15em', color: '#fff', cursor: 'pointer', boxShadow: '0 4px 24px rgba(124,58,237,0.3)', textShadow: '0 0 16px rgba(255,255,255,0.3)' }}>
          {working ? 'Initialising...' : 'Initialise Auction Data'}
        </button>
      </div>
    </div>
  )
}
