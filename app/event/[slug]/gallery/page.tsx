'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Photo = {
  id: number
  guest_name: string
  message: string | null
  image_url: string
  audio_url?: string | null
  created_at: string
}

export default function GalleryPage() {
  const params = useParams()
  const slug = params.slug as string

  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState<Photo | null>(null)

  const eventName = slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' & ')

  const brideName = eventName.split(' & ')[0]
  const groomName = eventName.split(' & ')[1]

  useEffect(() => {
    fetchPhotos()
  }, [slug])

  async function fetchPhotos() {
    setLoading(true)

    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('slug', slug)
      .order('created_at', { ascending: false })

    if (!error && data) setPhotos(data as Photo[])
    setLoading(false)
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #FAF7F2; }

        .gallery-page {
          min-height: 100vh;
          background: #FAF7F2;
          font-family: 'DM Sans', sans-serif;
        }

        .gallery-hero {
          text-align: center;
          padding: 56px 24px 40px;
          position: relative;
        }

        .gallery-hero::after {
          content: '';
          display: block;
          width: 80px;
          height: 1px;
          background: linear-gradient(to right, transparent, #B8965A, transparent);
          margin: 28px auto 0;
        }

        .hero-eyebrow {
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: #B8965A;
          margin-bottom: 10px;
        }

        .hero-ornament {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-bottom: 12px;
        }

        .orn-line {
          height: 1px;
          width: 50px;
          background: linear-gradient(to right, transparent, rgba(184,150,90,0.5));
        }

        .orn-line.r {
          background: linear-gradient(to left, transparent, rgba(184,150,90,0.5));
        }

        .orn-diamond {
          width: 5px;
          height: 5px;
          background: #B8965A;
          transform: rotate(45deg);
          flex-shrink: 0;
        }

        .hero-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(36px, 7vw, 60px);
          font-weight: 300;
          color: #1C1714;
          line-height: 1.05;
          letter-spacing: -0.02em;
        }

        .hero-title em {
          font-style: italic;
          color: #C4847A;
        }

        .hero-amp {
          font-family: 'Cormorant Garamond', serif;
          font-style: italic;
          color: #D4A0A0;
          font-size: 1em;
          margin: 0 10px;
        }

        .hero-count {
          margin-top: 10px;
          font-size: 11px;
          color: #B8A8A0;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .gallery-grid-wrap {
          max-width: 1200px;
          margin: 0 auto;
          padding: 8px 24px 60px;
        }

        .gallery-grid {
          columns: 1;
          column-gap: 16px;
        }

        @media (min-width: 540px) {
          .gallery-grid { columns: 2; }
        }

        @media (min-width: 820px) {
          .gallery-grid { columns: 3; }
        }

        @media (min-width: 1100px) {
          .gallery-grid { columns: 4; }
        }

        .gallery-item {
          break-inside: avoid;
          margin-bottom: 16px;
          border-radius: 3px;
          overflow: hidden;
          background: #fff;
          box-shadow:
            0 1px 3px rgba(28,23,20,0.06),
            0 4px 16px rgba(28,23,20,0.06),
            0 0 0 1px rgba(184,150,90,0.1);
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .gallery-item:hover {
          transform: translateY(-3px);
          box-shadow:
            0 2px 4px rgba(28,23,20,0.06),
            0 12px 32px rgba(28,23,20,0.12),
            0 0 0 1px rgba(184,150,90,0.18);
        }

        .gallery-item img {
          width: 100%;
          display: block;
          transition: transform 0.4s ease;
        }

        .gallery-item:hover img {
          transform: scale(1.02);
        }

        .gallery-item-meta {
          padding: 14px 16px 16px;
          border-top: 1px solid rgba(184,150,90,0.1);
        }

        .meta-name {
          font-family: 'Cormorant Garamond', serif;
          font-size: 16px;
          font-weight: 400;
          color: #1C1714;
          margin-bottom: 2px;
        }

        .meta-message {
          font-size: 12px;
          color: #9E8E86;
          font-weight: 300;
          line-height: 1.5;
          margin-bottom: 8px;
          font-style: italic;
        }

        .meta-time {
          font-size: 10px;
          color: #C0B0A8;
          letter-spacing: 0.06em;
          margin-top: 8px;
        }

        .audio-box {
          margin-top: 10px;
          padding: 10px;
          border-radius: 6px;
          background: #FBF7F2;
          border: 1px solid rgba(184,150,90,0.16);
        }

        .audio-label {
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #B8965A;
          margin-bottom: 6px;
        }

        .audio-player {
          width: 100%;
          height: 36px;
        }

        .state-box {
          max-width: 400px;
          margin: 60px auto;
          background: #fff;
          border-radius: 4px;
          padding: 48px 40px;
          text-align: center;
          box-shadow:
            0 2px 4px rgba(28,23,20,0.04),
            0 8px 24px rgba(28,23,20,0.07),
            0 0 0 1px rgba(184,150,90,0.12);
        }

        .state-icon {
          font-size: 36px;
          display: block;
          margin-bottom: 16px;
          opacity: 0.5;
        }

        .state-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 22px;
          font-weight: 300;
          color: #1C1714;
          margin-bottom: 6px;
        }

        .state-sub {
          font-size: 13px;
          color: #9E8E86;
          font-weight: 300;
        }

        .shimmer-grid {
          columns: 3;
          column-gap: 16px;
          max-width: 1200px;
          margin: 0 auto;
          padding: 8px 24px;
        }

        @media (max-width: 820px) {
          .shimmer-grid { columns: 2; }
        }

        @media (max-width: 540px) {
          .shimmer-grid { columns: 1; }
        }

        .shimmer-card {
          break-inside: avoid;
          margin-bottom: 16px;
          border-radius: 3px;
          overflow: hidden;
          background: #fff;
          box-shadow: 0 0 0 1px rgba(184,150,90,0.08);
        }

        .shimmer-img,
        .shimmer-text {
          background: linear-gradient(90deg, #F0EAE4 25%, #E8E0D8 50%, #F0EAE4 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }

        .shimmer-text {
          border-radius: 2px;
        }

        @keyframes shimmer {
          from { background-position: 200% 0; }
          to { background-position: -200% 0; }
        }

        .lightbox {
          position: fixed;
          inset: 0;
          background: rgba(28,23,20,0.88);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: 24px;
          backdrop-filter: blur(6px);
          animation: fadeIn 0.2s ease;
          cursor: zoom-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .lightbox-inner {
          background: #fff;
          border-radius: 4px;
          max-width: 800px;
          width: 100%;
          overflow: hidden;
          box-shadow: 0 40px 120px rgba(28,23,20,0.4);
          animation: scaleIn 0.2s ease;
          cursor: default;
        }

        @keyframes scaleIn {
          from { transform: scale(0.94); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        .lightbox-img {
          width: 100%;
          max-height: 70vh;
          object-fit: contain;
          background: #F8F4F0;
          display: block;
        }

        .lightbox-meta {
          padding: 20px 24px;
          border-top: 1px solid rgba(184,150,90,0.12);
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
        }

        .lightbox-info {
          flex: 1;
          min-width: 0;
        }

        .lightbox-name {
          font-family: 'Cormorant Garamond', serif;
          font-size: 20px;
          font-weight: 400;
          color: #1C1714;
          margin-bottom: 3px;
        }

        .lightbox-message {
          font-size: 13px;
          color: #9E8E86;
          font-style: italic;
          font-weight: 300;
          line-height: 1.5;
        }

        .lightbox-time {
          font-size: 10px;
          color: #C0B0A8;
          letter-spacing: 0.06em;
          white-space: nowrap;
          padding-top: 4px;
        }

        .lightbox-close {
          position: absolute;
          top: 16px;
          right: 16px;
          background: rgba(255,255,255,0.15);
          border: none;
          color: #fff;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          font-size: 18px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s;
        }

        .lightbox-close:hover {
          background: rgba(255,255,255,0.25);
        }

        .gallery-bg {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          opacity: 1;
        }
      `}</style>

      <div className="gallery-page">
        <svg
          className="gallery-bg"
          viewBox="0 0 1440 900"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid slice"
        >
          <g opacity="0.07" fill="none" stroke="#B8965A" strokeWidth="0.8">
            <path d="M -30 -20 Q 100 80 80 200 Q 60 320 140 400" />
            <path d="M 30 40 Q 130 100 120 240" />
            <ellipse cx="85" cy="190" rx="22" ry="10" transform="rotate(-35 85 190)" />
            <ellipse cx="130" cy="230" rx="18" ry="8" transform="rotate(-55 130 230)" />
            <circle cx="90" cy="60" r="3" />
            <circle cx="95" cy="53" r="2" />
            <circle cx="84" cy="53" r="2" />
          </g>

          <g
            opacity="0.06"
            fill="none"
            stroke="#C4847A"
            strokeWidth="0.8"
            transform="translate(1440,900) rotate(180)"
          >
            <path d="M -30 -20 Q 100 80 80 200 Q 60 320 140 400" />
            <ellipse cx="85" cy="190" rx="22" ry="10" transform="rotate(-35 85 190)" />
            <circle cx="90" cy="60" r="3" />
            <circle cx="95" cy="53" r="2" />
          </g>
        </svg>

        <div className="gallery-hero" style={{ position: 'relative', zIndex: 1 }}>
          <p className="hero-eyebrow">Wedding Gallery</p>

          <div className="hero-ornament">
            <span className="orn-line" />
            <span className="orn-diamond" />
            <span className="orn-line r" />
          </div>

          <h1 className="hero-title">
            {brideName}
            <span className="hero-amp">&</span>
            <em>{groomName}</em>
          </h1>

          {!loading && (
            <p className="hero-count">
              {photos.length} {photos.length === 1 ? 'memory' : 'memories'} shared
            </p>
          )}
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          {loading ? (
            <div className="shimmer-grid">
              {[220, 180, 260, 200, 240, 190, 170, 250].map((h, i) => (
                <div key={i} className="shimmer-card">
                  <div className="shimmer-img" style={{ height: h }} />
                  <div style={{ padding: '14px 16px 16px' }}>
                    <div
                      className="shimmer-text"
                      style={{ height: 14, width: '55%', marginBottom: 8 }}
                    />
                    <div
                      className="shimmer-text"
                      style={{ height: 10, width: '75%' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : photos.length === 0 ? (
            <div className="gallery-grid-wrap">
              <div className="state-box">
                <span className="state-icon">🌸</span>
                <h2 className="state-title">No photos yet</h2>
                <p className="state-sub">
                  Share the QR code with your guests to start collecting memories.
                </p>
              </div>
            </div>
          ) : (
            <div className="gallery-grid-wrap">
              <div className="gallery-grid">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="gallery-item"
                    onClick={() => setLightbox(photo)}
                  >
                    <img
                      src={photo.image_url}
                      alt={photo.guest_name}
                      loading="lazy"
                    />

                    <div className="gallery-item-meta">
                      <div className="meta-name">{photo.guest_name}</div>

                      {photo.message && (
                        <div className="meta-message">"{photo.message}"</div>
                      )}

                      {photo.audio_url && (
                        <div
                          className="audio-box"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="audio-label">Voice Message</div>
                          <audio
                            controls
                            src={photo.audio_url}
                            className="audio-player"
                          />
                        </div>
                      )}

                      <div className="meta-time">
                        {new Date(photo.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {lightbox && (
          <div className="lightbox" onClick={() => setLightbox(null)}>
            <button
              className="lightbox-close"
              onClick={() => setLightbox(null)}
            >
              ×
            </button>

            <div
              className="lightbox-inner"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={lightbox.image_url}
                alt={lightbox.guest_name}
                className="lightbox-img"
              />

              <div className="lightbox-meta">
                <div className="lightbox-info">
                  <div className="lightbox-name">{lightbox.guest_name}</div>

                  {lightbox.message && (
                    <div className="lightbox-message">"{lightbox.message}"</div>
                  )}

                  {lightbox.audio_url && (
                    <div className="audio-box">
                      <div className="audio-label">Voice Message</div>
                      <audio
                        controls
                        src={lightbox.audio_url}
                        className="audio-player"
                      />
                    </div>
                  )}
                </div>

                <div className="lightbox-time">
                  {new Date(lightbox.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}