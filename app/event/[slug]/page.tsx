'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import QrCodeBox from './QrCodeBox'

type PackageType = 'BASIC' | 'PREMIUM' | 'VIP'

type WeddingEvent = {
  id: number
  slug: string
  bride_name: string
  groom_name: string
  package_type: PackageType
}

export default function EventPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params?.slug as string

  const [event, setEvent] = useState<WeddingEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [qrZoomed, setQrZoomed] = useState<'upload' | 'gallery' | null>(null)

  const uploadUrl = `https://wedding-qr-system.vercel.app/event/${slug}/upload`
  const galleryUrl = `https://wedding-qr-system.vercel.app/event/${slug}/gallery`

  const fallbackBrideName = slug
    ? slug.split('-')[0].charAt(0).toUpperCase() + slug.split('-')[0].slice(1)
    : ''

  const fallbackGroomName = slug
    ? slug.split('-').slice(1).join(' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : ''

  const brideName = event?.bride_name || fallbackBrideName
  const groomName = event?.groom_name || fallbackGroomName
  const packageType = event?.package_type || 'BASIC'

  const zoomValue = qrZoomed === 'gallery' ? galleryUrl : uploadUrl
  const zoomTitle = qrZoomed === 'gallery' ? 'Couple Gallery QR' : 'Guest Upload QR'

  useEffect(() => {
    fetchEvent()
  }, [slug])

  async function fetchEvent() {
    setLoading(true)

    const { data, error } = await supabase
      .from('events')
      .select('id, slug, bride_name, groom_name, package_type')
      .eq('slug', slug)
      .single()

    if (!error && data) {
      setEvent(data as WeddingEvent)
    }

    setLoading(false)
  }

  const getPackageDesc = () => {
    if (packageType === 'VIP') {
      return 'Photo, video and voice message are enabled for this wedding.'
    }

    if (packageType === 'PREMIUM') {
      return 'Photo and video upload are enabled for this wedding.'
    }

    return 'Photo upload is enabled for this wedding.'
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .event-page {
          min-height: 100vh;
          background-color: #FAF7F2;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'DM Sans', sans-serif;
          position: relative;
          overflow: hidden;
          padding: 24px;
        }

        .event-card {
          position: relative;
          z-index: 2;
          background: #FFFFFF;
          border-radius: 4px;
          width: 100%;
          max-width: 720px;
          padding: 44px 40px 40px;
          box-shadow: 0 2px 4px rgba(28,23,20,0.04), 0 12px 40px rgba(28,23,20,0.09), 0 0 0 1px rgba(184,150,90,0.14);
          text-align: center;
        }

        .event-eyebrow {
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: #B8965A;
          margin-bottom: 6px;
        }

        .event-couple {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(28px, 6vw, 38px);
          font-weight: 300;
          color: #1C1714;
          line-height: 1.15;
          letter-spacing: -0.01em;
        }

        .event-couple em {
          font-style: italic;
          color: #C4847A;
        }

        .event-divider {
          font-family: 'Cormorant Garamond', serif;
          font-style: italic;
          color: #D4A0A0;
          font-size: 20px;
          display: block;
          margin: 2px 0;
        }

        .package-badge {
          margin-top: 16px;
          display: inline-block;
          padding: 7px 14px;
          border-radius: 999px;
          background: #FBF7F4;
          border: 1px solid rgba(184,150,90,0.18);
          color: #B8965A;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .package-desc {
          margin: 10px auto 0;
          max-width: 420px;
          font-size: 12px;
          color: #8B7B74;
          line-height: 1.6;
        }

        .qr-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 20px;
          margin-top: 30px;
        }

        .qr-card {
          background: #FDFAF6;
          border: 1px solid rgba(184,150,90,0.2);
          border-radius: 4px;
          padding: 18px;
        }

        .qr-title {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #1C1714;
          margin-bottom: 14px;
        }

        .qr-frame {
          padding: 14px;
          background: #FFFFFF;
          border: 1px solid rgba(184,150,90,0.2);
          border-radius: 4px;
          display: inline-block;
          cursor: zoom-in;
          transition: box-shadow 0.2s ease, transform 0.2s ease;
        }

        .qr-frame:hover {
          box-shadow: 0 8px 32px rgba(28,23,20,0.12);
          transform: scale(1.02);
        }

        .qr-desc {
          margin-top: 12px;
          font-size: 12px;
          color: #8B7B74;
          line-height: 1.5;
        }

        .qr-link {
          margin-top: 12px;
          display: block;
          font-size: 10px;
          color: #9E8078;
          word-break: break-all;
          background: #FAF7F2;
          border: 1px solid #EDE0D6;
          padding: 8px;
          border-radius: 3px;
          text-align: left;
        }

        .btn-row {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin-top: 22px;
        }

        .btn-primary,
        .btn-ghost {
          display: block;
          width: 100%;
          padding: 14px 18px;
          border-radius: 2px;
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          cursor: pointer;
          text-decoration: none;
        }

        .btn-primary {
          background: #1C1714;
          color: #FAF7F2;
          border: none;
        }

        .btn-ghost {
          background: transparent;
          color: #9E8E86;
          border: 1px solid #E8DDD6;
        }

        .qr-overlay {
          position: fixed;
          inset: 0;
          background: rgba(28,23,20,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          cursor: zoom-out;
          backdrop-filter: blur(4px);
        }

        .qr-zoom-inner {
          background: #FFFFFF;
          padding: 28px;
          border-radius: 4px;
          box-shadow: 0 24px 80px rgba(28,23,20,0.25);
          text-align: center;
        }

        .qr-zoom-name {
          font-family: 'Cormorant Garamond', serif;
          font-style: italic;
          font-size: 22px;
          color: #C4847A;
          margin-bottom: 8px;
          font-weight: 300;
        }

        .qr-zoom-type {
          font-size: 11px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #B8965A;
          margin-bottom: 16px;
        }

        .qr-zoom-close {
          margin-top: 16px;
          font-size: 10px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #B8A8A0;
        }

        .loading-text {
          color: #9E8E86;
          font-size: 13px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        @media (max-width: 640px) {
          .event-card {
            padding: 34px 22px 28px;
          }

          .qr-grid,
          .btn-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {qrZoomed && (
        <div className="qr-overlay" onClick={() => setQrZoomed(null)}>
          <div className="qr-zoom-inner" onClick={(e) => e.stopPropagation()}>
            <p className="qr-zoom-name">
              {brideName} & {groomName}
            </p>
            <p className="qr-zoom-type">{zoomTitle}</p>
            <QrCodeBox value={zoomValue} />
            <p className="qr-zoom-close">Tap anywhere to close</p>
          </div>
        </div>
      )}

      <div className="event-page">
        <div className="event-card">
          {loading ? (
            <p className="loading-text">Loading event...</p>
          ) : (
            <>
              <p className="event-eyebrow">Wedding QR System</p>

              <div className="event-couple">{brideName}</div>
              <span className="event-divider">&</span>
              <div className="event-couple">
                <em>{groomName}</em>
              </div>

              <div className="package-badge">{packageType} Package</div>
              <p className="package-desc">{getPackageDesc()}</p>

              <div className="qr-grid">
                <div className="qr-card">
                  <p className="qr-title">Guest Upload QR</p>
                  <div className="qr-frame" onClick={() => setQrZoomed('upload')}>
                    <QrCodeBox value={uploadUrl} />
                  </div>
                  <p className="qr-desc">
                    Tetamu scan QR ni untuk upload memory majlis.
                  </p>
                  <span className="qr-link">{uploadUrl}</span>
                </div>

                <div className="qr-card">
                  <p className="qr-title">Couple Gallery QR</p>
                  <div className="qr-frame" onClick={() => setQrZoomed('gallery')}>
                    <QrCodeBox value={galleryUrl} />
                  </div>
                  <p className="qr-desc">
                    Pengantin scan QR ni untuk tengok gallery.
                  </p>
                  <span className="qr-link">{galleryUrl}</span>
                </div>
              </div>

              <div className="btn-row">
                <a href={uploadUrl} className="btn-primary">
                  Open Upload
                </a>

                <a href={galleryUrl} className="btn-ghost">
                  Open Gallery
                </a>
              </div>

              <button
                className="btn-ghost"
                style={{ marginTop: '12px' }}
                onClick={() => router.push('/')}
              >
                Back to Home
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}