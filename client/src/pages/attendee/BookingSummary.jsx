import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useCreateBooking } from '../../api/bookings'
import { useSeatStore } from '../../store/seatStore'

export default function BookingSummary() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const { myHold, seats, clearMyHold } = useSeatStore()
  const [step, setStep] = useState('summary')
  const { mutate, isPending, error } = useCreateBooking()
  const seat = seats.find((item) => item._id === myHold?.seatId)

  if (!seat) {
    return <section className="rounded-xl border border-slate-800 bg-slate-900 p-8"><h1 className="text-2xl font-bold">No active seat hold</h1><p className="mt-3 text-slate-400">Return to the seat map and select a seat first.</p><Link className="mt-6 inline-block text-orange-300" to={`/attendee/events/${eventId}/seats`}>Back to seats</Link></section>
  }

  function handlePay() {
    setStep('processing')
    window.setTimeout(() => {
      mutate({ eventId, seatIds: [myHold.seatId] }, {
        onSuccess: (data) => {
          clearMyHold()
          navigate(`/attendee/confirmation/${data.booking._id}`, { state: data, replace: true })
        },
        onError: () => setStep('summary'),
      })
    }, 1200)
  }

  return <section className="mx-auto max-w-xl rounded-xl border border-slate-800 bg-slate-900 p-8">
    <Link className="text-sm text-orange-300" to={`/attendee/events/${eventId}/seats`}>← Back to seats</Link>
    <p className="mt-8 text-sm uppercase tracking-widest text-orange-300">Checkout</p>
    <h1 className="mt-2 text-3xl font-bold">Booking summary</h1>
    <div className="mt-6 flex items-center justify-between rounded-xl bg-slate-800 p-4"><span>{seat.label} · {seat.tier}</span><strong>${seat.price.toFixed(2)}</strong></div>
    {step === 'summary' && <button onClick={() => setStep('payment')} className="mt-6 w-full rounded-lg bg-cyan-400 px-4 py-3 font-semibold text-slate-950">Proceed to payment</button>}
    {step === 'payment' && <div className="mt-6 space-y-4"><p className="text-sm text-slate-400">Mock payment only — no card is charged.</p><input className="w-full rounded-lg bg-slate-800 px-4 py-3" placeholder="Card number" defaultValue="4242 4242 4242 4242" /><div className="grid grid-cols-2 gap-4"><input className="rounded-lg bg-slate-800 px-4 py-3" placeholder="Expiry" defaultValue="12/28" /><input className="rounded-lg bg-slate-800 px-4 py-3" placeholder="CVC" defaultValue="123" /></div><button onClick={handlePay} disabled={isPending} className="w-full rounded-lg bg-cyan-400 px-4 py-3 font-semibold text-slate-950 disabled:cursor-wait disabled:opacity-60">{isPending ? 'Confirming...' : `Pay $${seat.price.toFixed(2)}`}</button></div>}
    {step === 'processing' && <p className="mt-6 text-orange-200">Processing payment...</p>}
    {error && <p className="mt-4 text-sm text-red-300">{error.response?.data?.error || 'Payment could not be completed. Your hold may have expired.'}</p>}
  </section>
}
