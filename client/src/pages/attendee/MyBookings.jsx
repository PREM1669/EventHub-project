import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useBookingTickets, useMyBookings } from '../../api/bookings'
import { formatPrice } from '../../utils/currency'

const tabs = [
  { id: 'live', label: 'Live' },
  { id: 'booked', label: 'Booked' },
  { id: 'upcoming', label: 'Upcoming' },
]

function BookingCard({ booking }) {
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
    {booking.status === 'confirmed' && <button onClick={() => setShowTickets((current) => !current)} className="mt-5 rounded-lg border border-cyan-400/40 px-4 py-2 text-sm text-cyan-300">{showTickets ? 'Hide tickets' : 'View tickets and QR codes'}</button>}
    {showTickets && <div className="mt-5 grid gap-4 border-t border-slate-800 pt-5 sm:grid-cols-2">{isLoading ? <p className="text-sm text-slate-400">Loading tickets...</p> : tickets.map((ticket) => <div key={ticket._id} className="rounded-lg bg-slate-800 p-4 text-center"><img className="mx-auto rounded bg-white p-2" src={ticket.qrImage} alt={`QR ticket for seat ${ticket.seat?.label}`} width="160" height="160" /><p className="mt-3 font-semibold">Seat {ticket.seat?.label}</p><p className="text-sm text-slate-400">{ticket.seat?.tier}</p></div>)}</div>}
  </article>
}

export default function MyBookings() {
  const { data: bookings = [], isLoading, isError } = useMyBookings()
  const [activeTab, setActiveTab] = useState('live')
  const [now] = useState(() => Date.now())
  const liveWindow = 24 * 60 * 60 * 1000

  const filteredBookings = bookings.filter((booking) => {
    if (booking.status !== 'confirmed') return activeTab === 'booked'
    const eventTime = new Date(booking.event?.date).getTime()
    if (activeTab === 'upcoming') return eventTime > now
    if (activeTab === 'live') return eventTime <= now && eventTime >= now - liveWindow
    return true
  })

  return <section>
    <div className="mb-8"><p className="text-sm uppercase tracking-widest text-cyan-400">Attendee</p><h1 className="mt-2 text-3xl font-bold">My bookings</h1><p className="mt-2 text-slate-400">Access your live events, booked tickets, and upcoming reservations.</p></div>
    <div className="mb-6 flex flex-wrap gap-2 rounded-xl border border-slate-800 bg-slate-900 p-2">{tabs.map((tab) => <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`rounded-lg px-4 py-2 text-sm font-semibold ${activeTab === tab.id ? 'bg-cyan-400 text-slate-950' : 'text-slate-300 hover:bg-slate-800'}`}>{tab.label}</button>)}</div>
    {isLoading && <p className="text-slate-400">Loading your bookings...</p>}
    {isError && <p className="text-red-300">Unable to load your bookings.</p>}
    {!isLoading && !isError && filteredBookings.length === 0 && <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-slate-400">{activeTab === 'live' ? 'You have no live bookings right now.' : activeTab === 'upcoming' ? 'You have no upcoming bookings.' : 'You have no bookings yet.'}<br /><Link className="mt-3 inline-block text-cyan-300" to="/">Discover events</Link></div>}
    <div className="space-y-4">{filteredBookings.map((booking) => <BookingCard key={booking._id} booking={booking} />)}</div>
  </section>
}
