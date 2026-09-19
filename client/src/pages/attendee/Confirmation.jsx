import { Link, useLocation } from 'react-router-dom'

export default function Confirmation() {
  const { state } = useLocation()
  if (!state) return <section className="rounded-xl border border-slate-800 bg-slate-900 p-8"><h1 className="text-2xl font-bold">Booking not found</h1><Link className="mt-4 inline-block text-orange-300" to="/attendee/discover">Back to events</Link></section>

  return <section className="mx-auto max-w-3xl">
    <div className="rounded-xl border border-emerald-300/20 bg-emerald-400/10 p-8 text-center"><p className="text-3xl">✓</p><h1 className="mt-2 text-3xl font-bold">Booking confirmed</h1><p className="mt-2 text-slate-300">Payment reference: {state.booking.paymentRef}</p></div>
    <div className="mt-6 grid gap-4 md:grid-cols-2">{state.tickets.map((ticket) => <div key={ticket._id} className="rounded-xl border border-slate-800 bg-slate-900 p-5"><img className="mx-auto rounded-lg bg-white p-2" src={ticket.qrImage} alt={`QR ticket for seat ${ticket.seat.label}`} width="180" height="180" /><p className="mt-4 text-center font-semibold">Seat {ticket.seat.label}</p><p className="text-center text-sm text-slate-400">{ticket.seat.tier}</p></div>)}</div>
    <Link className="mt-6 inline-block text-orange-300" to="/attendee/discover">Browse more events</Link>
  </section>
}
