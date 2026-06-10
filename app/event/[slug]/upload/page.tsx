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

  const brideName =
    event?.bride_name ||
    slug.split('-')[0]?.replace(/\b\w/g, (c) => c.toUpperCase()) ||
    'Bride'

  const groomName =
    event?.groom_name ||
    slug
      .split('-')
      .slice(1)
      .join(' ')
      .replace(/\b\w/g, (c) => c.toUpperCase()) ||
    'Groom'

  useEffect(() => {
    fetchEvent()
  }, [slug])

  async function fetchEvent() {
    setEventLoading(true)

    const { data, error } = await supabase
      .from('events')
      .select('id, slug, bride_name, groom_name, package_type')
      .eq('slug', slug)
      .single()

    if (!error && data) setEvent(data as WeddingEvent)
    setEventLoading(false)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    const isVideo = selectedFile.type.startsWith('video/')
    const isImage = selectedFile.type.startsWith('image/')

    if (!isImage && !isVideo) {
      alert('Please choose an image or video file.')
      return
    }

    if (isVideo && !allowVideo) {
      alert('Video upload is only available for Premium and VIP packages.')
      return
    }

    if (selectedFile.size > 100 * 1024 * 1024) {
      alert('Maximum file size is 100MB.')
      return
    }

    if (preview) URL.revokeObjectURL(preview)

    setFile(selectedFile)
    setMediaType(isVideo ? 'video' : 'image')
    setPreview(URL.createObjectURL(selectedFile))
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
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)

      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
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
    } catch {
      alert('Microphone permission denied or not supported.')
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
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
    const safeGuestName = guestName.trim().replace(/\s+/g, '-').toLowerCase() || 'guest'
    const fileName = `${slug}/${Date.now()}-${safeGuestName}.${extension}`

    const { error } = await supabase.storage.from('audio').upload(fileName, audioBlob, {
      contentType: audioBlob.type || 'audio/mp4',
      upsert: false,
    })

    if (error) throw error

    const { data } = supabase.storage.from('audio').getPublicUrl(fileName)
    return data.publicUrl
  }

  const handleUpload = async () => {
    if (!guestName.trim() || !file) {
      alert('Please enter your name and choose a file.')
      return
    }

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

      setGuestName('')
      setMessage('')
      setFile(null)
      setPreview(null)
      setMediaType('image')
      setAudioBlob(null)
      setAudioPreview(null)
      setStep(1)
    } catch {
      alert('Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  if (eventLoading) {
    return (
      <div className="loading-page">
        <style>{`
          .loading-page {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #b9aa98;
            color: white;
            font-family: sans-serif;
            letter-spacing: .18em;
            text-transform: uppercase;
            font-size: 12px;
          }
        `}</style>
        Loading…
      </div>
    )
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        html,
        body {
          background: #b8aa98;
        }

        .page {
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 22px 14px;
          font-family: 'DM Sans', sans-serif;
          background:
            linear-gradient(rgba(70, 58, 48, 0.38), rgba(70, 58, 48, 0.38)),
            radial-gradient(circle at 15% 82%, rgba(255,255,255,.38), transparent 18%),
            radial-gradient(circle at 85% 25%, rgba(255,255,255,.28), transparent 20%),
            linear-gradient(135deg, #8f8372, #d6c8b8 48%, #958777);
          overflow: hidden;
          position: relative;
        }

        .page::before {
          content: '';
          position: absolute;
          inset: -40px;
          background:
            radial-gradient(circle at 18% 22%, rgba(54, 76, 48, .35), transparent 18%),
            radial-gradient(circle at 86% 58%, rgba(54, 76, 48, .28), transparent 20%),
            radial-gradient(circle at 12% 72%, rgba(255,255,255,.46), transparent 13%),
            radial-gradient(circle at 90% 35%, rgba(255,255,255,.36), transparent 12%);
          filter: blur(16px);
        }

        .phone {
          width: min(100%, 390px);
          min-height: 812px;
          max-height: 900px;
          border-radius: 44px;
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,.45);
          box-shadow:
            0 30px 90px rgba(47, 37, 29, .28),
            inset 0 0 0 3px rgba(255,255,255,.34);
          background:
            radial-gradient(circle at 20% 8%, rgba(255,255,255,.8), transparent 28%),
            radial-gradient(circle at 94% 72%, rgba(177, 121, 106, .22), transparent 30%),
            linear-gradient(145deg, rgba(255,249,243,.92), rgba(225,212,199,.90));
          backdrop-filter: blur(18px);
          z-index: 1;
        }

        .phone.step-one {
          background:
            linear-gradient(rgba(47,39,32,.22), rgba(47,39,32,.22)),
            radial-gradient(circle at 25% 20%, rgba(255,255,255,.36), transparent 18%),
            radial-gradient(circle at 86% 76%, rgba(255,238,213,.25), transparent 22%),
            linear-gradient(145deg, rgba(145,134,118,.88), rgba(209,198,184,.86));
        }

        .phone::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 20% 82%, rgba(255,255,255,.42), transparent 16%),
            radial-gradient(circle at 78% 22%, rgba(255,255,255,.24), transparent 14%);
          filter: blur(8px);
          pointer-events: none;
        }

        .inner {
          position: relative;
          z-index: 2;
          min-height: 812px;
          padding: 22px 28px 30px;
          display: flex;
          flex-direction: column;
        }

        .status {
          height: 26px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: ${step === 1 ? '#fff' : '#73584b'};
          font-size: 13px;
          font-weight: 700;
          margin-bottom: 16px;
        }

        .status-icons {
          display: flex;
          gap: 6px;
          align-items: center;
        }

        .signal {
          display: flex;
          align-items: flex-end;
          gap: 2px;
        }

        .signal span {
          width: 3px;
          border-radius: 2px;
          background: currentColor;
        }

        .signal span:nth-child(1) { height: 5px; }
        .signal span:nth-child(2) { height: 7px; }
        .signal span:nth-child(3) { height: 9px; }
        .signal span:nth-child(4) { height: 11px; }

        .battery {
          width: 23px;
          height: 11px;
          border: 1.7px solid currentColor;
          border-radius: 3px;
          position: relative;
        }

        .battery::before {
          content: '';
          position: absolute;
          right: -4px;
          top: 3px;
          width: 2px;
          height: 5px;
          background: currentColor;
          border-radius: 2px;
        }

        .battery::after {
          content: '';
          position: absolute;
          inset: 2px;
          background: currentColor;
          border-radius: 1px;
        }

        .wifi {
          width: 15px;
          height: 11px;
          border: 2px solid currentColor;
          border-left-color: transparent;
          border-right-color: transparent;
          border-bottom: 0;
          border-radius: 14px 14px 0 0;
        }

        .topbar {
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .lang {
          color: white;
          font-size: 12px;
          letter-spacing: .08em;
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .back-circle {
          width: 36px;
          height: 36px;
          border-radius: 999px;
          border: 0;
          background: rgba(255,255,255,.68);
          color: #6d5042;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 22px rgba(70,48,37,.08);
        }

        .step-no {
          flex: 1;
          text-align: center;
          font-size: 13px;
          color: #8a7061;
          letter-spacing: .16em;
        }

        .progress {
          width: 72%;
          margin: 0 auto 28px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .progress span.line {
          height: 2px;
          width: 92px;
          background: rgba(255,255,255,.65);
        }

        .progress span.dot {
          width: 11px;
          height: 11px;
          border-radius: 50%;
          background: rgba(255,255,255,.76);
        }

        .progress span.dot.active {
          background: #b56f73;
        }

        .step1-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          color: white;
          padding-top: 48px;
        }

        .heart-mark {
          margin-bottom: 14px;
        }

        .gallery-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .34em;
          font-weight: 600;
          margin-bottom: 28px;
        }

        .couple-name {
          font-family: 'Cormorant Garamond', serif;
          font-size: 58px;
          line-height: .98;
          font-weight: 400;
          letter-spacing: -.035em;
          text-shadow: 0 12px 26px rgba(42,31,26,.13);
        }

        .amp {
          font-family: 'Cormorant Garamond', serif;
          font-size: 44px;
          line-height: .8;
          font-style: italic;
          color: #d39a9d;
        }

        .copy {
          margin-top: 42px;
          max-width: 280px;
          font-size: 15px;
          line-height: 1.62;
          text-shadow: 0 10px 18px rgba(42,31,26,.14);
        }

        .mini-heart {
          margin-top: 28px;
          font-size: 23px;
        }

        .bottom {
          margin-top: auto;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .btn-main {
          width: 100%;
          min-height: 54px;
          border: 0;
          border-radius: 13px;
          background: linear-gradient(135deg, #b9646e, #b47a74);
          color: white;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: .19em;
          text-transform: uppercase;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          box-shadow: 0 16px 30px rgba(157,83,88,.24);
        }

        .btn-main:disabled {
          opacity: .6;
          cursor: not-allowed;
        }

        .btn-back {
          width: 100%;
          min-height: 48px;
          border-radius: 11px;
          border: 1px solid rgba(133,94,74,.55);
          background: rgba(255,255,255,.18);
          color: #8a5f4e;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: .18em;
          text-transform: uppercase;
          cursor: pointer;
        }

        .title {
          text-align: center;
          font-family: 'Cormorant Garamond', serif;
          font-size: 42px;
          line-height: .95;
          font-weight: 400;
          color: #2c201a;
          letter-spacing: -.035em;
        }

        .title em {
          display: block;
          font-size: 35px;
          color: #b56f73;
          font-style: italic;
        }

        .small-heart {
          text-align: center;
          color: #b56f73;
          margin: 12px 0 17px;
        }

        .subtitle {
          text-align: center;
          max-width: 286px;
          margin: 0 auto 24px;
          color: #4f4039;
          font-size: 14px;
          line-height: 1.55;
        }

        .guide-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 11px;
          margin-bottom: 26px;
        }

        .guide-card {
          min-height: 178px;
          border-radius: 10px;
          padding: 15px 8px 17px;
          color: white;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          text-align: center;
          overflow: hidden;
          position: relative;
          box-shadow: 0 14px 26px rgba(71,49,39,.13);
          background:
            linear-gradient(to bottom, rgba(34,27,23,.04), rgba(34,27,23,.76)),
            radial-gradient(circle at 50% 25%, rgba(255,255,255,.60), transparent 21%),
            linear-gradient(135deg, #8b7b68, #d6c4ac);
        }

        .guide-card:nth-child(2) {
          background:
            linear-gradient(to bottom, rgba(34,27,23,.04), rgba(34,27,23,.76)),
            radial-gradient(circle at 40% 18%, rgba(255,216,126,.65), transparent 19%),
            linear-gradient(135deg, #584a38, #b08b58);
        }

        .guide-card:nth-child(3) {
          background:
            linear-gradient(to bottom, rgba(34,27,23,.04), rgba(34,27,23,.76)),
            radial-gradient(circle at 55% 22%, rgba(255,255,255,.62), transparent 21%),
            linear-gradient(135deg, #89735f, #d1b08e);
        }

        .guide-card:nth-child(4) {
          background:
            linear-gradient(to bottom, rgba(34,27,23,.04), rgba(34,27,23,.76)),
            radial-gradient(circle at 44% 28%, rgba(255,198,104,.50), transparent 22%),
            linear-gradient(135deg, #5d4638, #a77a4e);
        }

        .guide-card:nth-child(5) {
          background:
            linear-gradient(to bottom, rgba(34,27,23,.04), rgba(34,27,23,.76)),
            radial-gradient(circle at 50% 24%, rgba(238,180,88,.55), transparent 24%),
            linear-gradient(135deg, #2d241f, #8b6039);
        }

        .guide-card:nth-child(6) {
          background:
            linear-gradient(to bottom, rgba(34,27,23,.04), rgba(34,27,23,.76)),
            radial-gradient(circle at 50% 24%, rgba(255,255,255,.55), transparent 21%),
            linear-gradient(135deg, #a0907c, #d7c6af);
        }

        .guide-icon {
          width: 35px;
          height: 35px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.62);
          margin: 0 auto 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,.10);
        }

        .guide-text {
          font-size: 13px;
          line-height: 1.25;
          font-weight: 500;
        }

        .field {
          margin-bottom: 20px;
        }

        .label {
          display: block;
          margin-bottom: 10px;
          color: #3b2d27;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .13em;
          text-transform: uppercase;
        }

        .input-wrap {
          min-height: 46px;
          border-radius: 8px;
          border: 1px solid rgba(156,116,95,.24);
          background: rgba(255,255,255,.60);
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 0 14px;
        }

        .text-input {
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: #2f211b;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
        }

        .text-input::placeholder,
        .message-input::placeholder {
          color: rgba(101,82,72,.45);
        }

        .upload-box {
          min-height: 118px;
          border-radius: 10px;
          border: 1.5px dashed rgba(169,111,94,.45);
          background: rgba(255,255,255,.36);
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          position: relative;
          overflow: hidden;
          cursor: pointer;
        }

        .upload-box input {
          position: absolute;
          inset: 0;
          opacity: 0;
          cursor: pointer;
        }

        .upload-title {
          font-size: 12px;
          font-weight: 600;
          color: #5e453a;
          margin-top: 8px;
        }

        .upload-sub {
          font-size: 10px;
          color: rgba(75,58,50,.56);
          margin-top: 6px;
        }

        .preview-img,
        .preview-video {
          width: 100%;
          height: 118px;
          object-fit: cover;
          display: block;
        }

        .textarea-wrap {
          min-height: 106px;
          border-radius: 9px;
          border: 1px solid rgba(156,116,95,.24);
          background: rgba(255,255,255,.54);
          padding: 15px;
          position: relative;
        }

        .message-input {
          width: 100%;
          height: 70px;
          border: 0;
          outline: 0;
          resize: none;
          background: transparent;
          color: #2f211b;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          line-height: 1.55;
        }

        .counter {
          position: absolute;
          right: 14px;
          bottom: 11px;
          font-size: 11px;
          color: rgba(83,61,51,.50);
        }

        .voice-row {
          min-height: 56px;
          border-radius: 9px;
          border: 1px solid rgba(156,116,95,.20);
          background: rgba(255,255,255,.60);
          display: flex;
          align-items: center;
          gap: 13px;
          padding: 8px 10px 8px 13px;
        }

        .voice-btn,
        .play-btn {
          width: 38px;
          height: 38px;
          border-radius: 999px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .voice-btn {
          border: 0;
          background: rgba(178,111,114,.12);
          color: #9b635e;
        }

        .play-btn {
          border: 1px solid #2d201b;
          background: transparent;
          color: #2d201b;
        }

        .voice-title {
          font-size: 12px;
          color: #5b443a;
          font-weight: 500;
        }

        .voice-sub {
          font-size: 10px;
          color: rgba(83,61,51,.52);
          margin-top: 3px;
        }

        .voice-text {
          flex: 1;
        }

        audio {
          width: 100%;
          margin-top: 10px;
        }

        .rec-dot {
          width: 8px;
          height: 8px;
          background: #b56f73;
          border-radius: 999px;
          animation: blink 1s infinite;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: .25; }
        }

        @media (max-width: 430px) {
          .page {
            padding: 0;
            align-items: stretch;
          }

          .phone {
            width: 100%;
            min-height: 100vh;
            min-height: 100dvh;
            max-height: none;
            border-radius: 0;
            border: 0;
            box-shadow: none;
          }

          .inner {
            min-height: 100vh;
            min-height: 100dvh;
            padding: 18px 24px 24px;
          }

          .guide-card {
            min-height: 155px;
          }
        }
      `}</style>

      <main className="page">
        <section className={`phone ${step === 1 ? 'step-one' : ''}`}>
          <div className="inner">
            <div className="status">
              <span>9:41</span>
              <div className="status-icons">
                <span className="signal">
                  <span />
                  <span />
                  <span />
                  <span />
                </span>
                <span className="wifi" />
                <span className="battery" />
              </div>
            </div>

            {step === 1 ? (
              <div className="topbar">
                <div />
                <div className="lang">EN⌄</div>
              </div>
            ) : (
              <>
                <div className="topbar">
                  <button className="back-circle" type="button" onClick={() => setStep(step - 1)}>
                    ←
                  </button>
                  <div className="step-no">{step} / 3</div>
                  <div style={{ width: 36 }} />
                </div>

                <div className="progress">
                  <span className={`dot ${step >= 1 ? 'active' : ''}`} />
                  <span className="line" />
                  <span className={`dot ${step >= 2 ? 'active' : ''}`} />
                  <span className="line" />
                  <span className={`dot ${step >= 3 ? 'active' : ''}`} />
                </div>
              </>
            )}

            {step === 1 && (
              <div className="step1-main">
                <div className="heart-mark">
                  <svg width="42" height="42" viewBox="0 0 48 48" fill="none">
                    <path
                      d="M24 39s-15-8.8-15-20.3C9 13.2 12.8 10 17.4 10c2.8 0 5.2 1.4 6.6 3.6C25.4 11.4 27.8 10 30.6 10 35.2 10 39 13.2 39 18.7 39 30.2 24 39 24 39Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                  </svg>
                </div>

                <p className="gallery-label">Wedding Gallery</p>

                <div>
                  <h1 className="couple-name">{brideName}</h1>
                  <div className="amp">&</div>
                  <h1 className="couple-name">{groomName}</h1>
                </div>

                <div className="copy">
                  <p>Thank you for being part of our special day.</p>
                  <br />
                  <p>Help us capture every beautiful moment by sharing your photos, videos and wishes.</p>
                </div>

                <div className="mini-heart">♡</div>

                <div className="bottom">
                  <button className="btn-main" type="button" onClick={() => setStep(2)}>
                    Start →
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <>
                <h2 className="title">
                  Capture
                  <em>the moments</em>
                </h2>

                <div className="small-heart">♡</div>

                <p className="subtitle">Here are some ideas for the beautiful memories you can share.</p>

                <div className="guide-grid">
                  {[
                    ['📷', 'Selfie with the couple'],
                    ['💍', 'Wedding ceremony'],
                    ['🎉', 'Fun candid moments'],
                    ['🥂', 'Reception memories'],
                    ['🎥', 'Videos & boomerangs'],
                    ['🎙️', 'Voice message for the couple'],
                  ].map(([icon, text]) => (
                    <div className="guide-card" key={text}>
                      <div>
                        <div className="guide-icon">{icon}</div>
                        <p className="guide-text">{text}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bottom">
                  <button className="btn-main" type="button" onClick={() => setStep(3)}>
                    Continue →
                  </button>
                  <button className="btn-back" type="button" onClick={() => setStep(1)}>
                    Back
                  </button>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <h2 className="title">
                  Share
                  <em>your memory</em>
                </h2>

                <div className="small-heart">♡</div>

                <div className="field">
                  <label className="label">Your Name</label>
                  <div className="input-wrap">
                    <span>♙</span>
                    <input
                      className="text-input"
                      type="text"
                      placeholder="e.g. Ahmad"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="field">
                  <label className="label">{allowVideo ? 'Photo / Video' : 'Photo'}</label>
                  <label className="upload-box">
                    <input
                      type="file"
                      accept={allowVideo ? 'image/*,video/*' : 'image/*'}
                      onChange={handleFileChange}
                    />

                    {!preview ? (
                      <div>
                        <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                          <path
                            d="M12 16V4M7 9l5-5 5 5"
                            stroke="#9b7060"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M20 15.5a4.5 4.5 0 0 0-4.4-5.5A6 6 0 0 0 4.2 12 4 4 0 0 0 5 20h12.5"
                            stroke="#9b7060"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </svg>
                        <p className="upload-title">Tap to upload</p>
                        <p className="upload-sub">
                          {allowVideo ? 'JPG, PNG, MP4 up to 100MB' : 'JPG, PNG up to 100MB'}
                        </p>
                      </div>
                    ) : mediaType === 'image' ? (
                      <img src={preview} alt="Preview" className="preview-img" />
                    ) : (
                      <video src={preview} controls playsInline className="preview-video" />
                    )}
                  </label>
                </div>

                <div className="field">
                  <label className="label">Message Optional</label>
                  <div className="textarea-wrap">
                    <textarea
                      className="message-input"
                      placeholder="Wishing you both a lifetime of happiness..."
                      value={message}
                      maxLength={200}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                    <span className="counter">{message.length}/200</span>
                  </div>
                </div>

                {allowAudio && (
                  <div className="field">
                    <label className="label">Voice Message Optional</label>

                    <div className="voice-row">
                      <button
                        type="button"
                        className="voice-btn"
                        onClick={isRecording ? stopRecording : startRecording}
                      >
                        {isRecording ? <span className="rec-dot" /> : '🎙️'}
                      </button>

                      <div className="voice-text">
                        <p className="voice-title">
                          {isRecording ? 'Recording...' : audioPreview ? 'Voice recorded' : 'Tap to record'}
                        </p>
                        <p className="voice-sub">Max 1 minute</p>
                      </div>

                      <button
                        type="button"
                        className="play-btn"
                        onClick={audioPreview ? removeAudio : startRecording}
                      >
                        {audioPreview ? '×' : '▶'}
                      </button>
                    </div>

                    {audioPreview && <audio controls src={audioPreview} />}
                  </div>
                )}

                <div className="bottom">
                  <button
                    className="btn-main"
                    type="button"
                    onClick={handleUpload}
                    disabled={isUploading || isRecording}
                  >
                    ⇧ {isUploading ? 'Uploading…' : 'Upload Memory'}
                  </button>

                  <button className="btn-back" type="button" onClick={() => setStep(2)}>
                    Back
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
      </main>
    </>
  )
}