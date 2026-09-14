import { useEffect, useState } from 'react'

export default function HoldTimer({ expiresAt, onExpire }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, new Date(expiresAt) - Date.now()))

  useEffect(() => {
    const interval = setInterval(() => {
      const left = Math.max(0, new Date(expiresAt) - Date.now())
      setRemaining(left)
      if (left === 0) {
        clearInterval(interval)
        onExpire()
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [expiresAt, onExpire])

  const seconds = Math.ceil(remaining / 1000)
  return <div className="mb-6 rounded-xl border border-orange-300/30 bg-orange-400/10 px-4 py-3 text-orange-200">Seat held — {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')} remaining</div>
}
