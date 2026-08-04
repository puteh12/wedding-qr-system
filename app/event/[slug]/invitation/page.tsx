'use client'

import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type WeddingEvent = {
  id: number
  slug: string
  bride_name: string
  groom_name: string
  event_date: string | null
  event_time: string | null
  venue_name: string | null
  venue_address: string | null
  google_maps_url: string | null
  waze_url: string | null
}

type Countdown = {
  days: number
  hours: number
  minutes: number
  seconds: number
}

export default function InvitationPage() {
  const params = useParams()
  const slug = params.slug as string

  const [event, setEvent] = useState<WeddingEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [showNavigation, setShowNavigation] = useState(false)
  const [countdown, setCountdown] = useState<Countdown>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  })

  useEffect(() => {
    void fetchEvent()
  }, [slug])

  useEffect(() => {
    if (!event?.event_date) return

    const updateCountdown = () => {
      const target = buildEventDate(event.event_date!, event.event_time)
      const difference = target.getTime() - Date.now()

      if (difference <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 })
        return
      }

      setCountdown({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / (1000 * 60)) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      })
    }

    updateCountdown()
    const timer = window.setInterval(updateCountdown, 1000)

    return () => window.clearInterval(timer)
  }, [event?.event_date, event?.event_time])

  async function fetchEvent() {
    setLoading(true)
    setErrorMessage('')

    const { data, error } = await supabase
      .from('events')
      .select(
        'id, slug, bride_name, groom_name, event_date, event_time, venue_name, venue_address, google_maps_url, waze_url'
      )
      .eq('slug', slug)
      .maybeSingle()

    if (error) {
      console.error('FETCH_INVITATION_EVENT_ERROR:', error)
      setErrorMessage('Unable to load this wedding invitation.')
      setLoading(false)
      return
    }

    if (!data) {
      setErrorMessage('Wedding invitation not found.')
      setLoading(false)
      return
    }

    setEvent(data as WeddingEvent)
    setLoading(false)
  }

  const buildEventDate = (date: string, time?: string | null) => {
    const safeTime = time ? time.slice(0, 5) : '00:00'
    return new Date(`${date}T${safeTime}:00`)
  }

  const formattedDate = useMemo(() => {
    if (!event?.event_date) return 'Date to be confirmed'

    return new Intl.DateTimeFormat('en-MY', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(`${event.event_date}T00:00:00`))
  }, [event?.event_date])

  const formattedTime = useMemo(() => {
    if (!event?.event_time) return 'Time to be confirmed'

    const [hour, minute] = event.event_time.split(':')
    const date = new Date()
    date.setHours(Number(hour), Number(minute), 0, 0)

    return new Intl.DateTimeFormat('en-MY', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(date)
  }, [event?.event_time])

  const brideName = event?.bride_name || 'Bride'
  const groomName = event?.groom_name || 'Groom'
  const hasNavigation = Boolean(event?.google_maps_url || event?.waze_url)

  if (loading) {
    return (
      <>
        <style>{styles}</style>
        <main className="invitation-page loading-page">
          <div className="loading-mark">W</div>
          <p>Preparing your invitation…</p>
        </main>
      </>
    )
  }

  if (errorMessage || !event) {
    return (
      <>
        <style>{styles}</style>
        <main className="invitation-page error-page">
          <section className="state-card">
            <div className="state-icon">♡</div>
            <h1>Invitation unavailable</h1>
            <p>{errorMessage || 'This wedding invitation could not be found.'}</p>
          </section>
        </main>
      </>
    )
  }

  return (
    <>
      <style>{styles}</style>

      <main className="invitation-page">
        <section className="invitation-shell">
          <div className="ornament ornament-top" aria-hidden="true">
            <span />
            <i>◇</i>
            <span />
          </div>

          <p className="invitation-kicker">Together with their families</p>

          <header className="hero">
            <h1>
              <span>{brideName}</span>
              <em>&</em>
              <span>{groomName}</span>
            </h1>

            <p className="hero-copy">
              joyfully invite you to celebrate their wedding day
            </p>
          </header>

          <div className="details-card">
            <div className="detail-row">
              <span className="detail-label">Date</span>
              <strong>{formattedDate}</strong>
            </div>

            <div className="detail-divider" />

            <div className="detail-row">
              <span className="detail-label">Time</span>
              <strong>{formattedTime}</strong>
            </div>

            <div className="detail-divider" />

            <div className="detail-row venue-row">
              <span className="detail-label">Venue</span>
              <strong>{event.venue_name || 'Venue to be confirmed'}</strong>
              {event.venue_address && <p>{event.venue_address}</p>}
            </div>

            {hasNavigation && (
              <button
                type="button"
                className="navigation-button"
                onClick={() => setShowNavigation(true)}
              >
                <span>Open Navigation</span>
                <span className="navigation-arrow">↗</span>
              </button>
            )}
          </div>

          {event.event_date && (
            <section className="countdown-section">
              <p className="section-label">Counting down to our special day</p>

              <div className="countdown-grid">
                {[
                  ['Days', countdown.days],
                  ['Hours', countdown.hours],
                  ['Minutes', countdown.minutes],
                  ['Seconds', countdown.seconds],
                ].map(([label, value]) => (
                  <div key={label} className="countdown-item">
                    <strong>{String(value).padStart(2, '0')}</strong>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="rsvp-section">
            <p className="section-label">Kindly respond</p>
            <h2>Will you join us?</h2>
            <p>
              We would be honoured to celebrate this meaningful day with you.
            </p>

            <a href={`/event/${slug}/rsvp`} className="rsvp-button">
              Confirm Attendance
            </a>
          </section>

          <div className="ornament ornament-bottom" aria-hidden="true">
            <span />
            <i>◇</i>
            <span />
          </div>

          <footer>
            <p>We cannot wait to celebrate with you.</p>
          </footer>
        </section>

        {showNavigation && (
          <div
            className="navigation-overlay"
            onClick={() => setShowNavigation(false)}
          >
            <section
              className="navigation-modal"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowNavigation(false)}
                aria-label="Close navigation options"
              >
                ×
              </button>

              <p className="modal-kicker">Choose navigation</p>
              <h2>How would you like to travel?</h2>

              <div className="navigation-options">
                {event.google_maps_url && (
                  <a
                    href={event.google_maps_url}
                    target="_blank"
                    rel="noreferrer"
                    className="navigation-option"
                  >
                    <span className="nav-icon">G</span>
                    <span>
                      <strong>Google Maps</strong>
                      <small>Open directions</small>
                    </span>
                    <span className="option-arrow">→</span>
                  </a>
                )}

                {event.waze_url && (
                  <a
                    href={event.waze_url}
                    target="_blank"
                    rel="noreferrer"
                    className="navigation-option"
                  >
                    <span className="nav-icon">W</span>
                    <span>
                      <strong>Waze</strong>
                      <small>Start navigation</small>
                    </span>
                    <span className="option-arrow">→</span>
                  </a>
                )}
              </div>
            </section>
          </div>
        )}
      </main>
    </>
  )
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=DM+Sans:wght@300;400;500;600&display=swap');

  :root {
    --invite-bg: #efe5dd;
    --invite-paper: rgba(255, 252, 248, 0.95);
    --invite-ink: #281915;
    --invite-muted: #8f7b73;
    --invite-soft: #b7a49b;
    --invite-accent: #a96557;
    --invite-accent-dark: #7b4238;
    --invite-line: rgba(106, 67, 56, 0.13);
  }

  * {
    box-sizing: border-box;
  }

  html,
  body {
    margin: 0;
    min-height: 100%;
    background: var(--invite-bg);
  }

  body,
  button,
  a {
    font-family: 'DM Sans', sans-serif;
  }

  button,
  a {
    font: inherit;
  }

  .invitation-page {
    min-height: 100vh;
    min-height: 100dvh;
    padding: 36px 18px;
    display: grid;
    place-items: center;
    background:
      radial-gradient(circle at 50% 0%, rgba(197, 133, 113, 0.2), transparent 34%),
      radial-gradient(circle at 0% 70%, rgba(227, 193, 179, 0.26), transparent 30%),
      linear-gradient(180deg, #f6eee8 0%, #efe5dd 100%);
    color: var(--invite-ink);
  }

  .invitation-shell {
    width: min(820px, 100%);
    padding: clamp(42px, 8vw, 88px) clamp(24px, 7vw, 78px);
    border: 1px solid rgba(111, 72, 60, 0.12);
    border-radius: 30px;
    background: var(--invite-paper);
    box-shadow: 0 30px 90px rgba(65, 39, 31, 0.14);
    text-align: center;
    backdrop-filter: blur(18px);
  }

  .ornament {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
  }

  .ornament span {
    width: 72px;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(169, 101, 87, 0.5)
    );
  }

  .ornament span:last-child {
    background: linear-gradient(
      90deg,
      rgba(169, 101, 87, 0.5),
      transparent
    );
  }

  .ornament i {
    color: var(--invite-accent);
    font-family: 'Cormorant Garamond', serif;
    font-size: 18px;
    font-style: normal;
  }

  .ornament-top {
    margin-bottom: 34px;
  }

  .ornament-bottom {
    margin-top: 46px;
  }

  .invitation-kicker,
  .section-label,
  .modal-kicker {
    margin: 0;
    color: var(--invite-accent);
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.22em;
    text-transform: uppercase;
  }

  .hero {
    margin-top: 22px;
  }

  .hero h1 {
    margin: 0;
    display: grid;
    gap: 4px;
    font-family: 'Cormorant Garamond', serif;
    font-size: clamp(58px, 10vw, 92px);
    font-weight: 500;
    line-height: 0.82;
    letter-spacing: -0.045em;
  }

  .hero h1 em {
    margin: 8px 0 5px;
    color: var(--invite-accent);
    font-size: 0.5em;
    font-weight: 400;
    font-style: italic;
  }

  .hero-copy {
    max-width: 480px;
    margin: 28px auto 0;
    color: var(--invite-muted);
    font-family: 'Cormorant Garamond', serif;
    font-size: clamp(19px, 3vw, 25px);
    line-height: 1.5;
    font-style: italic;
  }

  .details-card {
    margin-top: 42px;
    padding: 26px;
    border: 1px solid var(--invite-line);
    border-radius: 22px;
    background: rgba(255, 255, 255, 0.54);
    box-shadow: 0 14px 42px rgba(69, 42, 34, 0.05);
  }

  .detail-row {
    display: grid;
    gap: 7px;
  }

  .detail-label {
    color: var(--invite-soft);
    font-size: 8px;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }

  .detail-row strong {
    font-family: 'Cormorant Garamond', serif;
    font-size: clamp(22px, 4vw, 30px);
    font-weight: 600;
  }

  .venue-row p {
    max-width: 520px;
    margin: 2px auto 0;
    color: var(--invite-muted);
    font-size: 12px;
    line-height: 1.65;
  }

  .detail-divider {
    width: 58px;
    height: 1px;
    margin: 20px auto;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(169, 101, 87, 0.36),
      transparent
    );
  }

  .navigation-button,
  .rsvp-button {
    min-height: 54px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    cursor: pointer;
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .navigation-button {
    min-width: 210px;
    margin-top: 22px;
    border: 1px solid var(--invite-line);
    gap: 14px;
    padding: 0 22px;
    background: rgba(255, 252, 249, 0.86);
    color: var(--invite-accent-dark);
  }

  .navigation-arrow {
    font-size: 15px;
    letter-spacing: 0;
  }

  .countdown-section,
  .rsvp-section {
    margin-top: 48px;
  }

  .countdown-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
    margin-top: 22px;
  }

  .countdown-item {
    min-height: 92px;
    border: 1px solid var(--invite-line);
    border-radius: 17px;
    display: grid;
    place-content: center;
    gap: 4px;
    background: rgba(255, 255, 255, 0.45);
  }

  .countdown-item strong {
    font-family: 'Cormorant Garamond', serif;
    font-size: 34px;
    font-weight: 600;
  }

  .countdown-item span {
    color: var(--invite-soft);
    font-size: 8px;
    font-weight: 600;
    letter-spacing: 0.13em;
    text-transform: uppercase;
  }

  .rsvp-section h2 {
    margin: 12px 0 0;
    font-family: 'Cormorant Garamond', serif;
    font-size: clamp(38px, 6vw, 54px);
    font-weight: 600;
  }

  .rsvp-section > p:not(.section-label) {
    max-width: 460px;
    margin: 14px auto 0;
    color: var(--invite-muted);
    font-size: 13px;
    line-height: 1.7;
  }

  .rsvp-button {
    min-width: 250px;
    margin-top: 26px;
    padding: 0 28px;
    background: linear-gradient(135deg, #281915 0%, #402821 100%);
    color: #fffaf6;
    box-shadow: 0 16px 36px rgba(40, 25, 21, 0.2);
  }

  footer p {
    margin: 22px 0 0;
    color: var(--invite-soft);
    font-family: 'Cormorant Garamond', serif;
    font-size: 16px;
    font-style: italic;
  }

  .navigation-overlay {
    position: fixed;
    inset: 0;
    z-index: 100;
    padding: 20px;
    display: grid;
    place-items: center;
    background: rgba(31, 18, 14, 0.62);
    backdrop-filter: blur(12px);
  }

  .navigation-modal {
    position: relative;
    width: min(460px, 100%);
    padding: 36px;
    border-radius: 24px;
    background: #fffaf6;
    box-shadow: 0 34px 100px rgba(0, 0, 0, 0.3);
    text-align: left;
  }

  .modal-close {
    position: absolute;
    top: 16px;
    right: 16px;
    width: 36px;
    height: 36px;
    border: 0;
    border-radius: 50%;
    background: rgba(169, 101, 87, 0.08);
    color: var(--invite-accent-dark);
    cursor: pointer;
    font-size: 20px;
  }

  .navigation-modal h2 {
    margin: 10px 0 0;
    padding-right: 30px;
    font-family: 'Cormorant Garamond', serif;
    font-size: 34px;
    font-weight: 600;
    line-height: 1.05;
  }

  .navigation-options {
    display: grid;
    gap: 10px;
    margin-top: 24px;
  }

  .navigation-option {
    min-height: 74px;
    padding: 14px;
    border: 1px solid var(--invite-line);
    border-radius: 16px;
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 13px;
    background: #fffdfb;
    color: var(--invite-ink);
    text-decoration: none;
  }

  .nav-icon {
    width: 42px;
    height: 42px;
    border-radius: 13px;
    display: grid;
    place-items: center;
    background: rgba(169, 101, 87, 0.09);
    color: var(--invite-accent-dark);
    font-weight: 700;
  }

  .navigation-option strong,
  .navigation-option small {
    display: block;
  }

  .navigation-option strong {
    font-size: 12px;
  }

  .navigation-option small {
    margin-top: 4px;
    color: var(--invite-soft);
    font-size: 9px;
  }

  .option-arrow {
    color: var(--invite-accent);
    font-size: 17px;
  }

  .loading-page,
  .error-page {
    align-content: center;
    text-align: center;
  }

  .loading-mark {
    width: 58px;
    height: 58px;
    margin: 0 auto 16px;
    border: 1px solid rgba(169, 101, 87, 0.28);
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: rgba(255,255,255,.55);
    color: var(--invite-accent);
    font-family: 'Cormorant Garamond', serif;
    font-size: 24px;
    font-style: italic;
  }

  .loading-page p {
    color: var(--invite-muted);
    font-size: 9px;
    font-weight: 600;
    letter-spacing: .15em;
    text-transform: uppercase;
  }

  .state-card {
    width: min(520px, 100%);
    padding: 50px 30px;
    border-radius: 24px;
    background: var(--invite-paper);
    box-shadow: 0 24px 70px rgba(67,39,31,.12);
  }

  .state-icon {
    font-size: 34px;
    color: var(--invite-accent);
  }

  .state-card h1 {
    margin: 16px 0 0;
    font-family: 'Cormorant Garamond', serif;
    font-size: 40px;
  }

  .state-card p {
    color: var(--invite-muted);
    font-size: 13px;
  }

  @media (max-width: 620px) {
    .invitation-page {
      padding: 0;
      display: block;
    }

    .invitation-shell {
      min-height: 100dvh;
      border: 0;
      border-radius: 0;
      padding: 46px 18px 60px;
      box-shadow: none;
    }

    .hero h1 {
      font-size: clamp(56px, 19vw, 76px);
    }

    .details-card {
      padding: 22px 16px;
    }

    .countdown-grid {
      gap: 7px;
    }

    .countdown-item {
      min-height: 78px;
      border-radius: 14px;
    }

    .countdown-item strong {
      font-size: 28px;
    }

    .countdown-item span {
      font-size: 7px;
      letter-spacing: 0.08em;
    }

    .navigation-button,
    .rsvp-button {
      width: 100%;
    }

    .navigation-modal {
      padding: 32px 20px 22px;
    }
  }
`
