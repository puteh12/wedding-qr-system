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

  const slugParts = slug.split('-')
  const brideName =
    event?.bride_name ||
    (slugParts[0]
      ? slugParts[0].charAt(0).toUpperCase() + slugParts[0].slice(1)
      : 'Bride')
  const groomName =
    event?.groom_name ||
    slugParts
      .slice(1)
      .join(' ')
      .replace(/\b\w/g, (character) => character.toUpperCase()) ||
    'Groom'

  useEffect(() => {
    void fetchEvent()
  }, [slug])

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
      if (audioPreview) URL.revokeObjectURL(audioPreview)
    }
  }, [preview, audioPreview])

  async function fetchEvent() {
    setEventLoading(true)

    const { data, error } = await supabase
      .from('events')
      .select('id, slug, bride_name, groom_name, package_type')
      .eq('slug', slug)
      .single()

    if (error) {
      console.error('FETCH_EVENT_ERROR:', error)
    } else if (data) {
      setEvent(data as WeddingEvent)
    }

    setEventLoading(false)
  }

  const getSupportedMimeType = () => {
    if (typeof MediaRecorder === 'undefined') return ''
    if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4'
    if (MediaRecorder.isTypeSupported('audio/aac')) return 'audio/aac'
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      return 'audio/webm;codecs=opus'
    }
    if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm'
    return ''
  }

  const getAudioExtension = (type: string) => {
    if (type.includes('mp4')) return 'mp4'
    if (type.includes('aac')) return 'aac'
    if (type.includes('webm')) return 'webm'
    return 'mp4'
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return

    const isVideo = selectedFile.type.startsWith('video/')
    const isImage = selectedFile.type.startsWith('image/')

    if (!isImage && !isVideo) {
      alert('Please choose an image or video file.')
      event.target.value = ''
      return
    }

    if (isVideo && !allowVideo) {
      alert('Video upload is only available for Premium and VIP packages.')
      event.target.value = ''
      return
    }

    if (preview) URL.revokeObjectURL(preview)

    setFile(selectedFile)
    setMediaType(isVideo ? 'video' : 'image')
    setPreview(URL.createObjectURL(selectedFile))
  }

  const startRecording = async () => {
    try {
      if (!allowAudio) {
        alert('Voice message is only available for VIP package.')
        return
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        alert('Voice recording is not supported on this browser.')
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = getSupportedMimeType()
      const mediaRecorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      )

      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (recordingEvent) => {
        if (recordingEvent.data.size > 0) {
          audioChunksRef.current.push(recordingEvent.data)
        }
      }

      mediaRecorder.onstop = () => {
        const finalMimeType = mediaRecorder.mimeType || mimeType || 'audio/mp4'
        const blob = new Blob(audioChunksRef.current, { type: finalMimeType })

        if (audioPreview) URL.revokeObjectURL(audioPreview)

        setAudioBlob(blob)
        setAudioPreview(URL.createObjectURL(blob))
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error('RECORDING_ERROR:', error)
      alert('Microphone permission denied or not supported.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
  }

  const removeAudio = () => {
    if (audioPreview) URL.revokeObjectURL(audioPreview)
    setAudioBlob(null)
    setAudioPreview(null)
  }

  const uploadAudioToSupabase = async () => {
    if (!audioBlob || !allowAudio) return null

    const extension = getAudioExtension(audioBlob.type)
    const safeGuestName =
      guestName.trim().replace(/\s+/g, '-').toLowerCase() || 'guest'
    const fileName = `${slug}/${Date.now()}-${safeGuestName}.${extension}`

    const { error } = await supabase.storage.from('audio').upload(
      fileName,
      audioBlob,
      {
        contentType: audioBlob.type || 'audio/mp4',
        upsert: false,
      }
    )

    if (error) throw error

    const { data } = supabase.storage.from('audio').getPublicUrl(fileName)
    return data.publicUrl
  }

  const resetForm = () => {
    if (preview) URL.revokeObjectURL(preview)
    if (audioPreview) URL.revokeObjectURL(audioPreview)

    setGuestName('')
    setMessage('')
    setFile(null)
    setPreview(null)
    setMediaType('image')
    setAudioBlob(null)
    setAudioPreview(null)
    setStep(1)
  }

  const handleUpload = async () => {
    if (!guestName.trim() || !file) {
      alert('Please enter your name and choose a file')
      return
    }

    if (mediaType === 'video' && !allowVideo) {
      alert('Video upload is only available for Premium and VIP packages.')
      return
    }

    try {
      setIsUploading(true)

      const audioUrl = await uploadAudioToSupabase()
      const formData = new FormData()

      formData.append('file', file)
      formData.append('slug', slug)
      formData.append('guestName', guestName.trim())
      formData.append('message', message.trim())
      formData.append('mediaType', mediaType)
      if (audioUrl) formData.append('audioUrl', audioUrl)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        alert(result.error || 'Upload failed')
        return
      }

      alert('Memory uploaded successfully!')
      resetForm()
    } catch (error) {
      console.error('UPLOAD_ERROR:', error)
      alert('Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

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
    return <div className="loading-screen">Loading…</div>
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500&family=DM+Sans:wght@300;400;500;600&display=swap');

        html,
        body {
          min-height: 100%;
          height: auto !important;
          overflow-x: hidden !important;
          overflow-y: auto !important;
          background: #f5ede6;
        }

        body {
          margin: 0;
        }

        * {
          box-sizing: border-box;
        }

        button,
        input,
        textarea {
          font: inherit;
        }

        .loading-screen {
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f5ede6;
          color: #c4b4ac;
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }

        .page {
          width: 100%;
          min-height: 100vh;
          min-height: 100dvh;
          background: #f5ede6;
          display: flex;
          justify-content: flex-start;
          align-items: center;
          flex-direction: column;
          position: relative;
          font-family: 'DM Sans', sans-serif;
          overflow: visible;
        }

        .page::before {
          content: '';
          position: fixed;
          top: -10%;
          left: 50%;
          width: 120vw;
          height: 70vh;
          transform: translateX(-50%);
          background: radial-gradient(
            ellipse at 50% 0%,
            rgba(210, 160, 140, 0.25) 0%,
            transparent 65%
          );
          pointer-events: none;
          z-index: 0;
        }

        .shell {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 420px;
          min-height: 100vh;
          min-height: 100dvh;
          background: #faf4ef;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          overflow: visible;
        }

        .top-floral {
          position: fixed;
          top: 0;
          left: 50%;
          width: 300px;
          transform: translateX(-50%);
          pointer-events: none;
          z-index: 2;
        }

        .back-btn {
          position: absolute;
          top: 20px;
          left: 20px;
          z-index: 20;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1px solid rgba(196, 168, 152, 0.25);
          background: rgba(255, 255, 255, 0.75);
          color: #6b5248;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          backdrop-filter: blur(8px);
        }

        .step-dots {
          display: flex;
          justify-content: center;
          gap: 5px;
          flex-shrink: 0;
          padding-top: 28px;
        }

        .s-dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: rgba(160, 120, 100, 0.2);
          transition: 0.3s;
        }

        .s-dot.active {
          width: 18px;
          border-radius: 2px;
          background: #b87060;
        }

        .s-dot.done {
          background: rgba(184, 112, 96, 0.4);
        }

        .s1-wrap,
        .s2-wrap,
        .s4-wrap {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .s1-wrap {
          flex: 1;
          justify-content: center;
          padding: 36px 32px 56px;
        }

        .s1-logo {
          margin: 0 0 40px;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: #c4a898;
        }

        .s1-couple {
          margin-bottom: 28px;
          text-align: center;
        }

        .s1-bride,
        .s1-groom {
          display: block;
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(54px, 16vw, 68px);
          font-weight: 400;
          line-height: 0.9;
          letter-spacing: -0.03em;
        }

        .s1-bride {
          color: #2a1812;
        }

        .s1-groom {
          color: #b87060;
          font-style: italic;
        }

        .s1-amp {
          display: block;
          margin: 6px 0 4px;
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(20px, 6vw, 26px);
          font-style: italic;
          color: #b87060;
        }

        .s1-tagline {
          margin: 0 0 52px;
          font-size: 10px;
          font-weight: 300;
          letter-spacing: 0.2em;
          text-align: center;
          text-transform: uppercase;
          color: #c4b0a4;
        }

        .s2-wrap {
          flex: 1;
          justify-content: center;
          padding: 56px 32px 70px;
        }

        .question-label {
          margin: 0 0 6px;
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(34px, 10vw, 44px);
          font-weight: 400;
          line-height: 1.1;
          text-align: center;
          color: #2a1812;
        }

        .question-label em,
        .s4-title em {
          color: #b87060;
          font-style: italic;
        }

        .question-sub {
          margin: 0 0 44px;
          color: #c4b0a4;
          font-size: 12px;
          font-weight: 300;
          text-align: center;
          letter-spacing: 0.05em;
        }

        .big-input {
          width: 100%;
          margin-bottom: 44px;
          padding: 8px 0 14px;
          border: 0;
          border-bottom: 1.5px solid rgba(184, 112, 96, 0.25);
          outline: 0;
          background: transparent;
          color: #2a1812;
          text-align: center;
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(28px, 9vw, 38px);
        }

        .big-input::placeholder,
        .msg-input::placeholder {
          color: rgba(184, 152, 136, 0.4);
          font-style: italic;
        }

        .s3-wrap {
          width: 100%;
          padding-bottom: 56px;
        }

        .s3-header {
          position: relative;
          overflow: hidden;
          padding: 52px 28px 36px;
          background: linear-gradient(160deg, #d4a090 0%, #b87878 45%, #8b5a50 100%);
          text-align: center;
        }

        .s3-header::before {
          content: '';
          position: absolute;
          top: -30%;
          left: 50%;
          width: 200%;
          height: 160%;
          transform: translateX(-50%);
          background: radial-gradient(
            ellipse at 50% 30%,
            rgba(255, 220, 200, 0.25) 0%,
            transparent 55%
          );
          pointer-events: none;
        }

        .s3-heart {
          position: relative;
          z-index: 1;
          display: block;
          margin-bottom: 12px;
          font-size: 16px;
          opacity: 0.7;
        }

        .s3-title {
          position: relative;
          z-index: 1;
          margin: 0;
          color: #fdf4ee;
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(36px, 10vw, 48px);
          font-weight: 400;
          line-height: 1;
        }

        .s3-title em {
          display: block;
          color: rgba(255, 235, 220, 0.85);
          font-style: italic;
        }

        .s3-body {
          padding: 28px 24px 0;
        }

        .s3-subtitle {
          margin: 0 0 24px;
          color: #a09088;
          font-size: 12px;
          font-weight: 300;
          line-height: 1.6;
          letter-spacing: 0.04em;
          text-align: center;
        }

        .tip-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 32px;
        }

        .tip-card {
          position: relative;
          aspect-ratio: 1;
          overflow: hidden;
          border-radius: 14px;
          padding: 12px 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .tip-card:nth-child(1) { background: linear-gradient(145deg, #c49080, #8b5a48); }
        .tip-card:nth-child(2) { background: linear-gradient(145deg, #b88070, #7a4a3a); }
        .tip-card:nth-child(3) { background: linear-gradient(145deg, #c09878, #8a6040); }
        .tip-card:nth-child(4) { background: linear-gradient(145deg, #b07868, #7a4838); }
        .tip-card:nth-child(5) { background: linear-gradient(145deg, #c48870, #8b5842); }
        .tip-card:nth-child(6) { background: linear-gradient(145deg, #b08878, #7a5848); }

        .tip-icon-wrap {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 17px;
        }

        .tip-label {
          color: rgba(255, 240, 230, 0.9);
          font-size: 10px;
          font-weight: 500;
          line-height: 1.3;
          text-align: center;
          white-space: pre-line;
        }

        .s4-wrap {
          padding: 48px 28px 96px;
          overflow: visible;
        }

        .s4-header {
          margin-bottom: 32px;
          text-align: center;
        }

        .s4-title {
          color: #2a1812;
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(28px, 8vw, 36px);
          font-weight: 400;
          line-height: 1.1;
        }

        .s4-sub {
          margin: 4px 0 0;
          color: #c4b0a4;
          font-size: 12px;
          font-weight: 300;
        }

        .pkg-badge {
          display: inline-flex;
          align-items: center;
          margin-bottom: 32px;
          padding: 4px 12px;
          border: 1px solid rgba(184, 112, 96, 0.3);
          border-radius: 999px;
          background: rgba(184, 112, 96, 0.07);
          color: #b87060;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .field-group {
          width: 100%;
          margin-bottom: 8px;
        }

        .field-label {
          display: block;
          margin-bottom: 10px;
          color: #c4a898;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.22em;
          text-align: center;
          text-transform: uppercase;
        }

        .opt {
          color: #d4c4bc;
          font-size: 10px;
          font-weight: 300;
          letter-spacing: 0;
          text-transform: none;
        }

        .upload-zone {
          position: relative;
          width: 100%;
          margin-bottom: 24px;
          padding: 28px 20px;
          border: 1.5px dashed rgba(184, 112, 96, 0.3);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.5);
          text-align: center;
          cursor: pointer;
        }

        .upload-zone input[type='file'] {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          cursor: pointer;
        }

        .upload-icon {
          display: block;
          margin-bottom: 8px;
          font-size: 26px;
          opacity: 0.55;
        }

        .upload-zone-text {
          margin: 0;
          color: #b09088;
          font-size: 12px;
          font-weight: 400;
          letter-spacing: 0.04em;
        }

        .upload-zone-sub {
          margin: 4px 0 0;
          color: #c8b8b0;
          font-size: 10px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .preview-img,
        .preview-video {
          display: block;
          width: 100%;
          margin-bottom: 24px;
          border-radius: 8px;
        }

        .preview-img {
          height: 200px;
          object-fit: cover;
        }

        .preview-video {
          max-height: 220px;
          background: #000;
        }

        .msg-input {
          width: 100%;
          margin-bottom: 32px;
          padding: 6px 0 12px;
          border: 0;
          border-bottom: 1px solid rgba(184, 112, 96, 0.2);
          outline: 0;
          resize: vertical;
          background: transparent;
          color: #2a1812;
          font-family: 'Cormorant Garamond', serif;
          font-size: 17px;
          font-weight: 300;
          text-align: center;
        }

        .btn-main,
        .btn-text,
        .btn-record,
        .btn-stop {
          width: 100%;
          border-radius: 8px;
          cursor: pointer;
        }

        .btn-main {
          margin-bottom: 10px;
          padding: 16px 24px;
          border: 0;
          background: #b87060;
          color: #fdf4ee;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
        }

        .btn-main:disabled {
          background: #d4b4a8;
          cursor: not-allowed;
        }

        .btn-text {
          padding: 12px 24px;
          border: 0;
          background: transparent;
          color: #c4a898;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.2em;
          text-transform: uppercase;
        }

        .btn-record,
        .btn-stop {
          margin-bottom: 10px;
          padding: 13px 24px;
          border: 1px solid rgba(184, 112, 96, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .btn-record {
          background: transparent;
          color: #b09088;
        }

        .btn-stop {
          background: rgba(184, 112, 96, 0.1);
          color: #b87060;
        }

        .rec-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #b87060;
        }

        audio {
          width: 100%;
          margin-bottom: 10px;
        }

        @media (min-width: 480px) {
          .page {
            padding: 32px 20px;
          }

          .shell {
            min-height: calc(100vh - 64px);
            min-height: calc(100dvh - 64px);
            border-radius: 24px;
            box-shadow:
              0 24px 80px rgba(80, 40, 20, 0.18),
              0 4px 16px rgba(80, 40, 20, 0.08);
          }
        }

        @media (max-width: 360px) {
          .tip-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .s4-wrap {
            padding-right: 20px;
            padding-left: 20px;
          }
        }
      `}</style>

      <svg
        className="top-floral"
        viewBox="0 0 320 130"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
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

      <main className="page">
        <section className="shell">
          {step > 1 && (
            <button
              type="button"
              className="back-btn"
              onClick={() => setStep((currentStep) => Math.max(1, currentStep - 1))}
              aria-label="Go back"
            >
              ←
            </button>
          )}

          <div className="step-dots" aria-label={`Step ${step} of 4`}>
            {[1, 2, 3, 4].map((number) => (
              <div
                key={number}
                className={`s-dot${step === number ? ' active' : step > number ? ' done' : ''}`}
              />
            ))}
          </div>

          {step === 1 && (
            <div className="s1-wrap">
              <p className="s1-logo">Guest Gallery</p>
              <div className="s1-couple">
                <span className="s1-bride">{brideName}</span>
                <span className="s1-amp">&</span>
                <span className="s1-groom">{groomName}</span>
              </div>
              <p className="s1-tagline">Capture · Share · Remember</p>
              <button type="button" className="btn-main" onClick={() => setStep(2)}>
                Start →
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="s2-wrap">
              <p className="question-label">
                What&apos;s your<br />
                <em>name?</em>
              </p>
              <p className="question-sub">So we know who captured this moment</p>
              <input
                type="text"
                placeholder="Your name…"
                value={guestName}
                onChange={(event) => setGuestName(event.target.value)}
                className="big-input"
                autoFocus
              />
              <button
                type="button"
                className="btn-main"
                onClick={() => {
                  if (!guestName.trim()) {
                    alert('Please enter your name')
                    return
                  }
                  setStep(3)
                }}
              >
                Continue →
              </button>
              <button type="button" className="btn-text" onClick={() => setStep(1)}>
                Back
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="s3-wrap">
              <div className="s3-header">
                <span className="s3-heart">♡</span>
                <h2 className="s3-title">
                  Capture
                  <em>the moments</em>
                </h2>
              </div>

              <div className="s3-body">
                <p className="s3-subtitle">
                  Here are some ideas for the beautiful
                  <br />
                  memories you can share.
                </p>

                <div className="tip-grid">
                  {tips.map((tip, index) => (
                    <div key={`${tip.label}-${index}`} className="tip-card">
                      <div className="tip-icon-wrap">{tip.icon}</div>
                      <span className="tip-label">{tip.label}</span>
                    </div>
                  ))}
                </div>

                <button type="button" className="btn-main" onClick={() => setStep(4)}>
                  Continue →
                </button>
                <button type="button" className="btn-text" onClick={() => setStep(2)}>
                  Back
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="s4-wrap">
              <div className="s4-header">
                <div className="s4-title">
                  Share your
                  <br />
                  <em>memory</em>
                </div>
                <p className="s4-sub">
                  with {brideName} & {groomName}
                </p>
              </div>

              <span className="pkg-badge">{packageType} Package</span>

              <div className="field-group">
                <label className="field-label">
                  {allowVideo ? 'Photo or Video' : 'Photo'}
                </label>
                <div className="upload-zone">
                  <input
                    type="file"
                    accept={allowVideo ? 'image/*,video/*' : 'image/*'}
                    onChange={handleFileChange}
                  />
                  {!preview ? (
                    <>
                      <span className="upload-icon">📷</span>
                      <p className="upload-zone-text">
                        Tap to choose a photo{allowVideo ? ' or video' : ''}
                      </p>
                      <p className="upload-zone-sub">
                        {packageType === 'BASIC'
                          ? 'Photo only'
                          : packageType === 'PREMIUM'
                            ? 'Photo & video'
                            : 'Photo, video & voice'}
                      </p>
                    </>
                  ) : (
                    <p className="upload-zone-text" style={{ color: '#B87060' }}>
                      ✓ Selected — tap to change
                    </p>
                  )}
                </div>
              </div>

              {preview && mediaType === 'image' && (
                <img src={preview} alt="Selected preview" className="preview-img" />
              )}

              {preview && mediaType === 'video' && (
                <video
                  src={preview}
                  controls
                  playsInline
                  className="preview-video"
                />
              )}

              <div className="field-group">
                <label className="field-label">
                  Message <span className="opt">(optional)</span>
                </label>
                <textarea
                  placeholder="Wishing you both a lifetime of happiness…"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={3}
                  className="msg-input"
                />
              </div>

              {allowAudio && (
                <div className="field-group" style={{ marginBottom: 24 }}>
                  <label className="field-label">
                    Voice Message <span className="opt">(optional)</span>
                  </label>

                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="btn-record"
                    >
                      🎙️ Record Voice Message
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="btn-stop"
                    >
                      <span className="rec-dot" /> Stop Recording
                    </button>
                  )}

                  {audioPreview && (
                    <>
                      <audio controls src={audioPreview} />
                      <button
                        type="button"
                        onClick={removeAudio}
                        className="btn-text"
                      >
                        Remove voice message
                      </button>
                    </>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={handleUpload}
                disabled={isUploading || isRecording}
                className="btn-main"
              >
                {isUploading ? 'Uploading…' : 'Upload Memory'}
              </button>

              <button type="button" onClick={() => setStep(3)} className="btn-text">
                Back
              </button>
            </div>
          )}
        </section>
      </main>
    </>
  )
}
