import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useBookingTickets, useCancelBooking, useMyBookings } from '../../api/bookings'
import { formatPrice } from '../../utils/currency'

function BookingCard({ booking, onCancel, cancelling, canCancel }) {
  const [showTickets, setShowTickets] = useState(false)
  const { data: tickets = [], isLoading } = useBookingTickets(booking._id, showTickets)
  const event = booking.event

  return <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 className="text-xl font-semibold">{event?.title || 'Event'}</h2>
        <p className="mt-1 text-sm text-slate-400">{event?.venue} · {event?.date ? new Date(event.date).toLocaleString() : 'Date unavailable'}</p>
      </div>
      <span className={`rounded-full px-3 py-1 text-xs capitalize ${booking.status === 'confirmed' ? 'bg-emerald-400/10 text-emerald-300' : 'bg-red-400/10 text-red-300'}`}>{booking.status}</span>
    </div>
    <div className="mt-5 grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
      <p><span className="text-slate-500">Seats</span><br />{booking.seats?.map((seat) => seat.label).join(', ') || '—'}</p>
      <p><span className="text-slate-500">Amount</span><br />{formatPrice(booking.amount)}</p>
      <p><span className="text-slate-500">Booked</span><br />{new Date(booking.createdAt).toLocaleDateString()}</p>
    </div>
    <div className="mt-5 flex flex-wrap gap-3">
      {booking.status === 'confirmed' && <button onClick={() => setShowTickets((current) => !current)} className="rounded-lg border border-cyan-400/40 px-4 py-2 text-sm text-cyan-300">{showTickets ? 'Hide tickets' : 'View tickets and QR codes'}</button>}
      {canCancel && booking.status === 'confirmed' && <button disabled={cancelling} onClick={onCancel} className="rounded-lg border border-red-400/40 px-4 py-2 text-sm text-red-200 disabled:opacity-50">{cancelling ? 'Cancelling...' : 'Cancel booking and simulate refund'}</button>}
    </div>
    {showTickets && <div className="mt-5 grid gap-4 border-t border-slate-800 pt-5 sm:grid-cols-2">{isLoading ? <p className="text-sm text-slate-400">Loading tickets...</p> : tickets.map((ticket) => <div key={ticket._id} className="rounded-lg bg-slate-800 p-4 text-center"><img className="mx-auto rounded bg-white p-2" src={ticket.qrImage} alt={`QR ticket for seat ${ticket.seat?.label}`} width="160" height="160" /><p className="mt-3 font-semibold">Seat {ticket.seat?.label}</p><p className="text-sm text-slate-400">{ticket.seat?.tier}</p></div>)}</div>}
    {booking.status === 'cancelled' && <p className="mt-4 text-sm text-slate-400">Refund reference: {booking.refundRef || 'Pending'}</p>}
  </article>
}

export default function MyBookings() {
  const { data: bookings = [], isLoading, isError } = useMyBookings()
  const cancelBooking = useCancelBooking()
  const [activeTab, setActiveTab] = useState('upcoming')
  const [now] = useState(() => Date.now())
  const filteredBookings = bookings.filter((booking) => {
    const eventTime = new Date(booking.event?.date).getTime()
    return activeTab === 'upcoming'
      ? eventTime >= now && booking.status === 'confirmed'
      : eventTime < now || booking.status === 'cancelled'
  })

  return <section>
    <div className="mb-8"><p className="text-sm uppercase tracking-widest text-cyan-400">Attendee</p><h1 className="mt-2 text-3xl font-bold">My tickets</h1><p className="mt-2 text-slate-400">Access upcoming tickets, past events, QR codes, and refunds.</p></div>
    <div className="mb-6 flex flex-wrap gap-2 rounded-xl border border-slate-800 bg-slate-900 p-2"><button onClick={() => setActiveTab('upcoming')} className={`rounded-lg px-4 py-2 text-sm font-semibold ${activeTab === 'upcoming' ? 'bg-cyan-400 text-slate-950' : 'text-slate-300 hover:bg-slate-800'}`}>Upcoming</button><button onClick={() => setActiveTab('past')} className={`rounded-lg px-4 py-2 text-sm font-semibold ${activeTab === 'past' ? 'bg-cyan-400 text-slate-950' : 'text-slate-300 hover:bg-slate-800'}`}>Past / Cancelled</button></div>
    {isLoading && <p className="text-slate-400">Loading your bookings...</p>}
    {isError && <p className="text-red-300">Unable to load your bookings.</p>}
    {cancelBooking.isError && <p className="mb-4 rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{cancelBooking.error.response?.data?.error || 'Unable to cancel booking.'}</p>}
    {!isLoading && !isError && filteredBookings.length === 0 && <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-slate-400">No {activeTab === 'upcoming' ? 'upcoming' : 'past or cancelled'} bookings.<br /><Link className="mt-3 inline-block text-cyan-300" to="/">Discover events</Link></div>}
    <div className="space-y-4">{filteredBookings.map((booking) => {
      const eventTime = new Date(booking.event?.date).getTime()
      const canCancel = activeTab === 'upcoming' && eventTime - now > 24 * 60 * 60 * 1000
      return <BookingCard key={booking._id} booking={booking} cancelling={cancelBooking.isPending} canCancel={canCancel} onCancel={() => { if (window.confirm('Cancel this booking and simulate a refund?')) cancelBooking.mutate(booking._id) }} />
    })}</div>
  </section>
}
