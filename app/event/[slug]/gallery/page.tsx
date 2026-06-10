'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Photo = {
  id: number
  guest_name: string
  message: string | null
  image_url: string | null
  video_url: string | null
  audio_url: string | null
  media_type: 'image' | 'video' | null
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

    if (!error && data) {
      setPhotos(data as Photo[])
    }

    setLoading(false)
  }

  const getMediaUrl = (photo: Photo) => {
    if (photo.media_type === 'video') return photo.video_url
    return photo.image_url
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          background: #FAF7F2;
        }

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
        }

        .hero-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(36px, 7vw, 60px);
          font-weight: 300;
          color: #1C1714;
          line-height: 1.05;
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
          .gallery-grid {
            columns: 2;
          }
        }

        @media (min-width: 820px) {
          .gallery-grid {
            columns: 3;
          }
        }

        @media (min-width: 1100px) {
          .gallery-grid {
            columns: 4;
          }
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

        .gallery-item img,
        .gallery-item video {
          width: 100%;
          display: block;
          background: #000;
        }

        .gallery-video {
          max-height: 360px;
          object-fit: cover;
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

        .media-badge {
          display: inline-block;
          margin-bottom: 8px;
          padding: 4px 8px;
          border-radius: 999px;
          background: #FBF7F4;
          color: #B8965A;
          border: 1px solid rgba(184,150,90,0.16);
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
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
          cursor: zoom-out;
        }

        .lightbox-inner {
          background: #fff;
          border-radius: 4px;
          max-width: 900px;
          width: 100%;
          overflow: hidden;
          box-shadow: 0 40px 120px rgba(28,23,20,0.4);
          cursor: default;
        }

        .lightbox-img,
        .lightbox-video {
          width: 100%;
          max-height: 70vh;
          object-fit: contain;
          background: #000;
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
        }
      `}</style>

      <div className="gallery-page">
        <div className="gallery-hero">
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

        {loading ? (
          <div className="gallery-grid-wrap">
            <div className="state-box">
              <span className="state-icon">⏳</span>
              <h2 className="state-title">Loading memories...</h2>
              <p className="state-sub">Please wait a moment.</p>
            </div>
          </div>
        ) : photos.length === 0 ? (
          <div className="gallery-grid-wrap">
            <div className="state-box">
              <span className="state-icon">🌸</span>
              <h2 className="state-title">No memories yet</h2>
              <p className="state-sub">
                Share the QR code with your guests to start collecting memories.
              </p>
            </div>
          </div>
        ) : (
          <div className="gallery-grid-wrap">
            <div className="gallery-grid">
              {photos.map((photo) => {
                const mediaUrl = getMediaUrl(photo)

                return (
                  <div
                    key={photo.id}
                    className="gallery-item"
                    onClick={() => setLightbox(photo)}
                  >
                    {photo.media_type === 'video' && photo.video_url ? (
                      <video
                        src={photo.video_url}
                        className="gallery-video"
                        muted
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      <img
                        src={photo.image_url || ''}
                        alt={photo.guest_name}
                        loading="lazy"
                      />
                    )}

                    <div className="gallery-item-meta">
                      <div className="media-badge">
                        {photo.media_type === 'video' ? 'Video' : 'Photo'}
                      </div>

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
                )
              })}
            </div>
          </div>
        )}

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
              {lightbox.media_type === 'video' && lightbox.video_url ? (
                <video
                  src={lightbox.video_url}
                  className="lightbox-video"
                  controls
                  playsInline
                  autoPlay
                />
              ) : (
                <img
                  src={lightbox.image_url || ''}
                  alt={lightbox.guest_name}
                  className="lightbox-img"
                />
              )}

              <div className="lightbox-meta">
                <div className="lightbox-info">
                  <div className="media-badge">
                    {lightbox.media_type === 'video' ? 'Video' : 'Photo'}
                  </div>

                  <div className="lightbox-name">{lightbox.guest_name}</div>

                  {lightbox.message && (
                    <div className="lightbox-message">
                      "{lightbox.message}"
                    </div>
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