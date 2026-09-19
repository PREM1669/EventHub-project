import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api from '../../api/axios'
import { socket } from '../../sockets/socket'
import { useAuthStore } from '../../store/authStore'
import { useSeatStore } from '../../store/seatStore'
import HoldTimer from '../../components/HoldTimer'
import { formatPrice } from '../../utils/currency'

function groupByRow(seats) {
  return seats.reduce((rows, seat) => {
    rows[seat.row] = [...(rows[seat.row] || []), seat].sort((first, second) => (
      Number(first.label.slice(first.row.length)) - Number(second.label.slice(second.row.length))
    ))
    return rows
  }, {})
}

function groupByTier(seats) {
  return seats.reduce((tiers, seat) => {
    tiers[seat.tier] = [...(tiers[seat.tier] || []), seat]
    return tiers
  }, {})
}

export default function SeatMap() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { seats, setSeats, updateSeat, myHolds, addMyHold, removeMyHold, clearMyHolds } = useSeatStore()
  const [error, setError] = useState('')

  const releaseHolds = useCallback(() => {
    myHolds.forEach((hold) => socket.emit('release-seat', { eventId, seatId: hold.seatId, userId: user.id }))
    clearMyHolds()
  }, [clearMyHolds, eventId, myHolds, user?.id])

  const releaseExpiredHolds = useCallback(() => {
    const now = Date.now()
    const expired = myHolds.filter((hold) => new Date(hold.expiresAt).getTime() <= now)
    expired.forEach((hold) => socket.emit('release-seat', { eventId, seatId: hold.seatId, userId: user.id }))
    expired.forEach((hold) => removeMyHold(hold.seatId))
  }, [eventId, myHolds, removeMyHold, user?.id])

  useEffect(() => {
    let mounted = true
    setSeats([])
    api.get(`/events/${eventId}/seats`)
      .then(({ data }) => { if (mounted) setSeats(data) })
      .catch(() => { if (mounted) setError('Unable to load seats. Publish the event first.') })

    socket.emit('join-event', eventId)
    const onSeatUpdated = ({ seatId, status, heldBy, holdExpiresAt }) => {
      updateSeat(seatId, { status, heldBy, holdExpiresAt })
      if (status === 'available') removeMyHold(seatId)
    }
    const onSeatsBooked = ({ seatIds }) => seatIds.forEach((seatId) => updateSeat(seatId, { status: 'booked', heldBy: null, holdExpiresAt: null }))
    const onHoldSuccess = ({ seatId, expiresAt }) => addMyHold({ seatId, expiresAt })
    const onHoldFailed = ({ reason }) => setError(reason)
    socket.on('seat-updated', onSeatUpdated)
    socket.on('hold-success', onHoldSuccess)
    socket.on('hold-failed', onHoldFailed)
    socket.on('seats-booked', onSeatsBooked)
    return () => {
      mounted = false
      socket.emit('leave-event', eventId)
      socket.off('seat-updated', onSeatUpdated)
      socket.off('hold-success', onHoldSuccess)
      socket.off('hold-failed', onHoldFailed)
      socket.off('seats-booked', onSeatsBooked)
    }
  }, [eventId, setSeats, updateSeat, addMyHold, removeMyHold])

  const tiers = useMemo(() => groupByTier(seats), [seats])

  function handleSeatClick(seat) {
    setError('')
    if (!user) return
    const selected = myHolds.find((hold) => hold.seatId === seat._id)
    if (selected) {
      socket.emit('release-seat', { eventId, seatId: seat._id, userId: user.id })
      removeMyHold(seat._id)
      return
    }
    if (seat.status !== 'available') return
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
      {myHolds.length > 0 && <HoldTimer expiresAt={Math.min(...myHolds.map((hold) => new Date(hold.expiresAt).getTime()))} onExpire={releaseExpiredHolds} />}
      {myHolds.length > 0 && <div className="mb-6 flex flex-wrap items-center gap-3"><span className="text-sm text-slate-300">{myHolds.length} seat{myHolds.length === 1 ? '' : 's'} selected</span><button onClick={() => navigate(`/attendee/events/${eventId}/booking`)} className="rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950">Continue to booking</button><button onClick={releaseHolds} className="rounded-lg border border-red-300/40 px-4 py-3 text-sm text-red-200">Clear selection</button></div>}
      {error && <p className="mb-5 text-sm text-red-300">{error}</p>}
      <div className="mb-8 flex flex-wrap gap-x-5 gap-y-3 text-xs text-slate-300">
        <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded border border-emerald-300/40 bg-emerald-400/20" />Available</span>
        <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded border border-yellow-300/40 bg-yellow-300/30" />Held</span>
        <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded border border-blue-300 bg-blue-500" />Your hold</span>
        <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded border border-slate-700 bg-slate-800" />Booked</span>
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 sm:p-8">
        <div className="mx-auto mb-10 max-w-2xl rounded-[2rem] border border-orange-300/40 bg-orange-400/10 py-4 text-center text-sm font-semibold tracking-[0.35em] text-orange-200 shadow-[0_0_35px_rgba(251,146,60,0.12)]">STAGE</div>
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-8">
          {Object.entries(tiers).sort(([, firstSeats], [, secondSeats]) => (secondSeats[0]?.price || 0) - (firstSeats[0]?.price || 0)).map(([tier, tierSeats]) => {
            const rows = groupByRow(tierSeats)
            const tierPrice = tierSeats[0]?.price
            return <div key={tier} className="w-full rounded-2xl border border-slate-700/80 bg-slate-950/60 p-4 sm:p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-100">{tier} section</h2>
                  <p className="mt-1 text-xs text-slate-400">{tierSeats.length} seats{typeof tierPrice === 'number' ? ` · ${formatPrice(tierPrice)} each` : ''}</p>
                </div>
                <span className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">Available section</span>
              </div>
              <div className="flex flex-col items-center gap-3">
                {Object.entries(rows).map(([row, rowSeats]) => <div key={row} className="flex w-full items-center justify-center gap-2 overflow-x-auto pb-1">
                  <span className="w-6 shrink-0 text-center text-xs font-semibold text-slate-500">{row}</span>
                  <div className="flex shrink-0 gap-2">
                    {rowSeats.map((seat) => {
                      const mine = myHolds.some((hold) => hold.seatId === seat._id)
                      const disabled = seat.status !== 'available' && !mine
                      return <button key={seat._id} onClick={() => handleSeatClick(seat)} disabled={disabled} title={`${seat.tier} · ${formatPrice(seat.price)}`} className={`h-10 min-w-10 rounded-lg border px-2 text-xs transition ${mine ? 'border-blue-300 bg-blue-500 text-white' : seat.status === 'held' ? 'cursor-not-allowed border-yellow-300/40 bg-yellow-300/30 text-yellow-100' : seat.status === 'booked' ? 'cursor-not-allowed border-slate-700 bg-slate-800 text-slate-500' : 'border-emerald-300/40 bg-emerald-400/20 text-emerald-100 hover:bg-emerald-400/40'}`}>{seat.label}</button>
                    })}
                  </div>
                </div>)}
              </div>
            </div>
          })}
        </div>
        {!seats.length && !error && <p className="py-8 text-center text-slate-400">No seats have been generated for this event yet.</p>}
      </div>
    </section>
  )
}
