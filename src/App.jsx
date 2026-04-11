import React, { useEffect, useState } from 'react'
import { supabase, PLAYERS } from './lib/supabase.js'
import Lobby from './components/Lobby.jsx'
import Auction from './components/Auction.jsx'
import Results from './components/Results.jsx'
import Atmosphere from './components/Atmosphere.jsx'

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
    const saved = localStorage.getItem('ipl_player')
    if (saved && PLAYERS.includes(saved)) setPlayer(saved)
  }, [])

  function handleSelectPlayer(name) {
    setPlayer(name)
    localStorage.setItem('ipl_player', name)
  }

  async function handleReset() {
    await supabase.from('auction_state').upsert({
      id: 1,
      phase: 'lobby',
      roster: [],
      roster_index: 0,
      current_player: null,
      current_ovr: null,
      current_bid: 0,
      current_leader: null,
      bid_history: [],
      purses: {},
      sold_log: [],
    })

    setPlayer(null)
    localStorage.removeItem('ipl_player')
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
    <div className="app-shell">
      <Atmosphere accent="#f2c66d" secondary="#65d7ff" />
      <div className="page-content" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '1.5rem' }}>
        <div className="glass-panel-strong" style={{ width: 'min(480px, 100%)', borderRadius: '32px', padding: '2rem', textAlign: 'center', animation: 'fadeRise 260ms ease forwards' }}>
          <div className="pill" style={{ marginBottom: '1.1rem' }}>Live Sync</div>
          <h1 className="screen-title" style={{ marginBottom: '0.85rem' }}>IPL Mega Auction</h1>
          <p className="screen-subtitle">Loading the auction room, player pool, and live table state.</p>
        </div>
      </div>
    </div>
  )
}

function RecoveryScreen({ onReset }) {
  const [working, setWorking] = useState(false)

  async function go() {
    setWorking(true)
    await onReset()
    setWorking(false)
  }

  return (
    <div className="app-shell">
      <Atmosphere accent="#f2c66d" secondary="#9d8cff" />
      <div className="page-content" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '1.5rem' }}>
        <div className="glass-panel-strong" style={{ width: 'min(540px, 100%)', borderRadius: '32px', padding: '2rem', animation: 'fadeRise 260ms ease forwards' }}>
          <div className="pill" style={{ marginBottom: '1rem' }}>Recovery</div>
          <h1 className="screen-title" style={{ marginBottom: '0.8rem' }}>Auction Control Room</h1>
          <p className="screen-subtitle" style={{ marginBottom: '1.6rem' }}>
            The app could not find the live auction row in Supabase. Re-initialising will recreate the single-state record and bring everyone back into sync.
          </p>
          <button className="btn btn-primary" onClick={go} disabled={working} style={{ width: '100%' }}>
            {working ? 'Initialising auction data...' : 'Initialise Auction Data'}
          </button>
        </div>
      </div>
    </div>
  )
}
