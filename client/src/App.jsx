import { useEffect, useState } from 'react'
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import api from './api/axios'
import ProtectedRoute from './components/ProtectedRoute'
import { useAuthStore } from './store/authStore'

function Portal({ title, description }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-8">
      <p className="text-sm font-medium uppercase tracking-widest text-cyan-400">Portal</p>
      <h1 className="mt-3 text-3xl font-bold">{title}</h1>
      <p className="mt-3 text-slate-400">{description}</p>
    </section>
  )
}

function Home() {
  const [status, setStatus] = useState('Checking backend...')
  useEffect(() => {
    api.get('/health')
      .then(({ data }) => setStatus(`Backend: ${data.status}`))
      .catch(() => setStatus('Backend unavailable - start the server to connect.'))
  }, [])

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-8">
      <p className="text-sm font-medium uppercase tracking-widest text-cyan-400">EventHub</p>
      <h1 className="mt-3 text-4xl font-bold">Plan and discover better events.</h1>
      <p className="mt-3 max-w-xl text-slate-400">Create an account to access your attendee or organizer portal.</p>
      <p className="mt-6 inline-flex rounded-lg bg-slate-800 px-4 py-2 text-sm">{status}</p>
    </section>
  )
}

function AuthForm({ mode }) {
  const isRegister = mode === 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'attendee' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const login = useAuthStore((state) => state.login)
  const navigate = useNavigate()

  async function submit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const { data } = await api.post(`/auth/${mode}`, isRegister ? form : {
        email: form.email,
        password: form.password,
      })
      login(data.user, data.token)
      navigate(data.user.role === 'organizer' ? '/organizer/dashboard' : '/attendee/discover', { replace: true })
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to complete the request.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="mx-auto max-w-md rounded-xl border border-slate-800 bg-slate-900 p-8">
      <h1 className="text-3xl font-bold">{isRegister ? 'Create your account' : 'Welcome back'}</h1>
      <p className="mt-2 text-sm text-slate-400">
        {isRegister ? 'Your role determines which portal you can access.' : 'Log in to continue to your portal.'}
      </p>
      <form className="mt-6 space-y-4" onSubmit={submit}>
        {isRegister && <input required placeholder="Full name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="w-full rounded-lg bg-slate-800 px-4 py-3 outline-none ring-cyan-400 focus:ring-2" />}
        <input required type="email" placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="w-full rounded-lg bg-slate-800 px-4 py-3 outline-none ring-cyan-400 focus:ring-2" />
        <input required minLength={6} type="password" placeholder="Password (at least 6 characters)" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="w-full rounded-lg bg-slate-800 px-4 py-3 outline-none ring-cyan-400 focus:ring-2" />
        {isRegister && (
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-slate-300">Choose your permanent account role</legend>
            <div className="grid grid-cols-2 gap-3">
              {['attendee', 'organizer'].map((role) => (
                <label key={role} className={`cursor-pointer rounded-lg border p-3 text-center capitalize ${form.role === role ? 'border-cyan-400 bg-cyan-400/10' : 'border-slate-700'}`}>
                  <input className="sr-only" type="radio" name="role" value={role} checked={form.role === role} onChange={(event) => setForm({ ...form, role: event.target.value })} />
                  {role}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button disabled={submitting} className="w-full rounded-lg bg-cyan-400 px-4 py-3 font-semibold text-slate-950 disabled:opacity-50">
          {submitting ? 'Please wait...' : isRegister ? 'Register' : 'Log in'}
        </button>
      </form>
    </section>
  )
}

function Navigation() {
  const { user, logout } = useAuthStore()
  const location = useLocation()
  return (
    <nav className="mb-10 flex items-center justify-between">
      <Link className="text-xl font-bold text-cyan-400" to="/">EventHub</Link>
      <div className="flex items-center gap-4 text-sm text-slate-300">
        {user ? (
          <>
            <Link to={user.role === 'organizer' ? '/organizer/dashboard' : '/attendee/discover'}>{user.role} portal</Link>
            <span className="text-slate-500">{user.name}</span>
            <button onClick={logout} className="text-red-300">Log out</button>
          </>
        ) : (
          <>
            {location.pathname !== '/login' && <Link to="/login">Login</Link>}
            {location.pathname !== '/register' && <Link to="/register">Register</Link>}
          </>
        )}
      </div>
    </nav>
  )
}

function App() {
  return (
    <div className="mx-auto min-h-screen max-w-5xl px-6 py-8">
      <Navigation />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<AuthForm mode="login" />} />
        <Route path="/register" element={<AuthForm mode="register" />} />
        <Route path="/organizer/*" element={<ProtectedRoute allowedRoles={['organizer']}><Routes><Route path="dashboard" element={<Portal title="Organizer dashboard" description="Create and manage your events here." />} /><Route path="*" element={<Navigate to="dashboard" replace />} /></Routes></ProtectedRoute>} />
        <Route path="/attendee/*" element={<ProtectedRoute allowedRoles={['attendee']}><Routes><Route path="discover" element={<Portal title="Discover events" description="Find your next experience here." />} /><Route path="*" element={<Navigate to="discover" replace />} /></Routes></ProtectedRoute>} />
      </Routes>
    </div>
  )
}

export default App
