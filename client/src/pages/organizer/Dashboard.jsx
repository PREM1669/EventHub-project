import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useEvent } from '../../api/events'
import { exportRosterUrl, useAnalytics, useAnnouncements, useRoster, useSendAnnouncement } from '../../api/organizer'
import api from '../../api/axios'
import { socket } from '../../sockets/socket'
import { formatPrice } from '../../utils/currency'

export default function Dashboard() {
  const { eventId } = useParams()
  const { data: event } = useEvent(eventId)
  const { data: roster = [], isLoading: rosterLoading } = useRoster(eventId)
  const { data: analytics } = useAnalytics(eventId)
  const { data: announcements = [] } = useAnnouncements(eventId)
  const sendAnnouncement = useSendAnnouncement(eventId)
  const [message, setMessage] = useState('')
  const [liveAnnouncements, setLiveAnnouncements] = useState([])
  const [checkedInCount, setCheckedInCount] = useState(0)

  useEffect(() => {
    socket.emit('join-event', eventId)
    const handleAnnouncement = (announcement) => setLiveAnnouncements((current) => [announcement, ...current])
    const handleCheckin = ({ checkedInCount: count }) => setCheckedInCount(count)
    socket.on('announcement', handleAnnouncement)
    socket.on('checkin-update', handleCheckin)
    return () => {
      socket.emit('leave-event', eventId)
      socket.off('announcement', handleAnnouncement)
      socket.off('checkin-update', handleCheckin)
    }
  }, [eventId])

  useEffect(() => {
    if (analytics) setCheckedInCount(analytics.checkedInCount || 0)
  }, [analytics])

  const tiers = useMemo(() => analytics?.tierBreakdown || [], [analytics])
  const maxRevenue = Math.max(...tiers.map((tier) => tier.revenue), 1)

  async function downloadRoster() {
    const response = await api.get(exportRosterUrl(eventId), { responseType: 'blob' })
    const url = URL.createObjectURL(response.data)
    const link = document.createElement('a')
    link.href = url
    link.download = `${event?.title || 'event'}-roster.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  function submitAnnouncement(eventSubmit) {
    eventSubmit.preventDefault()
    if (!message.trim() || sendAnnouncement.isPending) return
    sendAnnouncement.mutate(message.trim(), { onSuccess: () => setMessage('') })
  }

  return <section>
    <Link className="text-sm text-orange-300" to="/organizer/events">← Back to events</Link>
    <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-sm uppercase tracking-widest text-orange-300">Organizer dashboard</p><h1 className="mt-2 text-3xl font-bold">{event?.title || 'Event dashboard'}</h1></div>
      {event && <div className="flex flex-wrap gap-3"><Link to={`/organizer/events/${eventId}/check-in`} className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950">QR check-in</Link><button onClick={downloadRoster} className="rounded-lg border border-orange-300/40 px-4 py-2 text-sm text-orange-200">Export roster CSV</button></div>}
    </div>
    {analytics && <div className="mt-8 grid gap-4 sm:grid-cols-4"><Metric label="Revenue" value={formatPrice(analytics.revenue)} /><Metric label="Tickets sold" value={`${analytics.ticketsSold}/${analytics.capacity}`} /><Metric label="Sold" value={`${analytics.soldPercent.toFixed(1)}%`} /><Metric label="Checked in" value={`${checkedInCount}/${analytics.ticketsSold}`} /></div>}
    <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-xl font-semibold">Revenue by tier</h2>
        <div className="mt-5 space-y-4">{tiers.length ? tiers.map((tier) => <div key={tier._id}><div className="mb-1 flex justify-between text-sm"><span>{tier._id} · {tier.count} tickets</span><span>{formatPrice(tier.revenue)}</span></div><div className="h-3 rounded-full bg-slate-800"><div className="h-3 rounded-full bg-orange-300" style={{ width: `${(tier.revenue / maxRevenue) * 100}%` }} /></div></div>) : <p className="text-sm text-slate-400">No confirmed sales yet.</p>}</div>
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-xl font-semibold">Announcements</h2>
        <form className="mt-4 space-y-3" onSubmit={submitAnnouncement}><textarea className="w-full rounded-lg bg-slate-800 px-4 py-3 outline-none ring-orange-300 focus:ring-2" rows="3" maxLength="1000" value={message} onChange={(input) => setMessage(input.target.value)} placeholder="Share an update with attendees..." /><button disabled={!message.trim() || sendAnnouncement.isPending} className="rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50">{sendAnnouncement.isPending ? 'Sending...' : 'Send announcement'}</button></form>
        {sendAnnouncement.isError && <p className="mt-3 text-sm text-red-300">{sendAnnouncement.error.response?.data?.error || 'Unable to send announcement.'}</p>}
        <div className="mt-5 space-y-3">{[...liveAnnouncements, ...announcements].map((announcement, index) => <div key={`${announcement._id || announcement.sentAt}-${index}`} className="rounded-lg bg-slate-800 p-3 text-sm"><p>{announcement.message}</p><p className="mt-1 text-xs text-slate-400">{new Date(announcement.createdAt || announcement.sentAt).toLocaleString()}</p></div>)}</div>
      </div>
    </div>
    <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-6"><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">Attendee roster</h2><span className="text-sm text-slate-400">{roster.length} ticket{roster.length === 1 ? '' : 's'}</span></div><div className="mt-4 overflow-x-auto">{rosterLoading ? <p className="text-slate-400">Loading roster...</p> : <table className="w-full min-w-[680px] text-left text-sm"><thead className="border-b border-slate-700 text-slate-400"><tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Seat</th><th className="p-3">Tier</th><th className="p-3">Price</th></tr></thead><tbody>{roster.map((row) => <tr key={`${row.bookingId}-${row.seatLabel}`} className="border-b border-slate-800"><td className="p-3">{row.attendeeName}</td><td className="p-3">{row.attendeeEmail}</td><td className="p-3">{row.seatLabel}</td><td className="p-3">{row.tier}</td><td className="p-3">{formatPrice(row.price)}</td></tr>)}</tbody></table>}</div></div>
  </section>
}

function Metric({ label, value }) {
  return <div className="rounded-xl border border-slate-800 bg-slate-900 p-5"><p className="text-sm text-slate-400">{label}</p><p className="mt-2 text-2xl font-semibold text-orange-200">{value}</p></div>
}
