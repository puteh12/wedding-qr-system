'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import QrCodeBox from './QrCodeBox'

type PackageType = 'BASIC' | 'PREMIUM' | 'VIP'
type QrType = 'upload' | 'gallery'

type WeddingEvent = {
  id: number
  slug: string
  bride_name: string
  groom_name: string
  package_type: PackageType
}

type PhotoRow = {
  id: number
  media_type: 'image' | 'video' | null
  audio_url: string | null
}

export default function EventPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params?.slug as string

  const [event, setEvent] = useState<WeddingEvent | null>(null)
  const [photos, setPhotos] = useState<PhotoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [qrZoomed, setQrZoomed] = useState<QrType | null>(null)
  const [copied, setCopied] = useState<QrType | null>(null)

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || 'http://10.10.0.170:3000'

  const uploadUrl = `${baseUrl}/event/${slug}/upload`
  const galleryUrl = `${baseUrl}/event/${slug}/gallery`

  const fallbackBrideName = slug
    ? slug.split('-')[0].charAt(0).toUpperCase() + slug.split('-')[0].slice(1)
    : 'Bride'

  const fallbackGroomName = slug
    ? slug
        .split('-')
        .slice(1)
        .join(' ')
        .replace(/\b\w/g, (character) => character.toUpperCase())
    : 'Groom'

  const brideName = event?.bride_name || fallbackBrideName
  const groomName = event?.groom_name || fallbackGroomName
  const packageType = event?.package_type || 'BASIC'

  const stats = useMemo(() => {
    return {
      total: photos.length,
      images: photos.filter((photo) => photo.media_type !== 'video').length,
      videos: photos.filter((photo) => photo.media_type === 'video').length,
      voice: photos.filter((photo) => Boolean(photo.audio_url)).length,
    }
  }, [photos])

  const packageInfo = useMemo(() => {
    if (packageType === 'VIP') {
      return {
        label: 'VIP',
        description:
          'Photos, videos and voice messages are enabled for this wedding.',
        features: ['Photos', 'Videos', 'Voice messages'],
      }
    }

    if (packageType === 'PREMIUM') {
      return {
        label: 'Premium',
        description: 'Photos and videos are enabled for this wedding.',
        features: ['Photos', 'Videos'],
      }
    }

    return {
      label: 'Basic',
      description: 'Photo uploads are enabled for this wedding.',
      features: ['Photos'],
    }
  }, [packageType])

  const zoomValue = qrZoomed === 'gallery' ? galleryUrl : uploadUrl
  const zoomTitle =
    qrZoomed === 'gallery' ? 'Couple Gallery QR' : 'Guest Upload QR'

  useEffect(() => {
    void fetchEventData()
  }, [slug])

  useEffect(() => {
    if (!qrZoomed) {
      document.body.style.overflow = ''
      return
    }

    document.body.style.overflow = 'hidden'

    const handleEscape = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === 'Escape') {
        setQrZoomed(null)
      }
    }

    window.addEventListener('keydown', handleEscape)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleEscape)
    }
  }, [qrZoomed])

  async function fetchEventData() {
    setLoading(true)

    const [eventResult, photosResult] = await Promise.all([
      supabase
        .from('events')
        .select('id, slug, bride_name, groom_name, package_type')
        .eq('slug', slug)
        .maybeSingle(),
      supabase
        .from('photos')
        .select('id, media_type, audio_url')
        .eq('slug', slug),
    ])

    if (eventResult.error) {
      console.error('FETCH_EVENT_ERROR:', eventResult.error)
    } else if (eventResult.data) {
      setEvent(eventResult.data as WeddingEvent)
    }

    if (photosResult.error) {
      console.error('FETCH_PHOTOS_ERROR:', photosResult.error)
    } else if (photosResult.data) {
      setPhotos(photosResult.data as PhotoRow[])
    }

    setLoading(false)
  }

  const copyLink = async (type: QrType) => {
    const value = type === 'upload' ? uploadUrl : galleryUrl

    try {
      await navigator.clipboard.writeText(value)
      setCopied(type)
      window.setTimeout(() => setCopied(null), 1800)
    } catch (error) {
      console.error('COPY_LINK_ERROR:', error)
      alert('Unable to copy link. Please copy it manually.')
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=DM+Sans:wght@300;400;500;600&display=swap');

        :root {
          --event-bg: #f4ede7;
          --event-card: rgba(255, 252, 249, 0.9);
          --event-ink: #231713;
          --event-muted: #8d7b73;
          --event-soft: #b7a59c;
          --event-accent: #a76356;
          --event-accent-dark: #80483f;
          --event-line: rgba(89, 53, 44, 0.11);
        }

        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
          background: var(--event-bg);
          color: var(--event-ink);
        }

        button,
        a {
          font: inherit;
        }

        .event-page {
          min-height: 100vh;
          overflow-x: hidden;
          background:
            radial-gradient(circle at 7% 4%, rgba(198, 141, 120, 0.18), transparent 28%),
            radial-gradient(circle at 92% 7%, rgba(228, 191, 177, 0.22), transparent 28%),
            linear-gradient(180deg, #f9f3ee 0%, #f3ece6 54%, #ece2da 100%);
          font-family: 'DM Sans', sans-serif;
        }

        .event-topbar {
          position: sticky;
          top: 0;
          z-index: 30;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 15px clamp(16px, 4vw, 52px);
          border-bottom: 1px solid rgba(78, 47, 39, 0.08);
          background: rgba(249, 243, 238, 0.82);
          backdrop-filter: blur(18px);
        }

        .brand-lockup {
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--event-ink);
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
          color: var(--event-accent);
          font-family: 'Cormorant Garamond', serif;
          font-style: italic;
        }

        .brand-text {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.2em;
          text-transform: uppercase;
        }

        .topbar-button {
          border: 1px solid var(--event-line);
          border-radius: 999px;
          padding: 10px 15px;
          background: rgba(255, 252, 249, 0.72);
          color: var(--event-muted);
          cursor: pointer;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.11em;
          text-transform: uppercase;
        }

        .event-shell {
          width: min(1280px, 100%);
          margin: 0 auto;
          padding: 34px clamp(14px, 4vw, 48px) 74px;
        }

        .event-hero {
          display: grid;
          grid-template-columns: minmax(0, 1.45fr) minmax(290px, 0.55fr);
          align-items: start;
          gap: 20px;
          margin-bottom: 20px;
        }

        .hero-card,
        .package-card,
        .stats-card,
        .qr-section {
          border: 1px solid rgba(91, 55, 46, 0.09);
          background: var(--event-card);
          box-shadow: 0 18px 46px rgba(67, 39, 31, 0.07);
          backdrop-filter: blur(18px);
        }

        .hero-card {
          position: relative;
          overflow: hidden;
          min-height: 330px;
          border-radius: 24px;
          padding: clamp(30px, 5vw, 54px);
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .hero-card::before {
          content: '';
          position: absolute;
          width: 250px;
          height: 250px;
          right: -90px;
          top: -90px;
          border-radius: 50%;
          background: rgba(196, 132, 112, 0.11);
        }

        .hero-eyebrow {
          position: relative;
          z-index: 1;
          margin: 0 0 16px;
          color: var(--event-accent);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.28em;
          text-transform: uppercase;
        }

        .hero-title {
          position: relative;
          z-index: 1;
          margin: 0;
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(58px, 7.2vw, 94px);
          font-weight: 500;
          line-height: 0.84;
          letter-spacing: -0.052em;
          color: var(--event-ink);
        }

        .hero-title {
          position: relative;
          z-index: 1;
          margin: 0;

          display: flex;
          align-items: baseline;
          flex-wrap: wrap;
          gap: 10px 18px;

          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(58px, 7vw, 94px);
          font-weight: 500;
          line-height: 0.9;
          letter-spacing: -0.052em;
          color: var(--event-ink);
        }

        .hero-bride {
          color: var(--event-ink);
        }

        .hero-ampersand {
          font-size: 0.55em;
          font-weight: 400;
          font-style: italic;
          color: #c28d80;
        }

        .hero-groom {
          color: var(--event-accent);
          font-weight: 400;
          font-style: italic;
        }

        .hero-subline {
          position: relative;
          z-index: 1;
          display: flex;
          flex-wrap: wrap;
          gap: 10px 20px;
          margin-top: 26px;
          color: var(--event-muted);
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .hero-subline span {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .hero-subline span::before {
          content: '';
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: rgba(167, 99, 86, 0.6);
        }

        .package-card {
          min-height: 260px;
          align-self: start;
          border-radius: 24px;
          padding: 28px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .package-label {
          margin: 0 0 8px;
          color: var(--event-soft);
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .package-name {
          margin: 0;
          font-family: 'Cormorant Garamond', serif;
          font-size: 42px;
          font-weight: 600;
          color: var(--event-ink);
        }

        .package-description {
          margin: 12px 0 0;
          color: var(--event-muted);
          font-size: 13px;
          line-height: 1.7;
        }

        .feature-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 24px;
        }

        .feature-pill {
          padding: 8px 10px;
          border-radius: 999px;
          background: rgba(167, 99, 86, 0.08);
          color: var(--event-accent-dark);
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        }

        .stats-card {
          border-radius: 24px;
          padding: 16px;
          margin-bottom: 20px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .stat-item {
          padding: 16px;
          border-radius: 16px;
          background: rgba(255, 252, 249, 0.74);
          border: 1px solid rgba(91, 55, 46, 0.07);
        }

        .stat-value {
          display: block;
          margin-bottom: 4px;
          font-family: 'Cormorant Garamond', serif;
          font-size: 32px;
          font-weight: 600;
        }

        .stat-label {
          color: var(--event-soft);
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.13em;
          text-transform: uppercase;
        }

        .qr-section {
          border-radius: 24px;
          padding: clamp(20px, 3vw, 32px);
        }

        .section-head {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 22px;
        }

        .section-kicker {
          margin: 0 0 6px;
          color: var(--event-accent);
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .section-title {
          margin: 0;
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(32px, 4.4vw, 46px);
          font-weight: 600;
        }

        .section-copy {
          max-width: 410px;
          margin: 0;
          color: var(--event-muted);
          font-size: 12px;
          line-height: 1.7;
          text-align: right;
        }

        .qr-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .qr-card {
          display: grid;
          grid-template-columns: 150px minmax(0, 1fr);
          gap: 18px;
          align-items: center;
          min-width: 0;
          padding: 18px;
          border: 1px solid rgba(92, 57, 47, 0.08);
          border-radius: 18px;
          background: rgba(255, 253, 251, 0.8);
          overflow: hidden;
        }

        .qr-frame {
          width: 150px;
          aspect-ratio: 1;
          height: auto;
          display: grid;
          place-items: center;
          overflow: hidden;
          padding: 10px;
          border: 1px solid rgba(167, 99, 86, 0.14);
          border-radius: 14px;
          background: #fff;
          cursor: zoom-in;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .qr-frame:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 34px rgba(67, 39, 31, 0.12);
        }

        .qr-frame svg,
        .qr-frame canvas {
          display: block;
          width: 100% !important;
          height: 100% !important;
          max-width: 100%;
          max-height: 100%;
        }

        .qr-content {
          min-width: 0;
        }

        .qr-content h3 {
          margin: 0;
          font-family: 'Cormorant Garamond', serif;
          font-size: 26px;
          font-weight: 600;
        }

        .qr-content p {
          margin: 7px 0 0;
          color: var(--event-muted);
          font-size: 12px;
          line-height: 1.55;
        }

        .qr-link-box {
          margin-top: 12px;
          padding: 9px 10px;
          border: 1px solid rgba(92, 57, 47, 0.08);
          border-radius: 10px;
          background: rgba(243, 236, 230, 0.72);
          color: var(--event-soft);
          font-size: 9px;
          line-height: 1.5;
          word-break: break-all;
        }

        .qr-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 12px;
        }

        .action-primary,
        .action-secondary {
          border-radius: 999px;
          padding: 9px 12px;
          cursor: pointer;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.09em;
          text-decoration: none;
          text-transform: uppercase;
        }

        .action-primary {
          border: 0;
          background: var(--event-ink);
          color: #fffaf6;
        }

        .action-secondary {
          border: 1px solid var(--event-line);
          background: transparent;
          color: var(--event-muted);
        }

        .qr-overlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(22, 12, 9, 0.82);
          backdrop-filter: blur(16px);
        }

        .qr-modal {
          position: relative;
          width: min(440px, 100%);
          padding: 32px;
          border-radius: 22px;
          background: #fffaf6;
          box-shadow: 0 40px 120px rgba(0,0,0,0.35);
          text-align: center;
        }

        .qr-modal-name {
          margin: 0;
          font-family: 'Cormorant Garamond', serif;
          font-size: 32px;
          font-weight: 600;
        }

        .qr-modal-type {
          margin: 8px 0 18px;
          color: var(--event-accent);
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .qr-modal-frame {
          display: inline-grid;
          place-items: center;
          width: min(280px, 72vw);
          aspect-ratio: 1;
          padding: 16px;
          border: 1px solid rgba(167, 99, 86, 0.16);
          border-radius: 16px;
          background: #fff;
          overflow: hidden;
        }

        .qr-modal-frame svg,
        .qr-modal-frame canvas {
          display: block;
          width: 100% !important;
          height: 100% !important;
          max-width: 100%;
          max-height: 100%;
        }

        .qr-modal-close {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 38px;
          height: 38px;
          border: 0;
          border-radius: 50%;
          background: rgba(35, 23, 19, 0.08);
          color: var(--event-ink);
          cursor: pointer;
          font-size: 20px;
        }

        .loading-card {
          min-height: 70vh;
          display: grid;
          place-items: center;
        }

        .loading-text {
          color: var(--event-muted);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }

        @media (max-width: 1040px) {
          .event-hero {
            grid-template-columns: 1fr;
          }

          .package-card {
            min-height: auto;
          }

          .qr-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 760px) {
          .section-head {
            align-items: flex-start;
            flex-direction: column;
          }

          .section-copy {
            text-align: left;
          }

          .stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .event-shell {
            padding-top: 22px;

          .hero-title {
            justify-content: flex-start;
            gap: 6px 10px;
            font-size: clamp(50px, 16vw, 72px);
          }

          .hero-ampersand {
            font-size: 0.5em;
          }
          }

          .brand-text {
            display: none;
          }

          .hero-card,
          .package-card,
          .stats-card,
          .qr-section {
            border-radius: 20px;
          }

          .hero-card {
            min-height: 300px;
            padding: 32px 22px;
          }

          .hero-title {
            font-size: clamp(56px, 19vw, 78px);
          }

          .qr-card {
            grid-template-columns: 1fr;
          }

          .qr-frame {
            width: min(220px, 100%);
            margin: 0 auto;
          }

          .qr-content {
            text-align: center;
          }

          .qr-actions {
            justify-content: center;
          }
        }
      `}</style>

      {qrZoomed && (
        <div className="qr-overlay" onClick={() => setQrZoomed(null)}>
          <div className="qr-modal" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="qr-modal-close"
              onClick={() => setQrZoomed(null)}
              aria-label="Close QR code"
            >
              ×
            </button>

            <h2 className="qr-modal-name">
              {brideName} & {groomName}
            </h2>
            <p className="qr-modal-type">{zoomTitle}</p>

            <div className="qr-modal-frame">
              <QrCodeBox value={zoomValue} />
            </div>
          </div>
        </div>
      )}

      <main className="event-page">
        <header className="event-topbar">
          <a href="/" className="brand-lockup">
            <span className="brand-mark">W</span>
            <span className="brand-text">Wedding Memories</span>
          </a>

          <button
            type="button"
            className="topbar-button"
            onClick={() => router.push('/create-event')}
          >
            Create another event
          </button>
        </header>

        {loading ? (
          <div className="loading-card">
            <p className="loading-text">Preparing your wedding dashboard...</p>
          </div>
        ) : (
          <div className="event-shell">
            <section className="event-hero">
              <div className="hero-card">
                <p className="hero-eyebrow">Wedding event dashboard</p>

                <h1 className="hero-title">
                  <span className="hero-bride">{brideName}</span>
                  <span className="hero-ampersand">&</span>
                  <em className="hero-groom">{groomName}</em>
                </h1>

                <div className="hero-subline">
                  <span>{stats.total} memories collected</span>
                  <span>{packageType} package</span>
                </div>
              </div>

              <aside className="package-card">
                <div>
                  <p className="package-label">Current package</p>
                  <h2 className="package-name">{packageInfo.label}</h2>
                  <p className="package-description">
                    {packageInfo.description}
                  </p>
                </div>

                <div className="feature-list">
                  {packageInfo.features.map((feature) => (
                    <span key={feature} className="feature-pill">
                      {feature}
                    </span>
                  ))}
                </div>
              </aside>
            </section>

            <section className="stats-card">
              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-value">{stats.total}</span>
                  <span className="stat-label">Total memories</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{stats.images}</span>
                  <span className="stat-label">Photos</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{stats.videos}</span>
                  <span className="stat-label">Videos</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{stats.voice}</span>
                  <span className="stat-label">Voice notes</span>
                </div>
              </div>
            </section>

            <section className="qr-section">
              <div className="section-head">
                <div>
                  <p className="section-kicker">Share your wedding</p>
                  <h2 className="section-title">QR codes and links</h2>
                </div>

                <p className="section-copy">
                  Use the guest QR for uploads and keep the gallery QR for the
                  couple, family or selected guests.
                </p>
              </div>

              <div className="qr-grid">
                <article className="qr-card">
                  <div
                    className="qr-frame"
                    onClick={() => setQrZoomed('upload')}
                  >
                    <QrCodeBox value={uploadUrl} />
                  </div>

                  <div className="qr-content">
                    <h3>Guest upload</h3>
                    <p>
                      Guests scan this code to share memories based on the
                      selected package.
                    </p>

                    <div className="qr-link-box">{uploadUrl}</div>

                    <div className="qr-actions">
                      <a href={uploadUrl} className="action-primary">
                        Open upload
                      </a>
                      <button
                        type="button"
                        className="action-secondary"
                        onClick={() => copyLink('upload')}
                      >
                        {copied === 'upload' ? 'Copied' : 'Copy link'}
                      </button>
                      <button
                        type="button"
                        className="action-secondary"
                        onClick={() => setQrZoomed('upload')}
                      >
                        Enlarge QR
                      </button>
                    </div>
                  </div>
                </article>

                <article className="qr-card">
                  <div
                    className="qr-frame"
                    onClick={() => setQrZoomed('gallery')}
                  >
                    <QrCodeBox value={galleryUrl} />
                  </div>

                  <div className="qr-content">
                    <h3>Couple gallery</h3>
                    <p>
                      Open the live gallery to view every memory shared during
                      the celebration.
                    </p>

                    <div className="qr-link-box">{galleryUrl}</div>

                    <div className="qr-actions">
                      <a href={galleryUrl} className="action-primary">
                        Open gallery
                      </a>
                      <button
                        type="button"
                        className="action-secondary"
                        onClick={() => copyLink('gallery')}
                      >
                        {copied === 'gallery' ? 'Copied' : 'Copy link'}
                      </button>
                      <button
                        type="button"
                        className="action-secondary"
                        onClick={() => setQrZoomed('gallery')}
                      >
                        Enlarge QR
                      </button>
                    </div>
                  </div>
                </article>
              </div>
            </section>
          </div>
        )}
      </main>
    </>
  )
}
