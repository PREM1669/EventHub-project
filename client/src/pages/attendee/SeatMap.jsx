import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../../api/axios'
import { socket } from '../../sockets/socket'
import { useAuthStore } from '../../store/authStore'
import { useSeatStore } from '../../store/seatStore'
import HoldTimer from '../../components/HoldTimer'

function groupByRow(seats) {
  return seats.reduce((rows, seat) => {
    rows[seat.row] = [...(rows[seat.row] || []), seat]
    return rows
  }, {})
}

export default function SeatMap() {
  const { eventId } = useParams()
  const { user } = useAuthStore()
  const { seats, setSeats, updateSeat, myHold, setMyHold, clearMyHold } = useSeatStore()
  const [error, setError] = useState('')

  const releaseHold = useCallback(() => {
    if (myHold) socket.emit('release-seat', { eventId, seatId: myHold.seatId, userId: user.id })
    clearMyHold()
  }, [clearMyHold, eventId, myHold, user?.id])

  useEffect(() => {
    let mounted = true
    api.get(`/events/${eventId}/seats`)
      .then(({ data }) => { if (mounted) setSeats(data) })
      .catch(() => { if (mounted) setError('Unable to load seats. Publish the event first.') })

    socket.emit('join-event', eventId)
    const onSeatUpdated = ({ seatId, status, heldBy, holdExpiresAt }) => updateSeat(seatId, { status, heldBy, holdExpiresAt })
    const onHoldSuccess = ({ seatId, expiresAt }) => setMyHold({ seatId, expiresAt })
    const onHoldFailed = ({ reason }) => setError(reason)
    socket.on('seat-updated', onSeatUpdated)
    socket.on('hold-success', onHoldSuccess)
    socket.on('hold-failed', onHoldFailed)
    return () => {
      mounted = false
      socket.emit('leave-event', eventId)
      socket.off('seat-updated', onSeatUpdated)
      socket.off('hold-success', onHoldSuccess)
      socket.off('hold-failed', onHoldFailed)
    }
  }, [eventId, setSeats, updateSeat, setMyHold])

  const rows = useMemo(() => groupByRow(seats), [seats])

  function handleSeatClick(seat) {
    setError('')
    if (seat.status !== 'available' || !user) return
    if (myHold) socket.emit('release-seat', { eventId, seatId: myHold.seatId, userId: user.id })
    socket.emit('hold-seat', { eventId, seatId: seat._id, userId: user.id })
  }

  return (
    <section>
      <Link to={`/events/${eventId}`} className="text-sm text-orange-300">← Back to event</Link>
      <div className="mb-8 mt-6">
        <p className="text-sm uppercase tracking-widest text-orange-300">Seat selection</p>
        <h1 className="mt-2 text-3xl font-bold">Choose your seat</h1>
        <p className="mt-2 text-slate-400">Your selected seat is held for two minutes.</p>
      </div>
      {myHold && <HoldTimer expiresAt={myHold.expiresAt} onExpire={releaseHold} />}
      {error && <p className="mb-5 text-sm text-red-300">{error}</p>}
      <div className="mb-8 flex flex-wrap gap-4 text-xs text-slate-300"><span>🟩 Available</span><span>🟨 Held</span><span>🟦 Your hold</span><span>⬛ Booked</span></div>
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 sm:p-8">
        <div className="mb-10 rounded-full border border-orange-300/30 bg-orange-400/10 py-3 text-center text-sm text-orange-200">STAGE</div>
        {Object.entries(rows).map(([row, rowSeats]) => (
          <div key={row} className="mb-3 flex items-center gap-2 overflow-x-auto">
            <span className="w-6 shrink-0 text-sm text-slate-400">{row}</span>
            {rowSeats.map((seat) => {
              const mine = myHold?.seatId === seat._id
              const disabled = seat.status !== 'available' && !mine
              return <button key={seat._id} onClick={() => handleSeatClick(seat)} disabled={disabled} title={`${seat.tier} · $${seat.price}`} className={`h-10 min-w-10 rounded-lg border px-2 text-xs transition ${mine ? 'border-blue-300 bg-blue-500 text-white' : seat.status === 'held' ? 'cursor-not-allowed border-yellow-300/40 bg-yellow-300/30 text-yellow-100' : seat.status === 'booked' ? 'cursor-not-allowed border-slate-700 bg-slate-800 text-slate-500' : 'border-emerald-300/40 bg-emerald-400/20 text-emerald-100 hover:bg-emerald-400/40'}`}>{seat.label}</button>
            })}
          </div>
        ))}
        {!seats.length && !error && <p className="py-8 text-center text-slate-400">No seats have been generated for this event yet.</p>}
      </div>
    </section>
  )
}
