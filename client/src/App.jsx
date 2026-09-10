import { useEffect, useState } from 'react'
import axios from 'axios'
import { Link, Route, Routes } from 'react-router-dom'

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function Placeholder({ title }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-8">
      <h1 className="text-3xl font-semibold">{title}</h1>
      <p className="mt-3 text-slate-400">This area is ready for the next project day.</p>
    </section>
  )
}

function Home() {
  const [status, setStatus] = useState('Checking backend...')

  useEffect(() => {
    axios
      .get(`${apiUrl}/health`)
      .then(({ data }) => setStatus(`Backend: ${data.status}`))
      .catch(() => setStatus('Backend unavailable - start the server to connect.'))
  }, [])

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-8">
      <p className="text-sm font-medium uppercase tracking-widest text-cyan-400">Day 1 skeleton</p>
      <h1 className="mt-3 text-4xl font-bold">Welcome to EventHub</h1>
      <p className="mt-3 max-w-xl text-slate-400">
        The frontend, backend, Socket.IO, and MongoDB connection points are ready.
      </p>
      <p className="mt-6 inline-flex rounded-lg bg-slate-800 px-4 py-2 text-sm">{status}</p>
    </section>
  )
}

function App() {
  return (
    <div className="mx-auto min-h-screen max-w-5xl px-6 py-8">
      <nav className="mb-10 flex items-center justify-between">
        <Link className="text-xl font-bold text-cyan-400" to="/">EventHub</Link>
        <div className="flex gap-4 text-sm text-slate-300">
          <Link to="/login">Login</Link>
          <Link to="/register">Register</Link>
        </div>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Placeholder title="Login" />} />
        <Route path="/register" element={<Placeholder title="Register" />} />
        <Route path="/organizer/*" element={<Placeholder title="Organizer dashboard" />} />
        <Route path="/attendee/*" element={<Placeholder title="Attendee dashboard" />} />
      </Routes>
    </div>
  )
}

export default App
