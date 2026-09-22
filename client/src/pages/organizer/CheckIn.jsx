import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../../api/axios'
import { socket } from '../../sockets/socket'

export default function CheckIn() {
  const { eventId } = useParams()
  const scannerRef = useRef(null)
  const submittingRef = useRef(false)
  const scanningRef = useRef(false)
  const [scanning, setScanning] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [checkedInCount, setCheckedInCount] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [cameras, setCameras] = useState([])
  const [selectedCameraId, setSelectedCameraId] = useState('')

  useEffect(() => {
    socket.emit('join-event', eventId)
    const handleUpdate = ({ checkedInCount: count }) => setCheckedInCount(count)
    socket.on('checkin-update', handleUpdate)
    return () => {
      socket.emit('leave-event', eventId)
      socket.off('checkin-update', handleUpdate)
    }
  }, [eventId])

  useEffect(() => {
    scanningRef.current = scanning
  }, [scanning])

  const submitToken = useCallback(async (token) => {
    if (submittingRef.current || !token.trim()) return
    submittingRef.current = true
    setSubmitting(true)
    setError('')
    try {
      if (scannerRef.current) await scannerRef.current.pause(true)
      const response = await api.post('/checkin', { qrToken: token.trim() })
      setResult(response.data)
      setCheckedInCount(response.data.checkedInCount)
      setManualCode('')
    } catch (requestError) {
      setResult(null)
      setError(requestError.response?.data?.error || 'Check-in failed')
    } finally {
      submittingRef.current = false
      setSubmitting(false)
      if (scannerRef.current && scanningRef.current) setTimeout(() => scannerRef.current?.resume(), 700)
    }
  }, [])

  const refreshCameras = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera API unavailable')
      const permissionStream = await navigator.mediaDevices.getUserMedia({ video: true })
      permissionStream.getTracks().forEach((track) => track.stop())
      const availableCameras = await Html5Qrcode.getCameras()
      if (!availableCameras.length) throw new Error('No camera found')
      setCameras(availableCameras)
      setSelectedCameraId((current) => {
        if (availableCameras.some((camera) => camera.id === current)) return current
        const rearCamera = availableCameras.find((camera) => /back|rear|environment/i.test(camera.label))
        return (rearCamera || availableCameras[0]).id
      })
      setError('')
    } catch {
      setError('Unable to list cameras. Allow camera permission, connect a camera, or use manual entry instead.')
    }
  }, [])

  useEffect(() => {
    if (!scanning) {
      setCameras([])
      setSelectedCameraId('')
      return undefined
    }

    refreshCameras()

    return undefined
  }, [scanning, refreshCameras])

  useEffect(() => {
    if (!scanning || !selectedCameraId) return undefined
    const scanner = new Html5Qrcode('qr-reader')
    scannerRef.current = scanner
    let active = true
    let started = false

    const clearScanner = () => {
      try {
        scanner.clear()
      } catch {
        // Cleanup is best effort when camera startup did not complete.
      }
    }

    const stopAndClear = () => {
      if (!started) {
        clearScanner()
        return
      }
      scanner.stop().then(clearScanner).catch(clearScanner)
    }

    async function startScanner() {
      try {
        const size = (viewfinderWidth, viewfinderHeight) => {
          const scanSize = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.8)
          return { width: Math.min(scanSize, 420), height: Math.min(scanSize, 420) }
        }

        await scanner.start(
          selectedCameraId,
          {
            fps: 15,
            qrbox: size,
            disableFlip: false,
            formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
          },
          (decodedText) => submitToken(decodedText)
        )
        started = true
        if (!active) scanner.stop().then(clearScanner).catch(clearScanner)
      } catch {
        if (!active) return
        setError('Unable to start the camera. Allow camera permission or use manual entry instead.')
        setScanning(false)
      }
    }

    startScanner()
    return () => {
      active = false
      stopAndClear()
      scannerRef.current = null
    }
  }, [scanning, selectedCameraId, submitToken])

  return <section className="mx-auto max-w-2xl">
    <Link className="text-sm text-orange-300" to={`/organizer/events/${eventId}/dashboard`}>← Back to dashboard</Link>
    <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
      <p className="text-sm uppercase tracking-widest text-orange-300">Organizer check-in</p>
      <h1 className="mt-2 text-3xl font-bold">Scan attendee tickets</h1>
      <p className="mt-2 text-slate-400">Checked in live: <span className="font-semibold text-cyan-300">{checkedInCount}</span></p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button onClick={() => setScanning((current) => !current)} className="rounded-lg bg-cyan-400 px-4 py-3 font-semibold text-slate-950">{scanning ? 'Stop camera' : 'Start camera scanner'}</button>
      </div>
      {scanning && <div className="mt-4">
        <div className="flex items-center justify-between gap-3"><label className="text-sm text-slate-300" htmlFor="camera-select">Available cameras ({cameras.length})</label><button type="button" onClick={refreshCameras} className="text-xs text-orange-200 underline">Refresh list</button></div>
        {cameras.length > 0 ? <select id="camera-select" className="mt-2 w-full rounded-lg bg-slate-800 px-4 py-3 outline-none ring-cyan-400 focus:ring-2" value={selectedCameraId} onChange={(event) => setSelectedCameraId(event.target.value)}>
          {cameras.map((camera, index) => <option key={camera.id} value={camera.id}>{camera.label || `Camera ${index + 1}`}</option>)}
        </select> : <p className="mt-2 text-sm text-amber-200">No cameras listed yet. Allow permission and refresh the list.</p>}
      </div>}
      {scanning && <div><div id="qr-reader" className="mt-5 max-w-lg overflow-hidden rounded-lg bg-slate-800" /><p className="mt-2 text-xs text-slate-400">Use the rear camera, keep the QR code inside the frame, and hold it about 15–30 cm away.</p></div>}
      <form className="mt-6 space-y-3" onSubmit={(event) => { event.preventDefault(); submitToken(manualCode) }}>
        <label className="text-sm text-slate-300" htmlFor="manual-qr">Or paste the full QR token</label>
        <textarea id="manual-qr" className="w-full rounded-lg bg-slate-800 px-4 py-3 outline-none ring-cyan-400 focus:ring-2" rows="3" value={manualCode} onChange={(event) => setManualCode(event.target.value)} placeholder="Paste or type QR token" />
        <button disabled={!manualCode.trim() || submitting} className="rounded-lg border border-orange-300/50 px-4 py-2 text-orange-200 disabled:opacity-50">{submitting ? 'Checking...' : 'Check in manually'}</button>
      </form>
      {result && <div className="mt-5 rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-4 text-emerald-200"><p className="font-semibold">Checked in successfully</p><p className="mt-1">{result.attendeeName} · Seat {result.seatLabel} · {result.tier}</p><p className="mt-1 text-sm">Live count: {result.checkedInCount}</p></div>}
      {error && <p className="mt-5 rounded-lg border border-red-400/30 bg-red-400/10 p-4 text-red-200">{error}</p>}
    </div>
  </section>
}
