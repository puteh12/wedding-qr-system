'use client'

import { useParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

type MediaFilter = 'all' | 'image' | 'video' | 'voice'

type WeddingEvent = {
  id: number
  slug: string
  bride_name: string
  groom_name: string
  package_type: 'BASIC' | 'PREMIUM' | 'VIP'
}

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

  const [event, setEvent] = useState<WeddingEvent | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<MediaFilter>('all')
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [isLive, setIsLive] = useState(false)
  const [newMemoryId, setNewMemoryId] = useState<number | null>(null)
  const [slideshowOpen, setSlideshowOpen] = useState(false)
  const [slideshowIndex, setSlideshowIndex] = useState(0)

  const newMemoryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const slideshowTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const slugParts = slug.split('-')
  const fallbackBrideName = slugParts[0]
    ? slugParts[0].charAt(0).toUpperCase() + slugParts[0].slice(1)
    : 'Bride'

  const fallbackGroomName =
    slugParts
      .slice(1)
      .join(' ')
      .replace(/\b\w/g, (character) => character.toUpperCase()) || 'Groom'

  const brideName = event?.bride_name || fallbackBrideName
  const groomName = event?.groom_name || fallbackGroomName

  const filteredPhotos = useMemo(() => {
    if (filter === 'all') return photos
    if (filter === 'voice') return photos.filter((photo) => Boolean(photo.audio_url))
    return photos.filter((photo) => photo.media_type === filter)
  }, [filter, photos])

  const stats = useMemo(() => {
    return {
      all: photos.length,
      images: photos.filter((photo) => photo.media_type !== 'video').length,
      videos: photos.filter((photo) => photo.media_type === 'video').length,
      voice: photos.filter((photo) => Boolean(photo.audio_url)).length,
    }
  }, [photos])

  const currentPhoto =
    lightboxIndex === null ? null : filteredPhotos[lightboxIndex] || null

  const currentSlide =
    photos.length > 0 ? photos[slideshowIndex % photos.length] : null

  useEffect(() => {
    void fetchGallery()
  }, [slug])

  useEffect(() => {
    const channel = supabase
      .channel(`gallery-${slug}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'photos',
          filter: `slug=eq.${slug}`,
        },
        (payload) => {
          const newPhoto = payload.new as Photo

          setPhotos((currentPhotos) => {
            if (currentPhotos.some((photo) => photo.id === newPhoto.id)) {
              return currentPhotos
            }

            return [newPhoto, ...currentPhotos]
          })

          setNewMemoryId(newPhoto.id)

          if (newMemoryTimerRef.current) {
            clearTimeout(newMemoryTimerRef.current)
          }

          newMemoryTimerRef.current = setTimeout(() => {
            setNewMemoryId(null)
          }, 4500)
        }
      )
      .subscribe((status) => {
        setIsLive(status === 'SUBSCRIBED')
      })

    return () => {
      if (newMemoryTimerRef.current) {
        clearTimeout(newMemoryTimerRef.current)
      }

      void supabase.removeChannel(channel)
      setIsLive(false)
    }
  }, [slug])

  useEffect(() => {
    if (lightboxIndex === null) {
      document.body.style.overflow = ''
      return
    }

    document.body.style.overflow = 'hidden'

    const handleKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === 'Escape') setLightboxIndex(null)
      if (keyboardEvent.key === 'ArrowLeft') showPrevious()
      if (keyboardEvent.key === 'ArrowRight') showNext()
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [lightboxIndex, filteredPhotos.length])

  useEffect(() => {
    if (!slideshowOpen || photos.length === 0) {
      if (slideshowTimerRef.current) {
        clearInterval(slideshowTimerRef.current)
        slideshowTimerRef.current = null
      }

      return
    }

    document.body.style.overflow = 'hidden'

    slideshowTimerRef.current = setInterval(() => {
      setSlideshowIndex((currentIndex) => (currentIndex + 1) % photos.length)
    }, 5500)

    const handleKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === 'Escape') {
        setSlideshowOpen(false)
      }

      if (keyboardEvent.key === 'ArrowRight') {
        setSlideshowIndex((currentIndex) => (currentIndex + 1) % photos.length)
      }

      if (keyboardEvent.key === 'ArrowLeft') {
        setSlideshowIndex((currentIndex) =>
          currentIndex === 0 ? photos.length - 1 : currentIndex - 1
        )
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)

      if (slideshowTimerRef.current) {
        clearInterval(slideshowTimerRef.current)
        slideshowTimerRef.current = null
      }
    }
  }, [slideshowOpen, photos.length])

  async function fetchGallery() {
    setLoading(true)

    const [eventResult, photosResult] = await Promise.all([
      supabase
        .from('events')
        .select('id, slug, bride_name, groom_name, package_type')
        .eq('slug', slug)
        .maybeSingle(),
      supabase
        .from('photos')
        .select(
          'id, guest_name, message, image_url, video_url, audio_url, media_type, created_at'
        )
        .eq('slug', slug)
        .order('created_at', { ascending: false }),
    ])

    if (eventResult.error) {
      console.error('FETCH_EVENT_ERROR:', eventResult.error)
    } else if (eventResult.data) {
      setEvent(eventResult.data as WeddingEvent)
    }

    if (photosResult.error) {
      console.error('FETCH_PHOTOS_ERROR:', photosResult.error)
    } else if (photosResult.data) {
      setPhotos(photosResult.data as Photo[])
    }

    setLoading(false)
  }

  const showPrevious = () => {
    if (lightboxIndex === null || filteredPhotos.length === 0) return

    setLightboxIndex(
      lightboxIndex === 0 ? filteredPhotos.length - 1 : lightboxIndex - 1
    )
  }

  const showNext = () => {
    if (lightboxIndex === null || filteredPhotos.length === 0) return

    setLightboxIndex(
      lightboxIndex === filteredPhotos.length - 1 ? 0 : lightboxIndex + 1
    )
  }

  const openSlideshow = () => {
    if (photos.length === 0) return
    setSlideshowIndex(0)
    setSlideshowOpen(true)
  }

  const formatDate = (dateValue: string) => {
    return new Intl.DateTimeFormat('en-MY', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(dateValue))
  }

  const formatDateTime = (dateValue: string) => {
    return new Intl.DateTimeFormat('en-MY', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(dateValue))
  }

  const uploadUrl = `/event/${slug}/upload`

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=DM+Sans:wght@300;400;500;600&display=swap');

        :root {
          --gallery-bg: #f4eee8;
          --gallery-card: #fffdfb;
          --gallery-ink: #241713;
          --gallery-muted: #8e7d75;
          --gallery-soft: #b8a69d;
          --gallery-accent: #a96356;
          --gallery-accent-dark: #85483f;
          --gallery-line: rgba(87, 54, 44, 0.12);
          --gallery-success: #5b8164;
        }

        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
          background: var(--gallery-bg);
          color: var(--gallery-ink);
        }

        button,
        a,
        audio {
          font: inherit;
        }

        .gallery-page {
          min-height: 100vh;
          overflow-x: hidden;
          background:
            radial-gradient(circle at 8% 2%, rgba(190,133,114,.18), transparent 28%),
            radial-gradient(circle at 90% 10%, rgba(231,193,178,.22), transparent 30%),
            linear-gradient(180deg, #f8f2ed 0%, #f4eee8 44%, #eee5dd 100%);
          font-family: 'DM Sans', sans-serif;
        }

        .gallery-topbar {
          position: sticky;
          top: 0;
          z-index: 30;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 16px clamp(18px, 4vw, 56px);
          border-bottom: 1px solid rgba(78,47,39,.08);
          background: rgba(248,242,237,.82);
          backdrop-filter: blur(18px);
        }

        .brand-lockup {
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--gallery-ink);
          text-decoration: none;
        }

        .brand-mark {
          width: 30px;
          height: 30px;
          border: 1px solid rgba(169,99,86,.35);
          border-radius: 50%;
          display: grid;
          place-items: center;
          font-family: 'Cormorant Garamond', serif;
          font-style: italic;
          color: var(--gallery-accent);
          background: rgba(255,255,255,.65);
        }

        .brand-text {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: .2em;
          text-transform: uppercase;
        }

        .topbar-actions {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .live-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 9px 12px;
          border: 1px solid rgba(91,129,100,.18);
          border-radius: 999px;
          background: rgba(91,129,100,.08);
          color: var(--gallery-success);
          font-size: 9px;
          font-weight: 600;
          letter-spacing: .1em;
          text-transform: uppercase;
        }

        .live-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: currentColor;
          animation: livePulse 1.8s infinite;
        }

        @keyframes livePulse {
          0%, 100% {
            opacity: 1;
            box-shadow: 0 0 0 0 rgba(91,129,100,.24);
          }

          50% {
            opacity: .5;
            box-shadow: 0 0 0 6px rgba(91,129,100,0);
          }
        }

        .topbar-action,
        .topbar-secondary {
          border-radius: 999px;
          padding: 10px 16px;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: .12em;
          text-decoration: none;
          text-transform: uppercase;
          transition: .2s ease;
          cursor: pointer;
        }

        .topbar-action {
          border: 0;
          background: var(--gallery-ink);
          color: #fffaf6;
        }

        .topbar-secondary {
          border: 1px solid var(--gallery-line);
          background: rgba(255,252,249,.7);
          color: var(--gallery-muted);
        }

        .topbar-action:hover,
        .topbar-secondary:hover {
          transform: translateY(-1px);
        }

        .gallery-hero {
          position: relative;
          isolation: isolate;
          min-height: 500px;
          display: grid;
          place-items: center;
          padding: 76px 24px 68px;
          overflow: hidden;
          text-align: center;
        }

        .gallery-hero::before,
        .gallery-hero::after {
          content: '';
          position: absolute;
          border-radius: 50%;
          z-index: -1;
        }

        .gallery-hero::before {
          width: 420px;
          height: 420px;
          top: -180px;
          left: -120px;
          background: rgba(207,149,127,.14);
        }

        .gallery-hero::after {
          width: 360px;
          height: 360px;
          right: -120px;
          bottom: -140px;
          background: rgba(233,203,191,.2);
        }

        .hero-inner {
          width: min(980px, 100%);
        }

        .hero-kicker {
          margin: 0 0 20px;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: .32em;
          text-transform: uppercase;
          color: var(--gallery-accent);
        }

        .hero-title {
          margin: 0;
          display: flex;
          align-items: baseline;
          justify-content: center;
          flex-wrap: wrap;
          gap: 6px 18px;
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(58px, 9vw, 112px);
          font-weight: 500;
          letter-spacing: -.055em;
          line-height: .88;
          color: var(--gallery-ink);
        }

        .hero-title em {
          font-weight: 400;
          font-style: italic;
          color: var(--gallery-accent);
        }

        .hero-amp {
          font-size: .54em;
          color: #b98b7f;
          transform: translateY(-.04em);
        }

        .hero-copy {
          max-width: 560px;
          margin: 30px auto 0;
          color: var(--gallery-muted);
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(18px, 2vw, 24px);
          line-height: 1.5;
          font-style: italic;
        }

        .hero-meta {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 10px 24px;
          margin-top: 26px;
          color: var(--gallery-soft);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: .16em;
          text-transform: uppercase;
        }

        .hero-meta span {
          display: inline-flex;
          align-items: center;
          gap: 9px;
        }

        .hero-meta span::before {
          content: '';
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: rgba(169,99,86,.55);
        }

        .gallery-shell {
          width: min(1400px, 100%);
          margin: 0 auto;
          padding: 0 clamp(16px, 4vw, 56px) 88px;
        }

        .gallery-toolbar {
          position: sticky;
          top: 63px;
          z-index: 20;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 24px;
          padding: 14px 16px;
          border: 1px solid rgba(94,58,48,.1);
          border-radius: 18px;
          background: rgba(255,252,249,.84);
          box-shadow: 0 16px 44px rgba(66,38,30,.07);
          backdrop-filter: blur(18px);
        }

        .toolbar-title {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 130px;
        }

        .toolbar-title strong {
          font-family: 'Cormorant Garamond', serif;
          font-size: 22px;
          font-weight: 600;
        }

        .toolbar-title span {
          color: var(--gallery-soft);
          font-size: 11px;
        }

        .filter-row {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          scrollbar-width: none;
        }

        .filter-row::-webkit-scrollbar {
          display: none;
        }

        .filter-button {
          flex: 0 0 auto;
          border: 1px solid transparent;
          border-radius: 999px;
          padding: 10px 14px;
          background: transparent;
          color: var(--gallery-muted);
          cursor: pointer;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: .08em;
          text-transform: uppercase;
          transition: .2s ease;
        }

        .filter-button:hover {
          border-color: rgba(169,99,86,.16);
          color: var(--gallery-ink);
        }

        .filter-button.active {
          background: var(--gallery-ink);
          color: #fffaf6;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 24px;
        }

        .stat-card {
          padding: 18px 18px 16px;
          border: 1px solid rgba(92,57,47,.09);
          border-radius: 18px;
          background: rgba(255,252,249,.62);
          box-shadow: 0 10px 32px rgba(66,38,30,.045);
        }

        .stat-value {
          display: block;
          margin-bottom: 4px;
          font-family: 'Cormorant Garamond', serif;
          font-size: 30px;
          font-weight: 600;
          color: var(--gallery-ink);
        }

        .stat-label {
          color: var(--gallery-soft);
          font-size: 9px;
          font-weight: 600;
          letter-spacing: .13em;
          text-transform: uppercase;
        }

        .gallery-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
        }

        .gallery-card {
          position: relative;
          min-width: 0;
          overflow: hidden;
          border-radius: 20px;
          background: var(--gallery-card);
          cursor: pointer;
          box-shadow: 0 14px 40px rgba(66,38,30,.08);
          transition: transform .25s ease, box-shadow .25s ease;
          animation: cardEnter .45s ease both;
        }

        .gallery-card.new-memory {
          outline: 2px solid rgba(91,129,100,.38);
          box-shadow:
            0 0 0 8px rgba(91,129,100,.08),
            0 18px 46px rgba(66,38,30,.12);
        }

        @keyframes cardEnter {
          from {
            opacity: 0;
            transform: translateY(18px) scale(.985);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .gallery-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 22px 58px rgba(66,38,30,.15);
        }

        .media-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 4 / 5;
          overflow: hidden;
          background: #d8cbc3;
        }

        .media-wrap img,
        .media-wrap video {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          transition: transform .45s ease;
        }

        .gallery-card:hover .media-wrap img,
        .gallery-card:hover .media-wrap video {
          transform: scale(1.035);
        }

        .media-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 12px;
          padding: 16px;
          background: linear-gradient(180deg, transparent 45%, rgba(28,15,12,.72) 100%);
          pointer-events: none;
        }

        .media-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 10px;
          border: 1px solid rgba(255,255,255,.2);
          border-radius: 999px;
          background: rgba(25,14,11,.34);
          color: #fffaf6;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: .12em;
          text-transform: uppercase;
          backdrop-filter: blur(10px);
        }

        .play-button {
          width: 46px;
          height: 46px;
          border: 1px solid rgba(255,255,255,.32);
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: rgba(20,11,9,.36);
          color: #fff;
          font-size: 17px;
          backdrop-filter: blur(10px);
        }

        .new-memory-label {
          position: absolute;
          top: 14px;
          left: 14px;
          z-index: 2;
          padding: 8px 10px;
          border-radius: 999px;
          background: rgba(91,129,100,.92);
          color: #fff;
          font-size: 8px;
          font-weight: 700;
          letter-spacing: .12em;
          text-transform: uppercase;
          box-shadow: 0 10px 30px rgba(32,65,39,.2);
        }

        .card-caption {
          min-height: 160px;
          padding: 16px 17px 18px;
        }

        .caption-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .guest-name {
          margin: 0;
          font-family: 'Cormorant Garamond', serif;
          font-size: 22px;
          font-weight: 600;
          color: var(--gallery-ink);
        }

        .caption-date {
          color: var(--gallery-soft);
          font-size: 9px;
          font-weight: 600;
          letter-spacing: .08em;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .guest-message {
          display: -webkit-box;
          overflow: hidden;
          margin: 8px 0 0;
          color: var(--gallery-muted);
          font-family: 'Cormorant Garamond', serif;
          font-size: 17px;
          line-height: 1.45;
          font-style: italic;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 3;
        }

        .voice-chip {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          margin-top: 12px;
          padding: 8px 10px;
          border-radius: 999px;
          background: rgba(169,99,86,.08);
          color: var(--gallery-accent-dark);
          font-size: 9px;
          font-weight: 600;
          letter-spacing: .1em;
          text-transform: uppercase;
        }

        .state-card {
          max-width: 520px;
          margin: 40px auto 0;
          padding: 56px 30px;
          border: 1px solid rgba(92,57,47,.09);
          border-radius: 24px;
          background: rgba(255,252,249,.76);
          box-shadow: 0 20px 50px rgba(66,38,30,.06);
          text-align: center;
        }

        .state-symbol {
          width: 54px;
          height: 54px;
          margin: 0 auto 18px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: rgba(169,99,86,.08);
          color: var(--gallery-accent);
          font-size: 24px;
        }

        .state-card h2 {
          margin: 0 0 8px;
          font-family: 'Cormorant Garamond', serif;
          font-size: 34px;
          font-weight: 600;
        }

        .state-card p {
          margin: 0 auto;
          max-width: 360px;
          color: var(--gallery-muted);
          font-size: 13px;
          line-height: 1.7;
        }

        .state-action {
          display: inline-flex;
          margin-top: 22px;
          padding: 12px 18px;
          border-radius: 999px;
          background: var(--gallery-ink);
          color: #fffaf6;
          text-decoration: none;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: .11em;
          text-transform: uppercase;
        }

        .gallery-footer {
          padding: 30px 20px 52px;
          text-align: center;
          color: var(--gallery-soft);
          font-size: 10px;
          letter-spacing: .13em;
          text-transform: uppercase;
        }

        .lightbox,
        .slideshow {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(21,12,9,.88);
          backdrop-filter: blur(18px);
        }

        .lightbox-panel {
          position: relative;
          display: grid;
          grid-template-columns: minmax(0, 1.5fr) minmax(280px, .6fr);
          width: min(1180px, 100%);
          max-height: calc(100vh - 40px);
          overflow: hidden;
          border-radius: 24px;
          background: #fffaf6;
          box-shadow: 0 42px 120px rgba(0,0,0,.4);
        }

        .lightbox-media {
          position: relative;
          min-height: 520px;
          background: #120c0a;
          display: grid;
          place-items: center;
        }

        .lightbox-media img,
        .lightbox-media video {
          width: 100%;
          height: 100%;
          max-height: calc(100vh - 40px);
          object-fit: contain;
        }

        .lightbox-side {
          overflow-y: auto;
          padding: 34px 30px 30px;
        }

        .lightbox-label {
          margin: 0 0 18px;
          color: var(--gallery-accent);
          font-size: 9px;
          font-weight: 600;
          letter-spacing: .16em;
          text-transform: uppercase;
        }

        .lightbox-name {
          margin: 0;
          font-family: 'Cormorant Garamond', serif;
          font-size: 40px;
          font-weight: 600;
          line-height: 1;
        }

        .lightbox-message {
          margin: 18px 0 0;
          color: var(--gallery-muted);
          font-family: 'Cormorant Garamond', serif;
          font-size: 22px;
          line-height: 1.5;
          font-style: italic;
        }

        .lightbox-date {
          margin-top: 22px;
          color: var(--gallery-soft);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: .09em;
          text-transform: uppercase;
        }

        .audio-section {
          margin-top: 26px;
          padding-top: 22px;
          border-top: 1px solid var(--gallery-line);
        }

        .audio-section-title {
          margin: 0 0 12px;
          color: var(--gallery-accent-dark);
          font-size: 9px;
          font-weight: 600;
          letter-spacing: .13em;
          text-transform: uppercase;
        }

        .audio-player {
          width: 100%;
        }

        .lightbox-close,
        .lightbox-nav,
        .slideshow-close,
        .slideshow-nav {
          position: absolute;
          z-index: 5;
          border: 1px solid rgba(255,255,255,.22);
          background: rgba(17,9,7,.42);
          color: #fff;
          cursor: pointer;
          backdrop-filter: blur(10px);
        }

        .lightbox-close,
        .slideshow-close {
          top: 18px;
          right: 18px;
          width: 42px;
          height: 42px;
          border-radius: 50%;
          font-size: 22px;
        }

        .lightbox-nav,
        .slideshow-nav {
          top: 50%;
          width: 44px;
          height: 58px;
          border-radius: 14px;
          transform: translateY(-50%);
          font-size: 22px;
        }

        .lightbox-nav.prev,
        .slideshow-nav.prev {
          left: 18px;
        }

        .lightbox-nav.next,
        .slideshow-nav.next {
          right: 18px;
        }

        .slideshow-stage {
          position: relative;
          width: min(1280px, 100%);
          height: min(82vh, 820px);
          overflow: hidden;
          border-radius: 28px;
          background: #100a08;
          box-shadow: 0 42px 120px rgba(0,0,0,.5);
        }

        .slideshow-media,
        .slideshow-media img,
        .slideshow-media video {
          width: 100%;
          height: 100%;
        }

        .slideshow-media {
          display: grid;
          place-items: center;
        }

        .slideshow-media img,
        .slideshow-media video {
          object-fit: contain;
          animation: slideFade 1s ease;
        }

        @keyframes slideFade {
          from {
            opacity: 0;
            transform: scale(1.015);
          }

          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .slideshow-caption {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          padding: 56px 34px 28px;
          background: linear-gradient(180deg, transparent, rgba(15,8,6,.86));
          color: #fffaf6;
        }

        .slideshow-caption h2 {
          margin: 0;
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(30px, 5vw, 54px);
          font-weight: 600;
        }

        .slideshow-caption p {
          max-width: 700px;
          margin: 8px 0 0;
          color: rgba(255,250,246,.78);
          font-family: 'Cormorant Garamond', serif;
          font-size: 20px;
          font-style: italic;
        }

        .slideshow-count {
          position: absolute;
          top: 20px;
          left: 20px;
          z-index: 4;
          padding: 8px 11px;
          border-radius: 999px;
          background: rgba(17,9,7,.42);
          color: #fff;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: .11em;
          text-transform: uppercase;
          backdrop-filter: blur(10px);
        }

        @media (max-width: 1180px) {
          .gallery-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 860px) {
          .gallery-hero {
            min-height: 440px;
            padding-top: 58px;
          }

          .gallery-toolbar {
            top: 61px;
            align-items: flex-start;
            flex-direction: column;
          }

          .filter-row {
            width: 100%;
          }

          .stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .gallery-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .lightbox {
            padding: 0;
          }

          .lightbox-panel {
            display: block;
            width: 100%;
            height: 100%;
            max-height: none;
            border-radius: 0;
            overflow-y: auto;
          }

          .lightbox-media {
            min-height: 58vh;
          }

          .lightbox-media img,
          .lightbox-media video {
            height: 58vh;
          }

          .lightbox-side {
            padding: 28px 22px 42px;
          }

          .lightbox-nav {
            top: 29vh;
          }

          .slideshow {
            padding: 0;
          }

          .slideshow-stage {
            width: 100%;
            height: 100%;
            border-radius: 0;
          }
        }

        @media (max-width: 620px) {
          .gallery-topbar {
            padding: 13px 14px;
          }

          .brand-text,
          .topbar-secondary {
            display: none;
          }

          .topbar-actions {
            gap: 7px;
          }

          .live-badge {
            padding: 8px 10px;
          }

          .topbar-action {
            padding: 9px 12px;
            font-size: 9px;
          }

          .gallery-hero {
            min-height: 390px;
            padding: 48px 18px 50px;
          }

          .hero-title {
            gap: 3px 9px;
            font-size: clamp(50px, 17vw, 72px);
          }

          .hero-copy {
            font-size: 18px;
          }

          .gallery-shell {
            padding-right: 12px;
            padding-left: 12px;
          }

          .gallery-toolbar {
            top: 56px;
            border-radius: 16px;
          }

          .gallery-grid {
            grid-template-columns: 1fr;
          }

          .media-wrap {
            aspect-ratio: 1 / 1;
          }

          .card-caption {
            min-height: auto;
          }

          .guest-name {
            font-size: 20px;
          }

          .lightbox-close {
            top: 12px;
            right: 12px;
          }

          .lightbox-nav.prev {
            left: 10px;
          }

          .lightbox-nav.next {
            right: 10px;
          }

          .slideshow-caption {
            padding-right: 20px;
            padding-left: 20px;
          }
        }
      `}</style>

      <main className="gallery-page">
        <header className="gallery-topbar">
          <a href={`/event/${slug}`} className="brand-lockup">
            <span className="brand-mark">W</span>
            <span className="brand-text">Wedding Memories</span>
          </a>

          <div className="topbar-actions">
            <span className="live-badge">
              <span className="live-dot" />
              {isLive ? 'Live' : 'Connecting'}
            </span>

            {photos.length > 0 && (
              <button
                type="button"
                className="topbar-secondary"
                onClick={openSlideshow}
              >
                Slideshow
              </button>
            )}

            <a href={uploadUrl} className="topbar-action">
              Share a memory
            </a>
          </div>
        </header>

        <section className="gallery-hero">
          <div className="hero-inner">
            <p className="hero-kicker">Our wedding story</p>

            <h1 className="hero-title">
              <span>{brideName}</span>
              <span className="hero-amp">&</span>
              <em>{groomName}</em>
            </h1>

            <p className="hero-copy">
              A collection of moments, messages and memories shared by the
              people who celebrated with us.
            </p>

            <div className="hero-meta">
              {!loading && (
                <span>
                  {photos.length} {photos.length === 1 ? 'memory' : 'memories'}
                </span>
              )}
              <span>{event?.package_type || 'Wedding'} gallery</span>
              <span>{isLive ? 'Auto-updating' : 'Connecting live gallery'}</span>
            </div>
          </div>
        </section>

        <section className="gallery-shell">
          <div className="gallery-toolbar">
            <div className="toolbar-title">
              <strong>Memories</strong>
              <span>{filteredPhotos.length} shown</span>
            </div>

            <div className="filter-row" aria-label="Filter gallery">
              {[
                { key: 'all', label: `All ${stats.all}` },
                { key: 'image', label: `Photos ${stats.images}` },
                { key: 'video', label: `Videos ${stats.videos}` },
                { key: 'voice', label: `Voice ${stats.voice}` },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`filter-button ${
                    filter === item.key ? 'active' : ''
                  }`}
                  onClick={() => {
                    setFilter(item.key as MediaFilter)
                    setLightboxIndex(null)
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {!loading && photos.length > 0 && (
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-value">{stats.all}</span>
                <span className="stat-label">Total memories</span>
              </div>

              <div className="stat-card">
                <span className="stat-value">{stats.images}</span>
                <span className="stat-label">Photos</span>
              </div>

              <div className="stat-card">
                <span className="stat-value">{stats.videos}</span>
                <span className="stat-label">Videos</span>
              </div>

              <div className="stat-card">
                <span className="stat-value">{stats.voice}</span>
                <span className="stat-label">Voice notes</span>
              </div>
            </div>
          )}

          {loading ? (
            <div className="state-card">
              <div className="state-symbol">♡</div>
              <h2>Preparing the gallery</h2>
              <p>Gathering every shared moment. This will only take a moment.</p>
            </div>
          ) : photos.length === 0 ? (
            <div className="state-card">
              <div className="state-symbol">✦</div>
              <h2>The story begins here</h2>
              <p>
                No memories have been shared yet. Invite guests to add their
                photos, videos and wishes.
              </p>
              <a href={uploadUrl} className="state-action">
                Share first memory
              </a>
            </div>
          ) : filteredPhotos.length === 0 ? (
            <div className="state-card">
              <div className="state-symbol">⌁</div>
              <h2>Nothing in this collection yet</h2>
              <p>Try another filter to continue exploring the wedding gallery.</p>
            </div>
          ) : (
            <div className="gallery-grid">
              {filteredPhotos.map((photo, index) => (
                <article
                  key={photo.id}
                  className={`gallery-card ${
                    newMemoryId === photo.id ? 'new-memory' : ''
                  }`}
                  onClick={() => setLightboxIndex(index)}
                >
                  <div className="media-wrap">
                    {newMemoryId === photo.id && (
                      <span className="new-memory-label">New memory</span>
                    )}

                    {photo.media_type === 'video' && photo.video_url ? (
                      <video
                        src={photo.video_url}
                        muted
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      <img
                        src={photo.image_url || ''}
                        alt={`Memory shared by ${photo.guest_name}`}
                        loading="lazy"
                      />
                    )}

                    <div className="media-overlay">
                      <span className="media-pill">
                        {photo.media_type === 'video' ? 'Video' : 'Photo'}
                      </span>

                      {photo.media_type === 'video' && (
                        <span className="play-button">▶</span>
                      )}
                    </div>
                  </div>

                  <div className="card-caption">
                    <div className="caption-top">
                      <h2 className="guest-name">{photo.guest_name}</h2>
                      <span className="caption-date">
                        {formatDate(photo.created_at)}
                      </span>
                    </div>

                    {photo.message && (
                      <p className="guest-message">“{photo.message}”</p>
                    )}

                    {photo.audio_url && (
                      <span className="voice-chip">
                        🎙 Voice message included
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <footer className="gallery-footer">
          Made with love for {brideName} & {groomName}
        </footer>

        {currentPhoto && (
          <div className="lightbox" onClick={() => setLightboxIndex(null)}>
            <div
              className="lightbox-panel"
              onClick={(mouseEvent) => mouseEvent.stopPropagation()}
            >
              <button
                type="button"
                className="lightbox-close"
                onClick={() => setLightboxIndex(null)}
                aria-label="Close memory"
              >
                ×
              </button>

              {filteredPhotos.length > 1 && (
                <>
                  <button
                    type="button"
                    className="lightbox-nav prev"
                    onClick={showPrevious}
                    aria-label="Previous memory"
                  >
                    ‹
                  </button>

                  <button
                    type="button"
                    className="lightbox-nav next"
                    onClick={showNext}
                    aria-label="Next memory"
                  >
                    ›
                  </button>
                </>
              )}

              <div className="lightbox-media">
                {currentPhoto.media_type === 'video' &&
                currentPhoto.video_url ? (
                  <video
                    src={currentPhoto.video_url}
                    controls
                    autoPlay
                    playsInline
                  />
                ) : (
                  <img
                    src={currentPhoto.image_url || ''}
                    alt={`Memory shared by ${currentPhoto.guest_name}`}
                  />
                )}
              </div>

              <aside className="lightbox-side">
                <p className="lightbox-label">
                  {currentPhoto.media_type === 'video'
                    ? 'Wedding video'
                    : 'Wedding photo'}
                </p>

                <h2 className="lightbox-name">{currentPhoto.guest_name}</h2>

                {currentPhoto.message && (
                  <p className="lightbox-message">
                    “{currentPhoto.message}”
                  </p>
                )}

                <p className="lightbox-date">
                  Shared {formatDateTime(currentPhoto.created_at)}
                </p>

                {currentPhoto.audio_url && (
                  <div className="audio-section">
                    <p className="audio-section-title">Voice message</p>
                    <audio
                      className="audio-player"
                      controls
                      src={currentPhoto.audio_url}
                    />
                  </div>
                )}
              </aside>
            </div>
          </div>
        )}

        {slideshowOpen && currentSlide && (
          <div className="slideshow">
            <div className="slideshow-stage">
              <span className="slideshow-count">
                {slideshowIndex + 1} / {photos.length}
              </span>

              <button
                type="button"
                className="slideshow-close"
                onClick={() => setSlideshowOpen(false)}
                aria-label="Close slideshow"
              >
                ×
              </button>

              {photos.length > 1 && (
                <>
                  <button
                    type="button"
                    className="slideshow-nav prev"
                    onClick={() =>
                      setSlideshowIndex((currentIndex) =>
                        currentIndex === 0
                          ? photos.length - 1
                          : currentIndex - 1
                      )
                    }
                    aria-label="Previous slide"
                  >
                    ‹
                  </button>

                  <button
                    type="button"
                    className="slideshow-nav next"
                    onClick={() =>
                      setSlideshowIndex(
                        (currentIndex) => (currentIndex + 1) % photos.length
                      )
                    }
                    aria-label="Next slide"
                  >
                    ›
                  </button>
                </>
              )}

              <div className="slideshow-media">
                {currentSlide.media_type === 'video' &&
                currentSlide.video_url ? (
                  <video
                    key={currentSlide.id}
                    src={currentSlide.video_url}
                    controls
                    autoPlay
                    playsInline
                  />
                ) : (
                  <img
                    key={currentSlide.id}
                    src={currentSlide.image_url || ''}
                    alt={`Memory shared by ${currentSlide.guest_name}`}
                  />
                )}
              </div>

              <div className="slideshow-caption">
                <h2>{currentSlide.guest_name}</h2>
                {currentSlide.message && <p>“{currentSlide.message}”</p>}
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
