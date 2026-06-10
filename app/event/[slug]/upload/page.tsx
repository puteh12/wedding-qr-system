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
    slug.split('-')[0]?.charAt(0).toUpperCase() + slug.split('-')[0]?.slice(1)

  const groomName =
    event?.groom_name ||
    slug
      .split('-')
      .slice(1)
      .join(' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())

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

    if (!error && data) {
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    const selectedIsVideo = selectedFile.type.startsWith('video/')
    const selectedIsImage = selectedFile.type.startsWith('image/')

    if (!selectedIsImage && !selectedIsVideo) {
      alert('Please choose an image or video file.')
      return
    }

    if (selectedIsVideo && !allowVideo) {
      alert('Video upload is only available for Premium and VIP packages.')
      return
    }

    setFile(selectedFile)
    setMediaType(selectedIsVideo ? 'video' : 'image')
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

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = () => {
        const finalMimeType = mediaRecorder.mimeType || mimeType || 'audio/mp4'

        const blob = new Blob(audioChunksRef.current, {
          type: finalMimeType,
        })

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
    setAudioBlob(null)
    setAudioPreview(null)
  }

  const uploadAudioToSupabase = async () => {
    if (!audioBlob || !allowAudio) return null

    const extension = getAudioExtension(audioBlob.type)
    const safeGuestName =
      guestName.trim().replace(/\s+/g, '-').toLowerCase() || 'guest'

    const fileName = `${slug}/${Date.now()}-${safeGuestName}.${extension}`

    const { error } = await supabase.storage
      .from('audio')
      .upload(fileName, audioBlob, {
        contentType: audioBlob.type || 'audio/mp4',
        upsert: false,
      })

    if (error) throw error

    const { data } = supabase.storage.from('audio').getPublicUrl(fileName)

    return data.publicUrl
  }

  const handleUpload = async () => {
    if (!guestName || !file) {
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
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#FBF7F2',
          color: '#7B746F',
          fontFamily: 'sans-serif',
        }}
      >
        Loading wedding event...
      </div>
    )
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');

        * { box-sizing: border-box; }

        input[type="text"]:focus,
        textarea:focus {
          outline: none;
          border-color: rgba(184,150,90,0.45) !important;
          background: #fff !important;
        }

        input,
        textarea {
          transition: border-color 0.15s, background 0.15s;
        }

        .upload-page {
          min-height: 100vh;
          background: #FBF7F2;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'DM Sans', sans-serif;
          padding: 32px;
          position: relative;
          overflow: hidden;
        }

        .upload-bg {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          width: 100%;
          height: 100%;
        }

        .upload-card {
          position: relative;
          z-index: 2;
          background: #fff;
          border-radius: 6px;
          width: 100%;
          max-width: 520px;
          padding: 56px 48px;
          box-shadow: 0 18px 40px rgba(28,23,20,0.06), 0 0 0 1px rgba(184,150,90,0.06);
        }

        .corner-top {
          position: absolute;
          top: 12px;
          left: 12px;
          width: 20px;
          height: 20px;
          border-top: 1px solid #B8965A;
          border-left: 1px solid #B8965A;
          opacity: 0.45;
        }

        .corner-bottom {
          position: absolute;
          bottom: 12px;
          right: 12px;
          width: 20px;
          height: 20px;
          border-bottom: 1px solid #B8965A;
          border-right: 1px solid #B8965A;
          opacity: 0.45;
        }

        .step-count {
          text-align: center;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #C8B8B0;
          margin-bottom: 22px;
        }

        .hero-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 44px;
          font-weight: 300;
          color: #1C1714;
          text-align: center;
          line-height: 1.05;
          margin-bottom: 12px;
        }

        .hero-title em {
          color: #C4847A;
          font-style: italic;
        }

        .hero-text {
          color: #7B746F;
          font-size: 14px;
          line-height: 1.8;
          text-align: center;
          margin-top: 24px;
        }

        .phone-preview {
          width: 100%;
          height: 250px;
          border-radius: 6px;
          background: linear-gradient(135deg, #FBF7F2, #EFE4DA);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 24px 0;
          border: 1px solid rgba(184,150,90,0.12);
          overflow: hidden;
        }

        .phone-box {
          width: 150px;
          height: 220px;
          border-radius: 24px;
          border: 8px solid #1C1714;
          background: #fff;
          box-shadow: 0 12px 40px rgba(28,23,20,0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 16px;
        }

        .phone-box p {
          font-family: 'Cormorant Garamond', serif;
          color: #C4847A;
          font-size: 20px;
          line-height: 1.2;
        }

        .tips {
          display: grid;
          gap: 10px;
          color: #7B746F;
          font-size: 13px;
          line-height: 1.5;
        }

        .header {
          text-align: center;
          margin-bottom: 34px;
        }

        .eyebrow {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: #C8B8B0;
          margin-bottom: 8px;
        }

        .name {
          font-family: 'Cormorant Garamond', serif;
          font-size: 28px;
          font-weight: 400;
          color: #1C1714;
          line-height: 1.05;
        }

        .name-alt {
          font-family: 'Cormorant Garamond', serif;
          font-size: 20px;
          font-style: italic;
          color: #C4847A;
          margin-top: 6px;
        }

        .package-pill {
          margin-top: 14px;
          display: inline-block;
          padding: 6px 12px;
          border-radius: 999px;
          background: #FBF7F4;
          border: 1px solid rgba(184,150,90,0.18);
          color: #B8965A;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.14em;
        }

        .form-stack {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .label {
          display: block;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #B8965A;
          margin-bottom: 6px;
        }

        .optional {
          color: #C8B8B0;
          font-weight: 300;
          text-transform: none;
          letter-spacing: 0;
        }

        .input,
        .textarea,
        .file-input {
          width: 100%;
          border: 1px solid rgba(28,23,20,0.06);
          background: #FBF7F4;
          padding: 12px 14px;
          color: #1C1714;
          border-radius: 4px;
        }

        .input,
        .textarea {
          font-family: 'Cormorant Garamond', serif;
          font-size: 16px;
        }

        .file-input {
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          color: #6F6A67;
          cursor: pointer;
        }

        .hint {
          margin-top: 6px;
          font-size: 11px;
          color: #B8A8A0;
          line-height: 1.5;
        }

        .preview {
          width: 100%;
          height: 220px;
          object-fit: cover;
          border-radius: 4px;
          border: 1px solid rgba(28,23,20,0.04);
        }

        .video-preview {
          width: 100%;
          max-height: 260px;
          border-radius: 4px;
          border: 1px solid rgba(28,23,20,0.04);
          background: #000;
        }

        .primary-btn,
        .secondary-btn,
        .danger-btn {
          width: 100%;
          padding: 14px 24px;
          border-radius: 3px;
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          cursor: pointer;
        }

        .primary-btn {
          background: #14110F;
          color: #FFF;
          border: none;
        }

        .primary-btn:disabled {
          background: #9B948D;
          cursor: not-allowed;
        }

        .secondary-btn {
          background: transparent;
          color: #7B746F;
          border: 1px solid rgba(28,23,20,0.06);
        }

        .danger-btn {
          background: #C4847A;
          color: #FFF;
          border: none;
        }

        @media (max-width: 560px) {
          .upload-page {
            padding: 18px;
            align-items: flex-start;
          }

          .upload-card {
            padding: 42px 28px;
          }

          .hero-title {
            font-size: 36px;
          }
        }
      `}</style>

      <div className="upload-page">
        <svg
          className="upload-bg"
          viewBox="0 0 1440 900"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid slice"
        >
          <g opacity="0.10" fill="none" stroke="#B8965A" strokeWidth="0.8">
            <path d="M -30 -20 Q 100 80 80 200 Q 60 320 140 400" />
            <path d="M 30 40 Q 130 100 120 240" />
            <ellipse cx="85" cy="190" rx="22" ry="10" transform="rotate(-35 85 190)" />
            <ellipse cx="130" cy="230" rx="18" ry="8" transform="rotate(-55 130 230)" />
          </g>

          <g
            opacity="0.08"
            fill="none"
            stroke="#C4847A"
            strokeWidth="0.8"
            transform="translate(1440,900) rotate(180)"
          >
            <path d="M -30 -20 Q 100 80 80 200 Q 60 320 140 400" />
            <ellipse cx="85" cy="190" rx="22" ry="10" transform="rotate(-35 85 190)" />
          </g>
        </svg>

        <div className="upload-card">
          <div className="corner-top" />
          <div className="corner-bottom" />

          {step === 1 && (
            <>
              <p className="step-count">Step 1 / 3</p>

              <h1 className="hero-title">
                {brideName}
                <br />
                <em>& {groomName}</em>
              </h1>

              <p className="hero-text">
                Welcome to our wedding guest gallery. Scan, capture and upload
                your favourite moments from the celebration.
              </p>

              <div style={{ marginTop: 34 }}>
                <button className="primary-btn" onClick={() => setStep(2)}>
                  Start
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p className="step-count">Step 2 / 3</p>

              <h1 className="hero-title">
                Capture
                <br />
                <em>Memories</em>
              </h1>

              <div className="phone-preview">
                <div className="phone-box">
                  <p>
                    Your
                    <br />
                    Photo
                    <br />
                    Moment
                  </p>
                </div>
              </div>

              <div className="tips">
                <p>📸 Selfie with the couple</p>
                <p>💍 Wedding ceremony highlights</p>
                <p>🎉 Fun candid moments</p>
                <p>🥂 Reception memories</p>
                {allowVideo && <p>🎥 Videos and boomerangs are welcome</p>}
                {allowAudio && <p>🎙️ Leave a voice message for the couple</p>}
              </div>

              <div style={{ marginTop: 30, display: 'grid', gap: 12 }}>
                <button className="primary-btn" onClick={() => setStep(3)}>
                  Continue
                </button>

                <button className="secondary-btn" onClick={() => setStep(1)}>
                  Back
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="header">
                <p className="eyebrow">Wedding Gallery</p>

                <div className="name">{brideName}</div>
                <div className="name-alt">{groomName}</div>

                <div className="package-pill">{packageType} Package</div>
              </div>

              <div className="form-stack">
                <div>
                  <label className="label">Your Name</label>

                  <input
                    type="text"
                    placeholder="e.g. Ahmad"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="input"
                  />
                </div>

                <div>
                  <label className="label">
                    {allowVideo ? 'Photo / Video' : 'Photo'}
                  </label>

                  <input
                    type="file"
                    accept={allowVideo ? 'image/*,video/*' : 'image/*'}
                    onChange={handleFileChange}
                    className="file-input"
                  />

                  <p className="hint">
                    {packageType === 'BASIC'
                      ? 'Basic package supports photo upload only.'
                      : packageType === 'PREMIUM'
                        ? 'Premium package supports photo and video upload.'
                        : 'VIP package supports photo, video and voice message.'}
                  </p>
                </div>

                {preview && mediaType === 'image' && (
                  <img src={preview} alt="Preview" className="preview" />
                )}

                {preview && mediaType === 'video' && (
                  <video
                    src={preview}
                    controls
                    playsInline
                    className="video-preview"
                  />
                )}

                <div>
                  <label className="label">
                    Message for the couple{' '}
                    <span className="optional">(optional)</span>
                  </label>

                  <textarea
                    placeholder="Wishing you both a lifetime of happiness…"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    className="textarea"
                  />
                </div>

                {allowAudio && (
                  <div>
                    <label className="label">
                      Voice Message{' '}
                      <span className="optional">(optional)</span>
                    </label>

                    {!isRecording ? (
                      <button
                        type="button"
                        onClick={startRecording}
                        className="secondary-btn"
                      >
                        🎙️ Record Voice Message
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="danger-btn"
                      >
                        Stop Recording
                      </button>
                    )}

                    {audioPreview && (
                      <div style={{ marginTop: 10 }}>
                        <audio
                          controls
                          src={audioPreview}
                          style={{ width: '100%' }}
                        />

                        <button
                          type="button"
                          onClick={removeAudio}
                          className="secondary-btn"
                          style={{ marginTop: 8 }}
                        >
                          Remove Voice Message
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={handleUpload}
                  disabled={isUploading || isRecording}
                  className="primary-btn"
                >
                  {isUploading ? 'Uploading…' : 'Upload Memory'}
                </button>

                <button
                  onClick={() => setStep(2)}
                  className="secondary-btn"
                >
                  Back
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}