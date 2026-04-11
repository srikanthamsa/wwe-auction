import React from 'react'

export default function Atmosphere({ accent, secondary }) {
  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(7,17,31,0.94), rgba(8,15,28,0.9))',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: '-10%',
          left: '-6%',
          width: '34rem',
          height: '34rem',
          borderRadius: '999px',
          background: `radial-gradient(circle, ${accent}44 0%, transparent 68%)`,
          filter: 'blur(18px)',
          animation: 'driftSlow 12s ease-in-out infinite',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'fixed',
          right: '-10%',
          bottom: '-12%',
          width: '36rem',
          height: '36rem',
          borderRadius: '999px',
          background: `radial-gradient(circle, ${secondary}33 0%, transparent 70%)`,
          filter: 'blur(22px)',
          animation: 'driftWide 14s ease-in-out infinite',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div className="subtle-grid" />
      <div className="bg-noise" />
    </>
  )
}
