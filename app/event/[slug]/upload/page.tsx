'use client'

import { useParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

type PackageType = 'BASIC' | 'PREMIUM' | 'VIP'

type WeddingEvent = {
  id: number
  slug: string
  bride_name: string
  groom_name: string
  package_type: PackageType
}

export default function UploadPage() {
  const params = useParams()
  const slug = params.slug as string

  const [step, setStep] = useState(1)
  const [event, setEvent] = useState<WeddingEvent | null>(null)
  const [eventLoading, setEventLoading] = useState(true)
  const [guestName, setGuestName] = useState('')
  const [message, setMessage] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image')
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioPreview, setAudioPreview] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const packageType = event?.package_type || 'BASIC'
  const allowVideo = packageType === 'PREMIUM' || packageType === 'VIP'
  const allowAudio = packageType === 'VIP'

  const brideName = event?.bride_name ||
    (slug.split('-')[0]?.charAt(0).toUpperCase() + slug.split('-')[0]?.slice(1))
  const groomName = event?.groom_name ||
    slug.split('-').slice(1).join(' ').replace(/\b\w/g, (c) => c.toUpperCase())

  useEffect(() => { fetchEvent() }, [slug])

  async function fetchEvent() {
    setEventLoading(true)
    const { data, error } = await supabase
      .from('events').select('id, slug, bride_name, groom_name, package_type')
      .eq('slug', slug).single()
    if (!error && data) setEvent(data as WeddingEvent)
    setEventLoading(false)
  }

  const getSupportedMimeType = () => {
    if (typeof MediaRecorder === 'undefined') return ''
    if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4'
    if (MediaRecorder.isTypeSupported('audio/aac')) return 'audio/aac'
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus'
    if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm'
    return ''
  }
  const getAudioExtension = (type: string) => {
    if (type.includes('mp4')) return 'mp4'
    if (type.includes('aac')) return 'aac'
    if (type.includes('webm')) return 'webm'
    return 'mp4'
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return
    const isVideo = selectedFile.type.startsWith('video/')
    const isImage = selectedFile.type.startsWith('image/')
    if (!isImage && !isVideo) { alert('Please choose an image or video file.'); return }
    if (isVideo && !allowVideo) { alert('Video upload is only available for Premium and VIP packages.'); return }
    setFile(selectedFile)
    setMediaType(isVideo ? 'video' : 'image')
    setPreview(URL.createObjectURL(selectedFile))
  }

  const startRecording = async () => {
    try {
      if (!allowAudio) { alert('Voice message is only available for VIP package.'); return }
      if (!navigator.mediaDevices?.getUserMedia) { alert('Voice recording is not supported on this browser.'); return }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = getSupportedMimeType()
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      mediaRecorder.onstop = () => {
        const finalMimeType = mediaRecorder.mimeType || mimeType || 'audio/mp4'
        const blob = new Blob(audioChunksRef.current, { type: finalMimeType })
        setAudioBlob(blob)
        setAudioPreview(URL.createObjectURL(blob))
        stream.getTracks().forEach(t => t.stop())
      }
      mediaRecorder.start()
      setIsRecording(true)
    } catch { alert('Microphone permission denied or not supported.') }
  }

  const stopRecording = () => { mediaRecorderRef.current?.stop(); setIsRecording(false) }
  const removeAudio = () => { setAudioBlob(null); setAudioPreview(null) }

  const uploadAudioToSupabase = async () => {
    if (!audioBlob || !allowAudio) return null
    const extension = getAudioExtension(audioBlob.type)
    const safeGuestName = guestName.trim().replace(/\s+/g, '-').toLowerCase() || 'guest'
    const fileName = `${slug}/${Date.now()}-${safeGuestName}.${extension}`
    const { error } = await supabase.storage.from('audio').upload(fileName, audioBlob, { contentType: audioBlob.type || 'audio/mp4', upsert: false })
    if (error) throw error
    const { data } = supabase.storage.from('audio').getPublicUrl(fileName)
    return data.publicUrl
  }

  const handleUpload = async () => {
    if (!guestName || !file) { alert('Please enter your name and choose a file'); return }
    if (mediaType === 'video' && !allowVideo) { alert('Video upload is only available for Premium and VIP packages.'); return }
    try {
      setIsUploading(true)
      const audioUrl = await uploadAudioToSupabase()
      const formData = new FormData()
      formData.append('file', file)
      formData.append('slug', slug)
      formData.append('guestName', guestName)
      formData.append('message', message)
      formData.append('mediaType', mediaType)
      if (audioUrl) formData.append('audioUrl', audioUrl)
      const response = await fetch('/api/upload', { method: 'POST', body: formData })
      const result = await response.json()
      if (!response.ok) { alert(result.error || 'Upload failed'); return }
      alert('Memory uploaded successfully!')
      setGuestName(''); setMessage(''); setFile(null); setPreview(null)
      setMediaType('image'); setAudioBlob(null); setAudioPreview(null); setStep(1)
    } catch { alert('Upload failed') }
    finally { setIsUploading(false) }
  }

  // tip cards config
  const baseTips = [
    { icon: '📸', label: 'Selfie with\nthe couple' },
    { icon: '💍', label: 'Wedding\nceremony' },
    { icon: '🎉', label: 'Fun candid\nmoments' },
    { icon: '🥂', label: 'Reception\nmemories' },
  ]
  const videoTip = { icon: '🎥', label: 'Videos &\nboomerangs' }
  const audioTip = { icon: '🎙️', label: 'Voice message\nfor the couple' }
  const tips = [
    ...baseTips,
    ...(allowVideo ? [videoTip] : []),
    ...(allowAudio ? [audioTip] : []),
  ]

  if (eventLoading) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#F5EDE6', color:'#C4B4AC', fontFamily:"'DM Sans',sans-serif", fontSize:12, letterSpacing:'0.15em', textTransform:'uppercase' }}>
        Loading…
      </div>
    )
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; background: #F5EDE6; }

        /* ── Page ── */
        .page {
          min-height: 100vh;
          min-height: 100dvh;
          background: #F5EDE6;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          font-family: 'DM Sans', sans-serif;
          position: relative;
          overflow-x: hidden;
          padding: 0;
        }

        /* Warm radial top glow */
        .page::before {
          content: '';
          position: fixed;
          top: -10%;
          left: 50%;
          transform: translateX(-50%);
          width: 120vw;
          height: 70vh;
          background: radial-gradient(ellipse at 50% 0%, rgba(210,160,140,0.25) 0%, transparent 65%);
          pointer-events: none;
          z-index: 0;
        }

        /* ── Outer card shell (white rounded) ── */
        .shell {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 420px;
          min-height: 100dvh;
          background: #FAF4EF;
          border-radius: 0;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          overflow: hidden;
        }

        @media (min-width: 480px) {
          .page { justify-content: center; padding: 32px 20px; }
          .shell {
            min-height: auto;
            border-radius: 24px;
            box-shadow: 0 24px 80px rgba(80,40,20,0.18), 0 4px 16px rgba(80,40,20,0.08);
          }
        }

        /* ── Back button ── */
        .back-btn {
          position: absolute;
          top: 20px;
          left: 20px;
          width: 36px; height: 36px;
          border-radius: 50%;
          background: rgba(255,255,255,0.7);
          border: 1px solid rgba(196,168,152,0.25);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          font-size: 15px;
          color: #6B5248;
          transition: background 0.15s;
          z-index: 10;
          backdrop-filter: blur(8px);
        }
        .back-btn:hover { background: rgba(255,255,255,0.95); }

        /* ── Step dots ── */
        .step-dots {
          display: flex;
          justify-content: center;
          gap: 5px;
          padding-top: 28px;
          margin-bottom: 0;
        }
        .s-dot {
          width: 4px; height: 4px; border-radius: 50%;
          background: rgba(160,120,100,0.2);
          transition: all 0.3s;
        }
        .s-dot.active { background: #B87060; width: 18px; border-radius: 2px; }
        .s-dot.done   { background: rgba(184,112,96,0.4); }

        /* ── STEP 1 ── */
        .s1-wrap {
          display: flex; flex-direction: column;
          align-items: center;
          padding: 36px 32px 40px;
          flex: 1;
        }
        .s1-logo {
          font-size: 9px; font-weight: 600;
          letter-spacing: 0.3em; text-transform: uppercase;
          color: #C4A898; margin-bottom: 40px;
        }
        .s1-couple { text-align: center; margin-bottom: 28px; }
        .s1-bride {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(54px, 16vw, 68px);
          font-weight: 400; color: #2A1812;
          line-height: 0.9; letter-spacing: -0.03em; display: block;
        }
        .s1-amp {
          font-family: 'Cormorant Garamond', serif;
          font-style: italic; font-size: clamp(20px, 6vw, 26px);
          color: #B87060; display: block; margin: 6px 0 4px;
        }
        .s1-groom {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(54px, 16vw, 68px);
          font-weight: 400; font-style: italic; color: #B87060;
          line-height: 0.9; letter-spacing: -0.03em; display: block;
        }
        .s1-tagline {
          font-size: 10px; font-weight: 300;
          letter-spacing: 0.2em; text-transform: uppercase;
          color: #C4B0A4; text-align: center; margin-bottom: 52px;
        }

        /* ── STEP 2 — Name ── */
        .s2-wrap {
          display: flex; flex-direction: column;
          align-items: center;
          padding: 56px 32px 40px;
          flex: 1;
        }
        .question-label {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(34px, 10vw, 44px);
          font-weight: 400; color: #2A1812;
          text-align: center; line-height: 1.1;
          margin-bottom: 6px; letter-spacing: -0.01em;
        }
        .question-label em { font-style: italic; color: #B87060; }
        .question-sub {
          font-size: 12px; color: #C4B0A4;
          text-align: center; font-weight: 300;
          letter-spacing: 0.05em; margin-bottom: 44px;
        }
        .big-input {
          width: 100%; border: none;
          border-bottom: 1.5px solid rgba(184,112,96,0.25);
          background: transparent; text-align: center;
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(28px, 9vw, 38px);
          font-weight: 400; color: #2A1812;
          padding: 8px 0 14px; outline: none;
          transition: border-color 0.2s; margin-bottom: 44px;
        }
        .big-input::placeholder { color: rgba(184,152,136,0.4); font-style: italic; }
        .big-input:focus { border-bottom-color: #B87060; }

        /* ── STEP 3 — Capture guide ── */
        .s3-wrap {
          display: flex; flex-direction: column;
          align-items: stretch;
          padding: 0 0 32px;
          flex: 1;
        }

        /* Header section with warm gradient */
        .s3-header {
          background: linear-gradient(160deg, #D4A090 0%, #B87878 45%, #8B5A50 100%);
          padding: 52px 28px 36px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        /* Subtle radial highlight inside header */
        .s3-header::before {
          content: '';
          position: absolute;
          top: -30%; left: 50%; transform: translateX(-50%);
          width: 200%; height: 160%;
          background: radial-gradient(ellipse at 50% 30%, rgba(255,220,200,0.25) 0%, transparent 55%);
          pointer-events: none;
        }
        .s3-heart {
          font-size: 16px;
          display: block;
          margin-bottom: 12px;
          opacity: 0.7;
        }
        .s3-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(36px, 10vw, 48px);
          font-weight: 400;
          color: #FDF4EE;
          line-height: 1.0;
          letter-spacing: -0.02em;
          position: relative;
          z-index: 1;
        }
        .s3-title em {
          font-style: italic;
          color: rgba(255,235,220,0.85);
          display: block;
        }

        /* Body of step 3 */
        .s3-body {
          padding: 28px 24px 0;
        }

        .s3-subtitle {
          font-size: 12px; font-weight: 300;
          color: #A09088; text-align: center;
          letter-spacing: 0.04em; margin-bottom: 24px;
          line-height: 1.6;
        }

        /* Tip grid */
        .tip-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 10px;
          margin-bottom: 32px;
        }

        .tip-card {
          border-radius: 14px;
          aspect-ratio: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 8px;
          cursor: default;
          position: relative;
          overflow: hidden;
        }
        /* alternating warm card backgrounds */
        .tip-card:nth-child(1) { background: linear-gradient(145deg, #C49080 0%, #8B5A48 100%); }
        .tip-card:nth-child(2) { background: linear-gradient(145deg, #B88070 0%, #7A4A3A 100%); }
        .tip-card:nth-child(3) { background: linear-gradient(145deg, #C09878 0%, #8A6040 100%); }
        .tip-card:nth-child(4) { background: linear-gradient(145deg, #B07868 0%, #7A4838 100%); }
        .tip-card:nth-child(5) { background: linear-gradient(145deg, #C48870 0%, #8B5842 100%); }
        .tip-card:nth-child(6) { background: linear-gradient(145deg, #B08878 0%, #7A5848 100%); }

        /* Inner highlight on cards */
        .tip-card::before {
          content: '';
          position: absolute;
          top: -40%; left: -30%;
          width: 100%; height: 80%;
          background: radial-gradient(ellipse, rgba(255,220,200,0.22) 0%, transparent 65%);
          pointer-events: none;
        }

        .tip-icon-wrap {
          width: 36px; height: 36px;
          border-radius: 50%;
          background: rgba(0,0,0,0.2);
          display: flex; align-items: center; justify-content: center;
          font-size: 17px;
          position: relative; z-index: 1;
          flex-shrink: 0;
        }

        .tip-label {
          font-family: 'DM Sans', sans-serif;
          font-size: 10px;
          font-weight: 500;
          color: rgba(255,240,230,0.9);
          text-align: center;
          line-height: 1.3;
          letter-spacing: 0.01em;
          position: relative; z-index: 1;
          white-space: pre-line;
        }

        /* ── STEP 4 — Upload form ── */
        .s4-wrap {
          display: flex; flex-direction: column;
          align-items: center;
          padding: 56px 28px 40px;
          flex: 1;
        }
        .s4-header {
          text-align: center; margin-bottom: 32px;
        }
        .s4-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(28px, 8vw, 36px);
          font-weight: 400; color: #2A1812; line-height: 1.1;
        }
        .s4-title em { font-style: italic; color: #B87060; }
        .s4-sub { font-size: 12px; color: #C4B0A4; margin-top: 4px; font-weight: 300; }

        .pkg-badge {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 4px 12px; border-radius: 999px;
          border: 1px solid rgba(184,112,96,0.3);
          background: rgba(184,112,96,0.07);
          color: #B87060;
          font-size: 9px; font-weight: 600;
          letter-spacing: 0.16em; text-transform: uppercase;
          margin-bottom: 32px;
        }

        .field-label {
          font-size: 9px; font-weight: 600;
          letter-spacing: 0.22em; text-transform: uppercase;
          color: #C4A898; margin-bottom: 10px; display: block; text-align: center;
        }
        .opt { color: #D4C4BC; font-weight: 300; text-transform: none; letter-spacing: 0; font-size: 10px; }

        .upload-zone {
          width: 100%;
          border: 1.5px dashed rgba(184,112,96,0.3);
          border-radius: 8px;
          padding: 28px 20px;
          text-align: center;
          cursor: pointer;
          background: rgba(255,255,255,0.5);
          margin-bottom: 24px;
          transition: border-color 0.2s, background 0.2s;
          position: relative;
        }
        .upload-zone:hover { border-color: #B87060; background: rgba(255,255,255,0.8); }
        .upload-zone input[type="file"] {
          position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%;
        }
        .upload-icon { font-size: 26px; display: block; margin-bottom: 8px; opacity: 0.55; }
        .upload-zone-text { font-size: 12px; color: #B09088; font-weight: 400; letter-spacing: 0.04em; }
        .upload-zone-sub { font-size: 10px; color: #C8B8B0; margin-top: 4px; letter-spacing: 0.08em; text-transform: uppercase; }

        .preview-img { width: 100%; height: 200px; object-fit: cover; border-radius: 8px; display: block; margin-bottom: 24px; }
        .preview-video { width: 100%; max-height: 220px; border-radius: 8px; background: #000; display: block; margin-bottom: 24px; }

        .msg-input {
          width: 100%; border: none;
          border-bottom: 1px solid rgba(184,112,96,0.2);
          background: transparent;
          font-family: 'Cormorant Garamond', serif;
          font-size: 17px; font-weight: 300; color: #2A1812;
          padding: 6px 0 12px; outline: none; resize: none;
          transition: border-color 0.2s; margin-bottom: 32px; text-align: center;
        }
        .msg-input::placeholder { color: rgba(184,152,136,0.4); font-style: italic; }
        .msg-input:focus { border-bottom-color: #B87060; }

        /* ── Buttons ── */
        .btn-main {
          width: 100%; padding: 16px 24px;
          background: #B87060;
          color: #FDF4EE; border: none; border-radius: 8px;
          font-family: 'DM Sans', sans-serif;
          font-size: 11px; font-weight: 700;
          letter-spacing: 0.2em; text-transform: uppercase;
          cursor: pointer; transition: background 0.2s, transform 0.1s;
          margin-bottom: 10px;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .btn-main:hover:not(:disabled) { background: #A06050; }
        .btn-main:active:not(:disabled) { transform: scale(0.99); }
        .btn-main:disabled { background: #D4B4A8; cursor: not-allowed; }

        .btn-text {
          width: 100%; padding: 12px 24px;
          background: transparent; color: #C4A898; border: none;
          font-family: 'DM Sans', sans-serif;
          font-size: 10px; font-weight: 500;
          letter-spacing: 0.2em; text-transform: uppercase;
          cursor: pointer; transition: color 0.2s;
        }
        .btn-text:hover { color: #2A1812; }

        .btn-record {
          width: 100%; padding: 13px 24px;
          background: transparent; color: #B09088;
          border: 1px solid rgba(184,112,96,0.25); border-radius: 8px;
          font-family: 'DM Sans', sans-serif;
          font-size: 10px; font-weight: 600;
          letter-spacing: 0.18em; text-transform: uppercase;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: all 0.2s; margin-bottom: 10px;
        }
        .btn-record:hover { border-color: #B87060; color: #B87060; }

        .btn-stop {
          width: 100%; padding: 13px 24px;
          background: rgba(184,112,96,0.1); color: #B87060;
          border: 1px solid rgba(184,112,96,0.3); border-radius: 8px;
          font-family: 'DM Sans', sans-serif;
          font-size: 10px; font-weight: 700;
          letter-spacing: 0.18em; text-transform: uppercase;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          animation: pulse-soft 2s infinite; margin-bottom: 10px;
        }
        @keyframes pulse-soft {
          0%,100% { box-shadow: 0 0 0 0 rgba(184,112,96,0.15); }
          50%      { box-shadow: 0 0 0 8px rgba(184,112,96,0); }
        }
        .rec-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: #B87060; flex-shrink: 0;
          animation: blink 1s infinite;
        }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }

        audio { width: 100%; margin-bottom: 10px; }

        /* Top floral */
        .top-floral {
          position: fixed; top: 0; left: 50%; transform: translateX(-50%);
          pointer-events: none; z-index: 0; width: 300px;
        }
      `}</style>

      {/* Top floral SVG */}
      <svg className="top-floral" viewBox="0 0 320 130" xmlns="http://www.w3.org/2000/svg">
        <g fill="none" stroke="rgba(184,120,96,0.2)" strokeWidth="0.9">
          <path d="M 160 130 Q 158 75 162 25" />
          <path d="M 160 85 Q 118 65 88 38" />
          <path d="M 160 65 Q 108 50 72 22" />
          <path d="M 160 105 Q 128 90 102 70" />
          <path d="M 160 85 Q 202 65 232 38" />
          <path d="M 160 65 Q 212 50 248 22" />
          <path d="M 160 105 Q 192 90 218 70" />
          <ellipse cx="86" cy="36" rx="14" ry="6" transform="rotate(-45 86 36)" />
          <ellipse cx="70" cy="20" rx="11" ry="5" transform="rotate(-55 70 20)" />
          <ellipse cx="100" cy="68" rx="10" ry="5" transform="rotate(-30 100 68)" />
          <ellipse cx="234" cy="36" rx="14" ry="6" transform="rotate(45 234 36)" />
          <ellipse cx="250" cy="20" rx="11" ry="5" transform="rotate(55 250 20)" />
          <ellipse cx="220" cy="68" rx="10" ry="5" transform="rotate(30 220 68)" />
          <circle cx="161" cy="22" r="4.5" />
          <circle cx="161" cy="22" r="8" strokeDasharray="2 3" />
          <circle cx="154" cy="14" r="2" />
          <circle cx="168" cy="14" r="2" />
        </g>
      </svg>

      <div className="page">
        <div className="shell">

          {/* Back button (hidden on step 1) */}
          {step > 1 && (
            <button className="back-btn" onClick={() => setStep(s => Math.max(1, s - 1))}>
              ←
            </button>
          )}

          {/* Step dots */}
          <div className="step-dots">
            {[1,2,3,4].map(n => (
              <div key={n} className={`s-dot${step===n?' active':step>n?' done':''}`} />
            ))}
          </div>

          {/* ══ STEP 1 — Welcome ══ */}
          {step === 1 && (
            <div className="s1-wrap">
              <p className="s1-logo">Guest Gallery</p>
              <div className="s1-couple">
                <span className="s1-bride">{brideName}</span>
                <span className="s1-amp">&</span>
                <span className="s1-groom">{groomName}</span>
              </div>
              <p className="s1-tagline">Capture · Share · Remember</p>
              <button className="btn-main" onClick={() => setStep(2)}>
                Start →
              </button>
            </div>
          )}

          {/* ══ STEP 2 — Name ══ */}
          {step === 2 && (
            <div className="s2-wrap">
              <p className="question-label">What's your<br /><em>name?</em></p>
              <p className="question-sub">So we know who captured this moment</p>
              <input
                type="text"
                placeholder="Your name…"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="big-input"
                autoFocus
              />
              <button className="btn-main" onClick={() => { if (!guestName.trim()) { alert('Please enter your name'); return } setStep(3) }}>
                Continue →
              </button>
              <button className="btn-text" onClick={() => setStep(1)}>Back</button>
            </div>
          )}

          {/* ══ STEP 3 — Capture guide (grid cards) ══ */}
          {step === 3 && (
            <div className="s3-wrap">
              {/* Warm gradient header */}
              <div className="s3-header">
                <span className="s3-heart">♡</span>
                <h2 className="s3-title">
                  Capture
                  <em>the moments</em>
                </h2>
              </div>

              <div className="s3-body">
                <p className="s3-subtitle">
                  Here are some ideas for the beautiful<br />memories you can share.
                </p>

                {/* Tip cards grid */}
                <div className="tip-grid">
                  {tips.map((tip, i) => (
                    <div key={i} className="tip-card">
                      <div className="tip-icon-wrap">{tip.icon}</div>
                      <span className="tip-label">{tip.label}</span>
                    </div>
                  ))}
                </div>

                <button className="btn-main" onClick={() => setStep(4)}>
                  Continue →
                </button>
                <button className="btn-text" onClick={() => setStep(2)}>Back</button>
              </div>
            </div>
          )}

          {/* ══ STEP 4 — Upload form ══ */}
          {step === 4 && (
            <div className="s4-wrap">
              <div className="s4-header">
                <div className="s4-title">
                  Share your<br /><em>memory</em>
                </div>
                <p className="s4-sub">with {brideName} & {groomName}</p>
              </div>

              <span className="pkg-badge">{packageType} Package</span>

              {/* File upload */}
              <div style={{width:'100%', marginBottom:8}}>
                <label className="field-label">{allowVideo ? 'Photo or Video' : 'Photo'}</label>
                <div className="upload-zone">
                  <input type="file" accept={allowVideo ? 'image/*,video/*' : 'image/*'} onChange={handleFileChange} />
                  {!preview ? (
                    <>
                      <span className="upload-icon">📷</span>
                      <p className="upload-zone-text">Tap to choose a photo{allowVideo ? ' or video' : ''}</p>
                      <p className="upload-zone-sub">{packageType === 'BASIC' ? 'Photo only' : packageType === 'PREMIUM' ? 'Photo & video' : 'Photo, video & voice'}</p>
                    </>
                  ) : (
                    <p className="upload-zone-text" style={{color:'#B87060'}}>✓ Selected — tap to change</p>
                  )}
                </div>
              </div>

              {preview && mediaType === 'image' && <img src={preview} alt="Preview" className="preview-img" />}
              {preview && mediaType === 'video' && <video src={preview} controls playsInline className="preview-video" />}

              <div style={{width:'100%'}}>
                <label className="field-label">Message <span className="opt">(optional)</span></label>
                <textarea
                  placeholder="Wishing you both a lifetime of happiness…"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  className="msg-input"
                />
              </div>

              {allowAudio && (
                <div style={{width:'100%', marginBottom:24}}>
                  <label className="field-label">Voice Message <span className="opt">(optional)</span></label>
                  {!isRecording ? (
                    <button type="button" onClick={startRecording} className="btn-record">
                      🎙️ Record Voice Message
                    </button>
                  ) : (
                    <button type="button" onClick={stopRecording} className="btn-stop">
                      <span className="rec-dot" /> Stop Recording
                    </button>
                  )}
                  {audioPreview && (
                    <>
                      <audio controls src={audioPreview} />
                      <button type="button" onClick={removeAudio} className="btn-text" style={{marginTop:0}}>Remove voice message</button>
                    </>
                  )}
                </div>
              )}

              <button onClick={handleUpload} disabled={isUploading || isRecording} className="btn-main">
                {isUploading ? 'Uploading…' : 'Upload Memory'}
              </button>
              <button onClick={() => setStep(3)} className="btn-text">Back</button>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
