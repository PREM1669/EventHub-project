import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import api from './api/axios'
import { useCreateEvent, useDeleteEvent, useEvent, useEvents, useMyEvents, usePublishEvent, useUpdateEvent } from './api/events'
import SeatMap from './pages/attendee/SeatMap'
import ProtectedRoute from './components/ProtectedRoute'
import { useAuthStore } from './store/authStore'

const inputClass = 'w-full rounded-lg bg-slate-800 px-4 py-3 outline-none ring-cyan-400 focus:ring-2'

function formatDate(date) {
  return new Date(date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
}

function Home() {
  return <EventDiscovery />
}

function EventDiscovery() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [category, setCategory] = useState(searchParams.get('category') || '')
  const [from, setFrom] = useState(searchParams.get('from') || '')
  const [to, setTo] = useState(searchParams.get('to') || '')
  const [debouncedSearch, setDebouncedSearch] = useState(search)

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timeout)
  }, [search])

  useEffect(() => {
    const next = {}
    if (debouncedSearch) next.search = debouncedSearch
    if (category) next.category = category
    if (from) next.from = from
    if (to) next.to = to
    setSearchParams(next, { replace: true })
  }, [debouncedSearch, category, from, to, setSearchParams])

  const { data: events = [], isLoading, isError } = useEvents({
    search: debouncedSearch || undefined,
    category: category || undefined,
    from: from || undefined,
    to: to ? `${to}T23:59:59.999Z` : undefined,
  })

  return (
    <section>
      <div className="mb-8">
        <p className="text-sm font-medium uppercase tracking-widest text-cyan-400">EventHub</p>
        <h1 className="mt-3 text-4xl font-bold">Discover your next event.</h1>
        <p className="mt-3 text-slate-400">Browse published events and find something worth remembering.</p>
      </div>
      <div className="mb-8 grid gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 md:grid-cols-4">
        <input className={inputClass} placeholder="Search events" value={search} onChange={(event) => setSearch(event.target.value)} />
        <select className={inputClass} value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">All categories</option>
          <option value="Music">Music</option>
          <option value="Technology">Technology</option>
          <option value="Sports">Sports</option>
          <option value="Business">Business</option>
        </select>
        <input className={inputClass} type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        <input className={inputClass} type="date" value={to} onChange={(event) => setTo(event.target.value)} />
      </div>
      {isLoading && <p className="text-slate-400">Loading events...</p>}
      {isError && <p className="text-red-400">Unable to load events right now.</p>}
      {!isLoading && !isError && events.length === 0 && <p className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-slate-400">No published events match your filters.</p>}
      <div className="grid gap-5 md:grid-cols-2">
        {events.map((event) => (
          <Link key={event._id} to={`/events/${event._id}`} className="rounded-xl border border-slate-800 bg-slate-900 p-6 transition hover:border-cyan-400">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-xl font-semibold">{event.title}</h2>
              <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs text-cyan-300">{event.category}</span>
            </div>
            <p className="mt-3 line-clamp-2 text-slate-400">{event.description || 'No description provided.'}</p>
            <p className="mt-5 text-sm text-slate-300">{formatDate(event.date)} · {event.venue}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}

function EventDetail() {
  const { id } = useParams()
  const { data: event, isLoading, isError } = useEvent(id)
  if (isLoading) return <p className="text-slate-400">Loading event...</p>
  if (isError || !event) return <p className="text-red-400">Event not found.</p>
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-8">
      <Link to="/" className="text-sm text-cyan-400">← Back to discovery</Link>
      <p className="mt-8 text-sm uppercase tracking-widest text-cyan-400">{event.category}</p>
      <h1 className="mt-2 text-4xl font-bold">{event.title}</h1>
      <p className="mt-5 whitespace-pre-wrap text-slate-300">{event.description || 'No description provided.'}</p>
      <div className="mt-8 grid gap-4 text-sm text-slate-300 md:grid-cols-2">
        <p><strong>When:</strong> {formatDate(event.date)}</p>
        <p><strong>Where:</strong> {event.venue}</p>
        <p><strong>Capacity:</strong> {event.capacity}</p>
      </div>
      <h2 className="mt-8 text-xl font-semibold">Price tiers</h2>
      <div className="mt-3 space-y-2">
        {event.priceTiers.map((tier) => <div key={tier.name} className="flex justify-between rounded-lg bg-slate-800 p-3"><span>{tier.name} · {tier.seatCount} seats</span><span>${tier.price.toFixed(2)}</span></div>)}
      </div>
      <Link to={`/attendee/events/${event._id}/seats`} className="mt-8 inline-block rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950">Select Seats</Link>
    </section>
  )
}

function OrganizerEvents() {
  const { data: events = [], isLoading, isError } = useMyEvents()
  const deleteEvent = useDeleteEvent()
  const updateEvent = useUpdateEvent()
  const publishEvent = usePublishEvent()

  function togglePublish(event) {
    if (event.status === 'published') updateEvent.mutate({ id: event._id, data: { ...event, status: 'draft' } })
    else publishEvent.mutate(event._id)
  }

  return (
    <section>
      <div className="mb-8 flex items-center justify-between gap-4">
        <div><p className="text-sm uppercase tracking-widest text-cyan-400">Organizer</p><h1 className="mt-2 text-3xl font-bold">Your events</h1></div>
        <Link to="/organizer/events/new" className="rounded-lg bg-cyan-400 px-4 py-3 font-semibold text-slate-950">New event</Link>
      </div>
      {isLoading && <p className="text-slate-400">Loading your events...</p>}
      {isError && <p className="text-red-400">Unable to load your events.</p>}
      {!isLoading && events.length === 0 && <p className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-slate-400">You have not created any events yet.</p>}
      <div className="space-y-4">
        {events.map((event) => (
          <div key={event._id} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h2 className="text-xl font-semibold">{event.title}</h2><p className="mt-1 text-sm text-slate-400">{formatDate(event.date)} · {event.capacity} seats</p></div>
              <span className="rounded-full bg-slate-800 px-3 py-1 text-xs capitalize">{event.status}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <Link className="rounded-lg border border-slate-700 px-3 py-2" to={`/organizer/events/${event._id}/edit`}>Edit</Link>
              <button disabled={publishEvent.isPending || updateEvent.isPending} className="rounded-lg border border-cyan-700 px-3 py-2 text-cyan-300 disabled:opacity-50" onClick={() => togglePublish(event)}>{event.status === 'published' ? 'Unpublish' : 'Publish'}</button>
              <button className="rounded-lg border border-red-900 px-3 py-2 text-red-300" onClick={() => { if (window.confirm('Delete this event?')) deleteEvent.mutate(event._id) }}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

const emptyEvent = { title: '', description: '', category: 'General', venue: '', date: '', capacity: 1, status: 'draft', priceTiers: [{ name: 'General', price: 0, seatCount: 1 }] }

function EventForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: events = [], isLoading } = useMyEvents()
  const existing = useMemo(() => events.find((event) => event._id === id), [events, id])
  const [form, setForm] = useState(emptyEvent)
  const [error, setError] = useState('')
  const createEvent = useCreateEvent()
  const updateEvent = useUpdateEvent()

  useEffect(() => {
    if (existing) setForm({ ...existing, date: new Date(existing.date).toISOString().slice(0, 16) })
  }, [existing])

  const totalSeats = form.priceTiers.reduce((sum, tier) => sum + Number(tier.seatCount || 0), 0)
  const mutation = id ? updateEvent : createEvent
  const pending = createEvent.isPending || updateEvent.isPending

  function updateTier(index, field, value) {
    setForm({ ...form, priceTiers: form.priceTiers.map((tier, tierIndex) => tierIndex === index ? { ...tier, [field]: value } : tier) })
  }

  function submit(event) {
    event.preventDefault()
    setError('')
    if (totalSeats !== Number(form.capacity)) {
      setError('Price tier seat counts must equal capacity.')
      return
    }
    const data = { ...form, capacity: Number(form.capacity), priceTiers: form.priceTiers.map((tier) => ({ ...tier, price: Number(tier.price), seatCount: Number(tier.seatCount) })) }
    const request = id ? { id, data } : data
    mutation.mutate(request, { onSuccess: () => navigate('/organizer/events') })
  }

  if (id && isLoading) return <p className="text-slate-400">Loading event...</p>
  if (id && !existing) return <p className="text-red-400">Event not found in your events.</p>

  return (
    <section className="mx-auto max-w-3xl">
      <p className="text-sm uppercase tracking-widest text-cyan-400">Organizer</p>
      <h1 className="mt-2 text-3xl font-bold">{id ? 'Edit event' : 'Create event'}</h1>
      <form className="mt-8 space-y-5 rounded-xl border border-slate-800 bg-slate-900 p-6" onSubmit={submit}>
        <input required className={inputClass} placeholder="Event title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
        <textarea className={inputClass} placeholder="Description" rows="4" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        <div className="grid gap-4 md:grid-cols-2">
          <select className={inputClass} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}><option>General</option><option>Music</option><option>Technology</option><option>Sports</option><option>Business</option></select>
          <input required className={inputClass} placeholder="Venue" value={form.venue} onChange={(event) => setForm({ ...form, venue: event.target.value })} />
          <input required className={inputClass} type="datetime-local" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
          <input required min="1" className={inputClass} type="number" placeholder="Capacity" value={form.capacity} onChange={(event) => setForm({ ...form, capacity: event.target.value })} />
        </div>
        <div>
          <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-semibold">Price tiers</h2><button type="button" className="text-sm text-cyan-300" onClick={() => setForm({ ...form, priceTiers: [...form.priceTiers, { name: '', price: 0, seatCount: 1 }] })}>+ Add tier</button></div>
          <div className="space-y-3">
            {form.priceTiers.map((tier, index) => <div key={index} className="grid gap-2 md:grid-cols-[1fr_120px_120px_auto]"><input required className={inputClass} placeholder="Tier name" value={tier.name} onChange={(event) => updateTier(index, 'name', event.target.value)} /><input required min="0" className={inputClass} type="number" placeholder="Price" value={tier.price} onChange={(event) => updateTier(index, 'price', event.target.value)} /><input required min="1" className={inputClass} type="number" placeholder="Seats" value={tier.seatCount} onChange={(event) => updateTier(index, 'seatCount', event.target.value)} /><button type="button" disabled={form.priceTiers.length === 1} className="rounded-lg px-3 text-red-300 disabled:opacity-30" onClick={() => setForm({ ...form, priceTiers: form.priceTiers.filter((_, tierIndex) => tierIndex !== index) })}>Remove</button></div>)}
          </div>
          <p className={`mt-3 text-sm ${totalSeats === Number(form.capacity) ? 'text-emerald-400' : 'text-amber-300'}`}>Tier seats: {totalSeats} / Capacity: {form.capacity}</p>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        {mutation.isError && <p className="text-sm text-red-400">{mutation.error.response?.data?.error || 'Unable to save event.'}</p>}
        <button disabled={pending || totalSeats !== Number(form.capacity)} className="rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 disabled:opacity-50">{pending ? 'Saving...' : 'Save event'}</button>
      </form>
    </section>
  )
}

function AuthForm({ mode }) {
  const isRegister = mode === 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'attendee' })
  const [error, setError] = useState('')
  const login = useAuthStore((state) => state.login)
  const navigate = useNavigate()
  async function submit(event) {
    event.preventDefault()
    setError('')
    try {
      const { data } = await api.post(`/auth/${mode}`, isRegister ? form : { email: form.email, password: form.password })
      login(data.user, data.token)
      navigate(data.user.role === 'organizer' ? '/organizer/dashboard' : '/attendee/discover', { replace: true })
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to complete the request.')
    }
  }
  return <section className="mx-auto max-w-md rounded-xl border border-slate-800 bg-slate-900 p-8"><h1 className="text-3xl font-bold">{isRegister ? 'Create your account' : 'Welcome back'}</h1><form className="mt-6 space-y-4" onSubmit={submit}>{isRegister && <input required placeholder="Full name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={inputClass} />}<input required type="email" placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className={inputClass} /><input required minLength={6} type="password" placeholder="Password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className={inputClass} />{isRegister && <div className="grid grid-cols-2 gap-3">{['attendee', 'organizer'].map((role) => <label key={role} className={`cursor-pointer rounded-lg border p-3 text-center capitalize ${form.role === role ? 'border-cyan-400 bg-cyan-400/10' : 'border-slate-700'}`}><input className="sr-only" type="radio" name="role" value={role} checked={form.role === role} onChange={(event) => setForm({ ...form, role: event.target.value })} />{role}</label>)}</div>}{error && <p className="text-sm text-red-400">{error}</p>}<button className="w-full rounded-lg bg-cyan-400 px-4 py-3 font-semibold text-slate-950">{isRegister ? 'Register' : 'Log in'}</button></form></section>
}

function Navigation() {
  const { user, logout } = useAuthStore()
  const location = useLocation()
  const authSwitchClass = location.pathname === '/register' ? 'auth-switch register-active' : 'auth-switch'
  return <nav className="site-nav"><Link className="brand" to="/"><span className="brand-mark">E</span>EventHub</Link><div className="nav-links"><Link className={location.pathname === '/' ? 'active' : ''} to="/">Discover</Link>{user?.role === 'organizer' && <Link to="/organizer/events">Manage events</Link>}</div><div className="nav-actions">{user ? <><span className="nav-user">{user.name}</span><button onClick={logout} className="nav-logout">Log out</button></> : <div className={authSwitchClass}><Link to="/login">Login</Link><Link to="/register">Create account</Link></div>}</div></nav>
}

function App() {
  return <div className="app-shell"><Navigation /><main><Routes><Route path="/" element={<Home />} /><Route path="/login" element={<AuthForm mode="login" />} /><Route path="/register" element={<AuthForm mode="register" />} /><Route path="/events/:id" element={<EventDetail />} /><Route path="/attendee/events/:eventId/seats" element={<ProtectedRoute allowedRoles={['attendee']}><SeatMap /></ProtectedRoute>} /><Route path="/organizer/*" element={<ProtectedRoute allowedRoles={['organizer']}><Routes><Route path="dashboard" element={<Navigate to="/organizer/events" replace />} /><Route path="events" element={<OrganizerEvents />} /><Route path="events/new" element={<EventForm />} /><Route path="events/:id/edit" element={<EventForm />} /><Route path="*" element={<Navigate to="events" replace />} /></Routes></ProtectedRoute>} /><Route path="/attendee/*" element={<ProtectedRoute allowedRoles={['attendee']}><Routes><Route path="discover" element={<EventDiscovery />} /><Route path="*" element={<Navigate to="discover" replace />} /></Routes></ProtectedRoute>} /></Routes></main></div>
}

export default App
