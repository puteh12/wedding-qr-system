'use client'

import { useParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

type PackageType = 'BASIC' | 'PREMIUM' | 'VIP'
type MediaType = 'image' | 'video'

type WeddingEvent = {
  id: number
  slug: string
  bride_name: string
  groom_name: string
  package_type: PackageType
}

const MAX_IMAGE_SIZE = 15 * 1024 * 1024
const MAX_VIDEO_SIZE = 120 * 1024 * 1024

export default function UploadPage() {
  const params = useParams()
  const slug = params.slug as string

  const [step, setStep] = useState(1)
  const [event, setEvent] = useState<WeddingEvent | null>(null)
  const [eventLoading, setEventLoading] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [message, setMessage] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<MediaType>('image')
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioPreview, setAudioPreview] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const [success, setSuccess] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
      if (progressTimerRef.current) clearInterval(progressTimerRef.current)
    }
  }, [preview, audioPreview])

  async function fetchEvent() {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, slug, bride_name, groom_name, package_type')
        .eq('slug', slug)
        .maybeSingle()

      if (error) {
        console.error('FETCH_EVENT_ERROR:', error)
        return
      }

      if (data) {
        setEvent(data as WeddingEvent)
      }
    } catch (error) {
      console.error('FETCH_EVENT_ERROR:', error)
    } finally {
      setEventLoading(false)
    }
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

  const validateFile = (selectedFile: File) => {
    const isVideo = selectedFile.type.startsWith('video/')
    const isImage = selectedFile.type.startsWith('image/')

    if (!isImage && !isVideo) {
      return 'Please choose an image or video file.'
    }

    if (isVideo && !allowVideo) {
      return 'Video upload is only available for Premium and VIP packages.'
    }

    if (isImage && selectedFile.size > MAX_IMAGE_SIZE) {
      return 'Image is too large. Maximum size is 15 MB.'
    }

    if (isVideo && selectedFile.size > MAX_VIDEO_SIZE) {
      return 'Video is too large. Maximum size is 120 MB.'
    }

    return ''
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage('')

    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return

    const validationError = validateFile(selectedFile)

    if (validationError) {
      setErrorMessage(validationError)
      event.target.value = ''
      return
    }

    if (preview) URL.revokeObjectURL(preview)

    const isVideo = selectedFile.type.startsWith('video/')

    setFile(selectedFile)
    setMediaType(isVideo ? 'video' : 'image')
    setPreview(URL.createObjectURL(selectedFile))
  }

  const startRecording = async () => {
    setErrorMessage('')

    try {
      if (!allowAudio) {
        setErrorMessage('Voice message is only available for VIP package.')
        return
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setErrorMessage('Voice recording is not supported on this browser.')
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
      setErrorMessage('Microphone permission denied or not supported.')
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

  const startFakeProgress = () => {
    setUploadProgress(8)

    progressTimerRef.current = setInterval(() => {
      setUploadProgress((current) => {
        if (current >= 88) return current
        return current + Math.max(2, Math.round((90 - current) / 8))
      })
    }, 350)
  }

  const stopFakeProgress = (complete = false) => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current)
      progressTimerRef.current = null
    }

    setUploadProgress(complete ? 100 : 0)
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
    setErrorMessage('')
    setUploadProgress(0)
    setSuccess(false)
    setStep(1)
  }

  const handleUpload = async () => {
    setErrorMessage('')

    if (!guestName.trim()) {
      setErrorMessage('Please enter your name before uploading.')
      return
    }

    if (!file) {
      setErrorMessage('Please choose a photo or video.')
      return
    }

    const validationError = validateFile(file)

    if (validationError) {
      setErrorMessage(validationError)
      return
    }

    try {
      setIsUploading(true)
      startFakeProgress()

      const audioUrl = await uploadAudioToSupabase()
      const formData = new FormData()

      formData.append('file', file)
      formData.append('slug', slug)
      formData.append('guestName', guestName.trim())
      formData.append('message', message.trim())
      formData.append('mediaType', mediaType)

      if (audioUrl) {
        formData.append('audioUrl', audioUrl)
      }

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed')
      }

      stopFakeProgress(true)

      window.setTimeout(() => {
        setSuccess(true)
        setIsUploading(false)
      }, 450)
    } catch (error) {
      console.error('UPLOAD_ERROR:', error)
      stopFakeProgress(false)
      setIsUploading(false)
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Upload failed. Please try again.'
      )
    }
  }

  if (success) {
    return (
      <>
        <style>{sharedStyles}</style>

        <main className="upload-page success-page">
          <section className="success-card">
            <div className="success-icon" aria-hidden="true">✓</div>
            <p className="success-kicker">Memory shared</p>

            <h1 className="success-title">
              Thank you, <em>{guestName}.</em>
            </h1>

            <p className="success-copy">
              Thank you for celebrating with us. Your memory has been safely
              shared with {brideName} & {groomName}.
            </p>

            <div className="success-divider" aria-hidden="true" />

            <div className="success-actions">
              <button
                type="button"
                className="success-primary-button"
                onClick={resetForm}
              >
                <span>Share Another Memory</span>
                <span className="success-button-arrow" aria-hidden="true">→</span>
              </button>
            </div>

            <p className="success-note">
              You may now close this page or share another moment.
            </p>
          </section>
        </main>
      </>
    )
  }

  return (
    <>
      <style>{sharedStyles}</style>

      <main className="upload-page">
        <section className="upload-shell">
          <header className="upload-header">
            <a href={`/event/${slug}`} className="brand-lockup">
              <span className="brand-mark">W</span>
              <span className="brand-text">Wedding Memories</span>
            </a>

            <div className="header-meta">
              <span className="header-couple">{brideName} & {groomName}</span>
              <span className="package-badge">{packageType}</span>
            </div>
          </header>

          {step === 1 && (
            <section className="step-card">
              <p className="step-kicker">Guest memory collection</p>

              <h1 className="step-title">
                Share a memory with
                <em>
                  {brideName} & {groomName}
                </em>
              </h1>

              <p className="step-copy">
                Add your name first. You can then upload a photo or video and
                leave a personal message for the couple.
              </p>

              <div className="field">
                <label className="field-label">Your name</label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(event) => setGuestName(event.target.value)}
                  placeholder="e.g. Sarah"
                  autoFocus
                />
              </div>

              {errorMessage && <div className="error-box">{errorMessage}</div>}

              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  setErrorMessage('')

                  if (!guestName.trim()) {
                    setErrorMessage('Please enter your name to continue.')
                    return
                  }

                  setStep(2)
                }}
              >
                Continue
              </button>
            </section>
          )}

          {step === 2 && (
            <section className="step-card">
              <p className="step-kicker">Share your favourite moment</p>
              <h1 className="step-title">
                Add a beautiful
                <em>moment.</em>
              </h1>

              <label className="upload-zone">
                <input
                  type="file"
                  accept={allowVideo ? 'image/*,video/*' : 'image/*'}
                  onChange={handleFileChange}
                />

                {!preview ? (
                  <>
                    <span className="upload-symbol">＋</span>
                    <strong>
                      Choose a photo{allowVideo ? ' or video' : ''}
                    </strong>
                    <small>
                      Images up to 15 MB
                      {allowVideo ? ' · Videos up to 120 MB' : ''}
                    </small>
                  </>
                ) : (
                  <>
                    <span className="upload-symbol success">✓</span>
                    <strong>{file?.name}</strong>
                    <small>Tap to choose a different file</small>
                  </>
                )}
              </label>

              {preview && mediaType === 'image' && (
                <img
                  src={preview}
                  alt="Selected memory preview"
                  className="preview-media"
                />
              )}

              {preview && mediaType === 'video' && (
                <video
                  src={preview}
                  controls
                  playsInline
                  className="preview-media video"
                />
              )}

              <div className="field">
                <label className="field-label">
                  Message <span>Optional</span>
                </label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Write a wish for the couple…"
                />
              </div>

              {allowAudio && (
                <div className="voice-card">
                  <div>
                    <strong>Voice message</strong>
                    <small>Optional · VIP package</small>
                  </div>

                  {!isRecording ? (
                    <button
                      type="button"
                      className="voice-button"
                      onClick={startRecording}
                    >
                      Record
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="voice-button recording"
                      onClick={stopRecording}
                    >
                      Stop
                    </button>
                  )}

                  {audioPreview && (
                    <div className="audio-preview">
                      <audio controls src={audioPreview} />
                      <button type="button" onClick={removeAudio}>
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              )}

              {errorMessage && <div className="error-box">{errorMessage}</div>}

              <div className="button-row">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setStep(1)}
                >
                  Back
                </button>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => {
                    setErrorMessage('')

                    if (!file) {
                      setErrorMessage('Please choose a photo or video.')
                      return
                    }

                    setStep(3)
                  }}
                >
                  Review memory
                </button>
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="step-card">
              <p className="step-kicker">Final review</p>
              <h1 className="step-title">
                Review your
                <em>memory.</em>
              </h1>

              <div className="review-grid">
                <div className="review-media">
                  {mediaType === 'video' && preview ? (
                    <video src={preview} controls playsInline />
                  ) : (
                    <img src={preview || ''} alt="Memory preview" />
                  )}
                </div>

                <div className="review-details">
                  <div>
                    <small>Shared by</small>
                    <strong>{guestName}</strong>
                  </div>

                  <div>
                    <small>Media</small>
                    <strong>{mediaType === 'video' ? 'Video' : 'Photo'}</strong>
                  </div>

                  {message && (
                    <div>
                      <small>Message</small>
                      <p>“{message}”</p>
                    </div>
                  )}

                  {audioBlob && (
                    <div>
                      <small>Voice message</small>
                      <strong>Included</strong>
                    </div>
                  )}
                </div>
              </div>

              {isUploading && (
                <div className="upload-progress">
                  <div className="upload-progress-head">
                    <span>Uploading your memory</span>
                    <strong>{uploadProgress}%</strong>
                  </div>
                  <div className="upload-progress-track">
                    <div
                      className="upload-progress-value"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {errorMessage && <div className="error-box">{errorMessage}</div>}

              <div className="button-row">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setStep(2)}
                  disabled={isUploading}
                >
                  Back
                </button>
                <button
                  type="button"
                  className="primary-button"
                  onClick={handleUpload}
                  disabled={isUploading || isRecording}
                >
                  {isUploading ? 'Uploading…' : 'Share memory'}
                </button>
              </div>
            </section>
          )}
        </section>
      </main>
    </>
  )
}

const sharedStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=DM+Sans:wght@300;400;500;600&display=swap');

  :root {
    --upload-bg: #f4ede7;
    --upload-surface: rgba(255, 252, 249, 0.92);
    --upload-ink: #241713;
    --upload-muted: #8d7b73;
    --upload-soft: #b7a59c;
    --upload-accent: #a76356;
    --upload-accent-dark: #80483f;
    --upload-line: rgba(89, 53, 44, 0.11);
  }

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    background: var(--upload-bg);
    color: var(--upload-ink);
  }

  button,
  input,
  textarea {
    font: inherit;
  }

  .loading-screen,
  .upload-page {
    min-height: 100vh;
    min-height: 100dvh;
    font-family: 'DM Sans', sans-serif;
  }

  .loading-screen {
    display: grid;
    place-items: center;
    background: var(--upload-bg);
    color: var(--upload-muted);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }

  .upload-page {
    display: grid;
    place-items: center;
    padding: 30px 16px;
    background:
      radial-gradient(circle at 8% 5%, rgba(198, 141, 120, 0.2), transparent 28%),
      radial-gradient(circle at 92% 8%, rgba(228, 191, 177, 0.23), transparent 30%),
      linear-gradient(180deg, #f9f3ee 0%, #f3ece6 52%, #ece2da 100%);
  }

  .upload-shell,
  .success-card {
    width: min(720px, 100%);
    border: 1px solid rgba(91, 55, 46, 0.09);
    border-radius: 26px;
    background: var(--upload-surface);
    box-shadow: 0 24px 70px rgba(67, 39, 31, 0.11);
    backdrop-filter: blur(18px);
  }

  .upload-shell {
    overflow: hidden;
  }

  .upload-shell::before {
    content: '';
    display: block;
    height: 4px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(167, 99, 86, 0.68),
      transparent
    );
  }

  .upload-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    padding: 20px 24px;
    border-bottom: 1px solid var(--upload-line);
    background: rgba(255, 253, 251, 0.48);
  }

  .brand-lockup {
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--upload-ink);
    text-decoration: none;
  }

  .brand-mark {
    width: 30px;
    height: 30px;
    border: 1px solid rgba(167, 99, 86, 0.35);
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: rgba(255,255,255,0.68);
    color: var(--upload-accent);
    font-family: 'Cormorant Garamond', serif;
    font-style: italic;
  }

  .brand-text {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }

  .package-badge {
    padding: 8px 10px;
    border-radius: 999px;
    background: rgba(167, 99, 86, 0.08);
    color: var(--upload-accent-dark);
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.1em;
  }

  .header-meta {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .header-couple {
    max-width: 230px;
    overflow: hidden;
    color: var(--upload-soft);
    font-family: 'Cormorant Garamond', serif;
    font-size: 16px;
    font-style: italic;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .step-card {
    min-height: 570px;
    padding: clamp(42px, 6vw, 64px);
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .step-kicker {
    margin: 0 0 12px;
    color: var(--upload-accent);
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.17em;
    text-transform: uppercase;
  }

  .step-title {
    margin: 0;
    font-family: 'Cormorant Garamond', serif;
    font-size: clamp(42px, 7vw, 62px);
    font-weight: 600;
    line-height: 0.95;
  }

  .step-title em {
    display: block;
    margin-top: 8px;
    color: var(--upload-accent);
    font-weight: 400;
    font-style: italic;
  }

  .step-copy {
    max-width: 540px;
    margin: 20px 0 30px;
    color: var(--upload-muted);
    font-size: 13px;
    line-height: 1.75;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 24px;
  }

  .field-label {
    color: var(--upload-soft);
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.13em;
    text-transform: uppercase;
  }

  .field-label span {
    margin-left: 5px;
    font-weight: 400;
    letter-spacing: 0;
    text-transform: none;
  }

  .field input,
  .field textarea {
    width: 100%;
    border: 1px solid rgba(92, 57, 47, 0.1);
    border-radius: 16px;
    padding: 16px 17px;
    outline: none;
    resize: vertical;
    background: rgba(255, 253, 251, 0.82);
    color: var(--upload-ink);
    font-size: 14px;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }

  .field input:focus,
  .field textarea:focus {
    border-color: rgba(167, 99, 86, 0.45);
    box-shadow: 0 0 0 4px rgba(167, 99, 86, 0.08);
  }

  .upload-zone {
    position: relative;
    min-height: 190px;
    margin-top: 24px;
    border: 1.5px dashed rgba(167, 99, 86, 0.28);
    border-radius: 18px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 24px;
    background: rgba(255, 253, 251, 0.66);
    cursor: pointer;
    text-align: center;
  }

  .upload-zone input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
  }

  .upload-symbol {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: rgba(167, 99, 86, 0.08);
    color: var(--upload-accent);
    font-size: 22px;
  }

  .upload-symbol.success {
    background: rgba(85, 133, 94, 0.1);
    color: #5c8263;
  }

  .upload-zone strong {
    font-family: 'Cormorant Garamond', serif;
    font-size: 23px;
  }

  .upload-zone small {
    color: var(--upload-soft);
    font-size: 10px;
  }

  .preview-media {
    display: block;
    width: 100%;
    max-height: 360px;
    margin-top: 16px;
    border-radius: 18px;
    object-fit: cover;
    background: #17100d;
  }

  .preview-media.video {
    object-fit: contain;
  }

  .voice-card {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 14px;
    align-items: center;
    margin-top: 20px;
    padding: 16px;
    border: 1px solid rgba(92, 57, 47, 0.09);
    border-radius: 16px;
    background: rgba(255, 253, 251, 0.7);
  }

  .voice-card strong,
  .voice-card small {
    display: block;
  }

  .voice-card small {
    margin-top: 4px;
    color: var(--upload-soft);
    font-size: 9px;
  }

  .voice-button {
    border: 1px solid var(--upload-line);
    border-radius: 999px;
    padding: 9px 13px;
    background: transparent;
    color: var(--upload-muted);
    cursor: pointer;
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .voice-button.recording {
    background: rgba(167, 99, 86, 0.1);
    color: var(--upload-accent-dark);
  }

  .audio-preview {
    grid-column: 1 / -1;
  }

  .audio-preview audio {
    width: 100%;
  }

  .audio-preview button {
    margin-top: 8px;
    border: 0;
    background: transparent;
    color: var(--upload-accent);
    cursor: pointer;
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
  }

  .review-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.15fr) minmax(220px, 0.85fr);
    gap: 20px;
    margin-top: 26px;
  }

  .review-media {
    overflow: hidden;
    border-radius: 18px;
    background: #17100d;
  }

  .review-media img,
  .review-media video {
    display: block;
    width: 100%;
    height: 100%;
    max-height: 380px;
    object-fit: contain;
  }

  .review-details {
    display: grid;
    align-content: start;
    gap: 15px;
    padding: 18px;
    border: 1px solid rgba(92, 57, 47, 0.09);
    border-radius: 18px;
    background: rgba(255, 253, 251, 0.72);
  }

  .review-details small {
    display: block;
    margin-bottom: 5px;
    color: var(--upload-soft);
    font-size: 8px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .review-details strong {
    font-family: 'Cormorant Garamond', serif;
    font-size: 21px;
  }

  .review-details p {
    margin: 0;
    color: var(--upload-muted);
    font-family: 'Cormorant Garamond', serif;
    font-size: 18px;
    line-height: 1.45;
    font-style: italic;
  }

  .upload-progress {
    margin-top: 22px;
  }

  .upload-progress-head {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 8px;
    color: var(--upload-muted);
    font-size: 10px;
  }

  .upload-progress-track {
    height: 8px;
    overflow: hidden;
    border-radius: 999px;
    background: rgba(167, 99, 86, 0.1);
  }

  .upload-progress-value {
    height: 100%;
    border-radius: inherit;
    background: var(--upload-accent);
    transition: width 0.3s ease;
  }

  .error-box {
    margin-top: 16px;
    padding: 12px 14px;
    border: 1px solid rgba(171, 75, 65, 0.16);
    border-radius: 12px;
    background: rgba(171, 75, 65, 0.07);
    color: #984b42;
    font-size: 12px;
    line-height: 1.5;
  }

  .button-row,
  .success-actions {
    display: flex;
    gap: 10px;
    margin-top: 24px;
  }

  .primary-button,
  .secondary-button,
  .primary-action,
  .secondary-action {
    border-radius: 999px;
    padding: 15px 22px;
    cursor: pointer;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-align: center;
    text-decoration: none;
    text-transform: uppercase;
  }

  .primary-button,
  .primary-action {
    border: 0;
    background: var(--upload-ink);
    color: #fffaf6;
  }

  .step-card > .primary-button {
    width: fit-content;
    min-width: 180px;
    margin-top: 28px;
  }

  .button-row .primary-button,
  .button-row .secondary-button,
  .success-actions .primary-action,
  .success-actions .secondary-action {
    flex: 1;
  }

  .secondary-button,
  .secondary-action {
    border: 1px solid var(--upload-line);
    background: transparent;
    color: var(--upload-muted);
  }

  .primary-button:disabled,
  .secondary-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .success-page {
    padding: 30px 16px;
  }

  .success-card {
    width: min(760px, 100%);
    min-height: 540px;
    padding: clamp(48px, 8vw, 82px) clamp(28px, 8vw, 86px);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
  }

  .success-icon {
    width: 68px;
    height: 68px;
    margin: 0 auto 22px;
    border: 1px solid rgba(85, 133, 94, 0.16);
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: linear-gradient(
      145deg,
      rgba(111, 153, 118, 0.17),
      rgba(85, 133, 94, 0.08)
    );
    color: #5c8263;
    box-shadow: 0 12px 30px rgba(85, 133, 94, 0.1);
    font-family: 'Cormorant Garamond', serif;
    font-size: 31px;
  }

  .success-kicker {
    margin: 0 0 16px;
    color: var(--upload-accent);
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.2em;
    text-transform: uppercase;
  }

  .success-title {
    margin: 0;
    font-family: 'Cormorant Garamond', serif;
    font-size: clamp(46px, 7vw, 68px);
    font-weight: 600;
    line-height: 0.98;
    letter-spacing: -0.025em;
  }

  .success-title em {
    color: var(--upload-accent);
    font-weight: 400;
    font-style: italic;
  }

  .success-copy {
    max-width: 520px;
    margin: 22px auto 0;
    color: var(--upload-muted);
    font-size: 14px;
    line-height: 1.8;
  }

  .success-divider {
    width: 72px;
    height: 1px;
    margin: 32px auto 0;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(167, 99, 86, 0.46),
      transparent
    );
  }

  .success-actions {
    width: 100%;
    display: flex;
    justify-content: center;
    margin-top: 32px;
  }

  .success-primary-button {
    width: min(390px, 100%);
    min-height: 58px;
    border: 0;
    border-radius: 999px;
    padding: 0 24px 0 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 18px;
    background: linear-gradient(135deg, #281814 0%, #3a241f 100%);
    color: #fffaf6;
    box-shadow: 0 16px 34px rgba(36, 23, 19, 0.19);
    cursor: pointer;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    transition:
      transform 0.2s ease,
      box-shadow 0.2s ease,
      background 0.2s ease;
  }

  .success-primary-button:hover {
    transform: translateY(-2px);
    background: linear-gradient(135deg, #35211c 0%, #4a2d26 100%);
    box-shadow: 0 20px 42px rgba(36, 23, 19, 0.24);
  }

  .success-primary-button:active {
    transform: translateY(0);
  }

  .success-button-arrow {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: rgba(255, 255, 255, 0.1);
    font-size: 15px;
    letter-spacing: 0;
  }

  .success-note {
    margin: 18px 0 0;
    color: var(--upload-soft);
    font-size: 10px;
    line-height: 1.6;
  }

  @media (max-width: 680px) {
    .upload-page {
      padding: 0;
      align-items: stretch;
    }

    .upload-shell,
    .success-card {
      min-height: 100dvh;
      border-radius: 0;
    }

    .brand-text,
    .header-couple {
      display: none;
    }

    .upload-header {
      padding: 17px 18px;
    }

    .step-card {
      min-height: calc(100dvh - 78px);
      padding: 38px 20px 52px;
      justify-content: flex-start;
    }

    .step-card > .primary-button {
      width: 100%;
      margin-top: 24px;
    }

    .review-grid {
      grid-template-columns: 1fr;
    }

    .button-row {
      flex-direction: column-reverse;
    }

    .success-page {
      padding: 0;
    }

    .success-card {
      min-height: 100dvh;
      padding: 52px 22px;
      border-radius: 0;
    }

    .success-title {
      font-size: clamp(43px, 14vw, 58px);
    }

    .success-copy {
      font-size: 13px;
    }

    .success-actions {
      margin-top: 28px;
    }

    .success-primary-button {
      width: 100%;
    }
  }
`
