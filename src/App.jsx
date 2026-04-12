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
    const saved = localStorage.getItem('ipl_player')
    if (saved && PLAYERS.includes(saved)) setPlayer(saved)
  }, [])

  function handleSelectPlayer(name) {
    setPlayer(name)
    localStorage.setItem('ipl_player', name)
  }

  async function handleReset() {
    await supabase.from('auction_state').upsert({
      id: 1, phase: 'lobby', roster: [], roster_index: 0,
      current_player: null, current_ovr: null, current_bid: 0,
      current_leader: null, bid_history: [], purses: {}, sold_log: []
    })
    setPlayer(null)
    localStorage.removeItem('ipl_player')
    fetchGameState()
  }

  if (loading) return <LoadingScreen />
  if (!gameState) return <RecoveryScreen onReset={handleReset} />
  if (gameState.phase === 'results') return <Results gameState={gameState} player={player} onReset={handleReset} />
  if (gameState.phase !== 'bidding' || !player) return <Lobby onSelect={handleSelectPlayer} gameState={gameState} onReset={handleReset} />
  return <Auction player={player} gameState={gameState} onRefresh={fetchGameState} onReset={handleReset} />
}

function LoadingScreen() {
  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#06040a' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: '3rem', color: '#c8a84b', letterSpacing: '0.1em' }}>IPL Mega Auction</div>
        <div style={{ color: '#333', fontSize: '0.8rem', marginTop: '0.5rem', fontFamily: 'Barlow Condensed', letterSpacing: '0.3em' }}>CONNECTING...</div>
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
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#06040a', padding: '2rem' }}>
      <div style={{ textAlign: 'center', maxWidth: '380px' }}>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: '2.5rem', color: '#c8a84b', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>IPL Mega Auction</div>
        <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.8rem', color: '#444', letterSpacing: '0.3em', marginBottom: '2.5rem' }}>AUCTION CONTROL ROOM</div>
        <div style={{ fontFamily: 'Barlow Condensed', fontSize: '0.95rem', color: '#555', marginBottom: '2rem', lineHeight: 1.7 }}>
          No auction data found.<br />The row may be missing from Supabase.
        </div>
        <button onClick={go} disabled={working}
          style={{ padding: '0.9rem 2.5rem', background: '#c8a84b', border: 'none', borderRadius: '2px', fontFamily: 'Bebas Neue', fontSize: '1.1rem', letterSpacing: '0.15em', color: '#06040a', cursor: working ? 'not-allowed' : 'pointer', opacity: working ? 0.6 : 1, transition: 'opacity 0.2s' }}>
          {working ? 'Initialising...' : 'Initialise Auction Data'}
        </button>
      </div>
    </div>
  )
}
