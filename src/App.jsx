import React, { useState, useEffect } from 'react'
import { supabase, PLAYERS } from './lib/supabase.js'
import Lobby from './components/Lobby.jsx'
import Auction from './components/Auction.jsx'
import Results from './components/Results.jsx'

export default function App() {
  const [player, setPlayer] = useState(null)
  const [gameState, setGameState] = useState(null)
  const [loading, setLoading] = useState(true)

  // fetch initial game state
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
    const { data } = await supabase
      .from('auction_state')
      .select('*')
      .eq('id', 1)
      .single()
    setGameState(data)
    setLoading(false)
  }

  // restore player from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('wwe_player')
    if (saved && PLAYERS.includes(saved)) setPlayer(saved)
  }, [])

  function handleSelectPlayer(name) {
    setPlayer(name)
    localStorage.setItem('wwe_player', name)
  }

  if (loading) return <LoadingScreen />

  if (!player) return <Lobby onSelect={handleSelectPlayer} gameState={gameState} />

  if (gameState?.phase === 'results') return <Results gameState={gameState} player={player} onBack={() => { setPlayer(null); localStorage.removeItem('wwe_player') }} />

  return <Auction player={player} gameState={gameState} onRefresh={fetchGameState} />
}

function LoadingScreen() {
  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: '3rem', color: '#c8a84b', letterSpacing: '0.1em' }}>WWE 2K25</div>
        <div style={{ color: '#555', fontSize: '0.9rem', marginTop: '0.5rem', fontFamily: 'Barlow Condensed', letterSpacing: '0.2em' }}>LOADING AUCTION...</div>
      </div>
    </div>
  )
}
