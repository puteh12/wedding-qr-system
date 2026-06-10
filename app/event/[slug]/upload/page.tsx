'use client'

import { useParams } from 'next/navigation'
import { useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function UploadPage() {
  const params = useParams()
  const slug = params.slug as string

  const [guestName, setGuestName] = useState('')
  const [message, setMessage] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioPreview, setAudioPreview] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)

  const [isUploading, setIsUploading] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const eventName = slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' & ')

  const brideName = eventName.split(' & ')[0]
  const groomName = eventName.split(' & ')[1]

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

    setFile(selectedFile)
    setPreview(URL.createObjectURL(selectedFile))
  }

  const startRecording = async () => {
    try {
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
    if (!audioBlob) return null

    const extension = getAudioExtension(audioBlob.type)
    const safeGuestName = guestName.trim().replace(/\s+/g, '-').toLowerCase()
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
      alert('Please enter your name and choose a photo')
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
      setAudioBlob(null)
      setAudioPreview(null)
    } catch {
      alert('Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; }
        input[type="text"]:focus, textarea:focus { outline: none; }
        input, textarea { transition: border-color 0.15s, background 0.15s; }
      `}</style>

      <div
        style={{
          minHeight: '100vh',
          background: '#FBF7F2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'DM Sans', sans-serif",
          padding: '32px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <svg
          style={{
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 0,
            width: '100%',
            height: '100%',
          }}
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

        <div
          style={{
            position: 'relative',
            zIndex: 2,
            background: '#fff',
            borderRadius: '6px',
            width: '100%',
            maxWidth: '520px',
            padding: '56px 48px',
            boxShadow:
              '0 18px 40px rgba(28,23,20,0.06), 0 0 0 1px rgba(184,150,90,0.06)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              width: 20,
              height: 20,
              borderTop: '1px solid #B8965A',
              borderLeft: '1px solid #B8965A',
              opacity: 0.45,
            }}
          />

          <div
            style={{
              position: 'absolute',
              bottom: 12,
              right: 12,
              width: 20,
              height: 20,
              borderBottom: '1px solid #B8965A',
              borderRight: '1px solid #B8965A',
              opacity: 0.45,
            }}
          />

          <div style={{ textAlign: 'center', marginBottom: '34px' }}>
            <p
              style={{
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.25em',
                textTransform: 'uppercase',
                color: '#C8B8B0',
                marginBottom: '8px',
              }}
            >
              Wedding Gallery
            </p>

            <div
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: '28px',
                fontWeight: 400,
                color: '#1C1714',
                lineHeight: 1.05,
              }}
            >
              {brideName}
            </div>

            <div
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: '20px',
                fontStyle: 'italic',
                color: '#C4847A',
                marginTop: '6px',
              }}
            >
              {groomName}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '10px',
                  fontWeight: 500,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: '#B8965A',
                  marginBottom: '6px',
                }}
              >
                Your Name
              </label>

              <input
                type="text"
                placeholder="e.g. Ahmad"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                style={{
                  width: '100%',
                  border: '1px solid rgba(28,23,20,0.06)',
                  background: '#FBF8F6',
                  padding: '12px 14px',
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: '16px',
                  color: '#1C1714',
                  borderRadius: '4px',
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '10px',
                  fontWeight: 500,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: '#B8965A',
                  marginBottom: '6px',
                }}
              >
                Photo
              </label>

              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '13px',
                  color: '#6F6A67',
                  border: '1px solid rgba(28,23,20,0.06)',
                  background: '#FBF7F4',
                  cursor: 'pointer',
                  borderRadius: '4px',
                }}
              />
            </div>

            {preview && (
              <img
                src={preview}
                alt="Preview"
                style={{
                  width: '100%',
                  height: '220px',
                  objectFit: 'cover',
                  borderRadius: '4px',
                  border: '1px solid rgba(28,23,20,0.04)',
                }}
              />
            )}

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '10px',
                  fontWeight: 500,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: '#B8965A',
                  marginBottom: '6px',
                }}
              >
                Message for the couple{' '}
                <span
                  style={{
                    color: '#C8B8B0',
                    fontWeight: 300,
                    textTransform: 'none',
                    letterSpacing: 0,
                  }}
                >
                  (optional)
                </span>
              </label>

              <textarea
                placeholder="Wishing you both a lifetime of happiness…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  border: '1px solid rgba(28,23,20,0.06)',
                  background: '#FBF7F4',
                  padding: '12px 14px',
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: '16px',
                  color: '#1C1714',
                  resize: 'none',
                  borderRadius: '4px',
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '10px',
                  fontWeight: 500,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: '#B8965A',
                  marginBottom: '6px',
                }}
              >
                Voice Message{' '}
                <span
                  style={{
                    color: '#C8B8B0',
                    fontWeight: 300,
                    textTransform: 'none',
                    letterSpacing: 0,
                  }}
                >
                  (optional)
                </span>
              </label>

              {!isRecording ? (
                <button
                  type="button"
                  onClick={startRecording}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: '#FBF7F4',
                    color: '#7B746F',
                    border: '1px solid rgba(184,150,90,0.22)',
                    borderRadius: '4px',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '12px',
                    fontWeight: 600,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  🎙️ Record Voice Message
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopRecording}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: '#C4847A',
                    color: '#FFF',
                    border: 'none',
                    borderRadius: '4px',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '12px',
                    fontWeight: 600,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  Stop Recording
                </button>
              )}

              {audioPreview && (
                <div style={{ marginTop: '10px' }}>
                  <audio controls src={audioPreview} style={{ width: '100%' }} />

                  <button
                    type="button"
                    onClick={removeAudio}
                    style={{
                      marginTop: '8px',
                      width: '100%',
                      padding: '10px 14px',
                      background: 'transparent',
                      color: '#9E8E86',
                      border: '1px solid rgba(28,23,20,0.06)',
                      borderRadius: '4px',
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '11px',
                      fontWeight: 600,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Remove Voice Message
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={handleUpload}
              disabled={isUploading || isRecording}
              style={{
                width: '100%',
                padding: '14px 24px',
                background: isUploading ? '#9B948D' : '#14110F',
                color: '#FFF',
                border: 'none',
                borderRadius: '3px',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                cursor: isUploading || isRecording ? 'not-allowed' : 'pointer',
              }}
            >
              {isUploading ? 'Uploading…' : 'Upload Memory'}
            </button>

            <button
              onClick={() => window.history.back()}
              style={{
                marginTop: '10px',
                width: '100%',
                padding: '12px 24px',
                background: 'transparent',
                color: '#7B746F',
                border: '1px solid rgba(28,23,20,0.06)',
                borderRadius: '3px',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </>
  )
}