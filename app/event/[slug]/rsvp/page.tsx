'use client'

import { useParams } from 'next/navigation'
import { FormEvent, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type WeddingEvent = {
  id: number
  slug: string
  bride_name: string
  groom_name: string
  event_date: string | null
  event_time: string | null
  event_end_time: string | null
  venue_name: string | null
  venue_address: string | null
  google_maps_url: string | null
  waze_url: string | null
}

type AttendanceStatus = 'attending' | 'not_attending'

export default function RSVPPage() {
  const params = useParams()
  const slug = params.slug as string

  const [event, setEvent] = useState<WeddingEvent | null>(null)
  const [guestName, setGuestName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [attendanceStatus, setAttendanceStatus] =
    useState<AttendanceStatus>('attending')
  const [pax, setPax] = useState(1)
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [showNavigation, setShowNavigation] = useState(false)

  useEffect(() => {
    void fetchEvent()
  }, [slug])

  async function fetchEvent() {
    const { data, error } = await supabase
      .from('events')
      .select(
        'id, slug, bride_name, groom_name, event_date, event_time, event_end_time, venue_name, venue_address, google_maps_url, waze_url'
      )
      .eq('slug', slug)
      .maybeSingle()

    if (error) {
      console.error('FETCH_EVENT_ERROR:', error)
      setErrorMessage('Unable to load this wedding event.')
      return
    }

    if (!data) {
      setErrorMessage('Wedding event not found.')
      return
    }

    setEvent(data as WeddingEvent)
  }

  const formatTimeValue = (time?: string | null) => {
    if (!time) return null

    const match = time.match(/(\d{1,2})[:.](\d{2})(?:\s*([ap]m))?/i)

    if (!match) return null

    let hours = Number(match[1])
    const minutes = Number(match[2])
    const meridiem = match[3]?.toLowerCase()

    if (meridiem === 'pm' && hours < 12) hours += 12
    if (meridiem === 'am' && hours === 12) hours = 0

    const displayHours = hours % 12 || 12
    const displayMeridiem = hours >= 12 ? 'pm' : 'am'

    return `${displayHours}.${String(minutes).padStart(2, '0')} ${displayMeridiem}`
  }

  async function handleSubmit(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault()
    setErrorMessage('')

    if (!event) {
      setErrorMessage('Wedding event is not available.')
      return
    }

    if (!guestName.trim()) {
      setErrorMessage('Please enter your name.')
      return
    }

    const finalPax = attendanceStatus === 'attending' ? pax : 0

    try {
      setIsSubmitting(true)

      const { error } = await supabase.from('rsvps').insert({
        event_id: event.id,
        guest_name: guestName.trim(),
        attendance_status: attendanceStatus,
        pax: finalPax,
        phone_number: phoneNumber.trim() || null,
        note: note.trim() || null,
      })

      if (error) {
        console.error('RSVP_SUBMIT_ERROR:', error)
        setErrorMessage(error.message)
        return
      }

      setSuccess(true)
    } catch (error) {
      console.error('RSVP_SUBMIT_ERROR:', error)
      setErrorMessage('Unable to submit RSVP.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const brideName = event?.bride_name || 'Bride'
  const groomName = event?.groom_name || 'Groom'

  const formattedDate = event?.event_date
    ? new Intl.DateTimeFormat('en-MY', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date(`${event.event_date}T00:00:00`))
    : null

  const formattedTime = event?.event_time
    ? (() => {
        const startTime = formatTimeValue(event.event_time)
        const endTime = formatTimeValue(event.event_end_time)

        if (startTime && endTime) {
          return `${startTime} - ${endTime}`
        }

        return startTime || event.event_time
      })()
    : null

  const hasVenue =
    Boolean(event?.venue_name) ||
    Boolean(event?.venue_address) ||
    Boolean(event?.google_maps_url) ||
    Boolean(event?.waze_url)

  if (success) {
    return (
      <>
        <style>{styles}</style>

        <main className="rsvp-page">
          <section className="success-card">
            <div className="success-icon">✓</div>

            <p className="eyebrow">RSVP received</p>

            <h1 className="success-title">
              Thank you, <em>{guestName}.</em>
            </h1>

            <p className="success-copy">
              Your response for {brideName} & {groomName}&apos;s wedding has
              been recorded.
            </p>
          </section>
        </main>
      </>
    )
  }

  return (
    <>
      <style>{styles}</style>

      <main className="rsvp-page">
        <section className="rsvp-card">
          <header className="rsvp-header">
            <p className="eyebrow">Wedding RSVP</p>

            <h1 className="rsvp-title">
              {brideName} <em>& {groomName}</em>
            </h1>

            <p className="rsvp-copy">
              Kindly confirm your attendance for our special day.
            </p>

            {(formattedDate || formattedTime || hasVenue) && (
              <div className="event-details">
                {(formattedDate || formattedTime) && (
                  <div className="detail-row">
                    <span className="detail-icon">◷</span>
                    <div>
                      {formattedDate && <p className="detail-main">{formattedDate}</p>}
                      {formattedTime && <p className="detail-sub">{formattedTime}</p>}
                    </div>
                  </div>
                )}

                {hasVenue && (
                  <div className="detail-row">
                    <span className="detail-icon">⌖</span>
                    <div>
                      {event?.venue_name && <p className="detail-main">{event.venue_name}</p>}
                      {event?.venue_address && <p className="detail-sub">{event.venue_address}</p>}
                    </div>
                  </div>
                )}

                {(event?.google_maps_url || event?.waze_url) && (
                  <button
                    type="button"
                    className="navigation-button"
                    onClick={() => setShowNavigation(true)}
                  >
                    Open Navigation
                  </button>
                )}
              </div>
            )}
          </header>

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="guestName">Your name</label>
              <input
                id="guestName"
                type="text"
                value={guestName}
                onChange={(event) => setGuestName(event.target.value)}
                placeholder="Enter your full name"
              />
            </div>

            <div className="field">
              <label htmlFor="phoneNumber">
                Phone number <span>Optional</span>
              </label>
              <input
                id="phoneNumber"
                type="tel"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                placeholder="e.g. 0123456789"
              />
            </div>

            <div className="field">
              <label>Will you be attending?</label>

              <div className="attendance-grid">
                <button
                  type="button"
                  className={`attendance-button ${
                    attendanceStatus === 'attending' ? 'active' : ''
                  }`}
                  onClick={() => setAttendanceStatus('attending')}
                >
                  Yes, I will attend
                </button>

                <button
                  type="button"
                  className={`attendance-button ${
                    attendanceStatus === 'not_attending' ? 'active' : ''
                  }`}
                  onClick={() => setAttendanceStatus('not_attending')}
                >
                  Sorry, unable to attend
                </button>
              </div>
            </div>

            {attendanceStatus === 'attending' && (
              <div className="field">
                <label htmlFor="pax">Number of guests</label>

                <select
                  id="pax"
                  value={pax}
                  onChange={(event) => setPax(Number(event.target.value))}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((number) => (
                    <option key={number} value={number}>
                      {number} {number === 1 ? 'person' : 'people'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="field">
              <label htmlFor="note">
                Note <span>Optional</span>
              </label>
              <textarea
                id="note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Leave a message for the couple"
                rows={4}
              />
            </div>

            {errorMessage && (
              <div className="error-message">{errorMessage}</div>
            )}

            <button
              type="submit"
              className="submit-button"
              disabled={isSubmitting || !event}
            >
              {isSubmitting ? 'Submitting...' : 'Submit RSVP'}
            </button>
          </form>
        </section>

        {showNavigation && (
          <div className="navigation-overlay" onClick={() => setShowNavigation(false)}>
            <div className="navigation-modal" onClick={(e) => e.stopPropagation()}>
              <button type="button" className="modal-close" onClick={() => setShowNavigation(false)} aria-label="Close">×</button>
              <p className="modal-eyebrow">Directions</p>
              <h2 className="modal-title">Choose navigation</h2>
              <p className="modal-copy">Open the wedding venue using your preferred app.</p>
              <div className="modal-actions">
                {event?.google_maps_url && (
                  <a className="map-option primary-map" href={event.google_maps_url} target="_blank" rel="noreferrer">Google Maps</a>
                )}
                {event?.waze_url && (
                  <a className="map-option" href={event.waze_url} target="_blank" rel="noreferrer">Waze</a>
                )}
              </div>
              <button type="button" className="cancel-button" onClick={() => setShowNavigation(false)}>Cancel</button>
            </div>
          </div>
        )}
      </main>
    </>
  )
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=DM+Sans:wght@300;400;500;600&display=swap');

  * {
    box-sizing: border-box;
  }

  html,
  body {
    margin: 0;
    min-height: 100%;
    background: #f4ebe5;
  }

  button,
  input,
  select,
  textarea {
    font: inherit;
  }

  .rsvp-page {
    min-height: 100vh;
    padding: 42px 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    background:
      radial-gradient(circle at top, rgba(196, 132, 116, 0.18), transparent 42%),
      #f4ebe5;
    font-family: 'DM Sans', sans-serif;
  }

  .rsvp-card,
  .success-card {
    width: min(680px, 100%);
    padding: clamp(34px, 7vw, 62px);
    border: 1px solid rgba(143, 91, 78, 0.14);
    border-radius: 28px;
    background: rgba(255, 251, 248, 0.95);
    box-shadow: 0 26px 70px rgba(71, 43, 35, 0.14);
  }

  .rsvp-header {
    margin-bottom: 38px;
    text-align: center;
  }

  .eyebrow {
    margin: 0 0 12px;
    color: #ae6758;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.22em;
    text-transform: uppercase;
  }

  .rsvp-title,
  .success-title {
    margin: 0;
    color: #281915;
    font-family: 'Cormorant Garamond', serif;
    font-size: clamp(44px, 9vw, 66px);
    font-weight: 500;
    line-height: 0.98;
  }

  .rsvp-title em,
  .success-title em {
    color: #ad695a;
    font-weight: 400;
  }

  .rsvp-copy,
  .success-copy {
    max-width: 470px;
    margin: 18px auto 0;
    color: #96847d;
    font-size: 14px;
    line-height: 1.7;
  }

  .event-details {
    width: min(520px, 100%);
    margin: 28px auto 0;
    padding: 20px;
    display: grid;
    gap: 15px;
    border: 1px solid rgba(130, 93, 82, 0.14);
    border-radius: 18px;
    background: rgba(255, 253, 251, 0.7);
    text-align: left;
  }

  .detail-row { display: flex; align-items: flex-start; gap: 13px; }
  .detail-icon { width: 34px; height: 34px; flex: 0 0 34px; display: grid; place-items: center; border-radius: 50%; background: rgba(174, 103, 88, 0.1); color: #ae6758; font-size: 17px; }
  .detail-main { margin: 1px 0 3px; color: #3b2924; font-family: 'Cormorant Garamond', serif; font-size: 18px; font-weight: 600; line-height: 1.2; }
  .detail-sub { margin: 0; color: #98857e; font-size: 12px; line-height: 1.55; }
  .navigation-button { min-height: 46px; margin-top: 2px; border: 1px solid rgba(174, 103, 88, 0.22); border-radius: 999px; background: #fffaf7; color: #9f5d50; cursor: pointer; font-size: 10px; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; }
  .navigation-button:hover { background: #fff3ee; }

  form {
    display: grid;
    gap: 24px;
  }

  .field {
    display: grid;
    gap: 9px;
  }

  .field label {
    color: #765e56;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .field label span {
    color: #bbaaA3;
    font-weight: 400;
    letter-spacing: 0;
    text-transform: none;
  }

  input,
  select,
  textarea {
    width: 100%;
    border: 1px solid rgba(130, 93, 82, 0.16);
    border-radius: 14px;
    outline: none;
    background: #fffdfb;
    color: #2e201c;
  }

  input,
  select {
    min-height: 54px;
    padding: 0 16px;
  }

  textarea {
    padding: 16px;
    resize: vertical;
  }

  input:focus,
  select:focus,
  textarea:focus {
    border-color: #b56f60;
    box-shadow: 0 0 0 4px rgba(181, 111, 96, 0.09);
  }

  .attendance-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .attendance-button {
    min-height: 64px;
    padding: 14px;
    border: 1px solid rgba(130, 93, 82, 0.16);
    border-radius: 14px;
    background: #fffdfb;
    color: #8d7a73;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
  }

  .attendance-button.active {
    border-color: #a86153;
    background: #a86153;
    color: #fff;
    box-shadow: 0 10px 24px rgba(168, 97, 83, 0.2);
  }

  .error-message {
    padding: 13px 15px;
    border: 1px solid rgba(178, 73, 58, 0.22);
    border-radius: 12px;
    background: rgba(178, 73, 58, 0.07);
    color: #a54f42;
    font-size: 12px;
    line-height: 1.5;
  }

  .submit-button {
    min-height: 58px;
    border: 0;
    border-radius: 999px;
    background: #2c1c18;
    color: #fffaf7;
    cursor: pointer;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }

  .submit-button:hover:not(:disabled) {
    background: #442b24;
  }

  .submit-button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .success-card {
    text-align: center;
  }

  .success-icon {
    width: 68px;
    height: 68px;
    margin: 0 auto 24px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: rgba(92, 130, 99, 0.13);
    color: #5c8263;
    font-size: 28px;
  }

  .navigation-overlay { position: fixed; inset: 0; z-index: 100; padding: 20px; display: grid; place-items: center; background: rgba(39, 25, 21, 0.58); backdrop-filter: blur(8px); }
  .navigation-modal { position: relative; width: min(430px, 100%); padding: 34px; border: 1px solid rgba(143, 91, 78, 0.14); border-radius: 24px; background: #fffaf7; box-shadow: 0 28px 80px rgba(38, 23, 19, 0.28); text-align: center; }
  .modal-close { position: absolute; top: 14px; right: 14px; width: 36px; height: 36px; border: 0; border-radius: 50%; background: #f5ebe6; color: #725c54; cursor: pointer; font-size: 21px; }
  .modal-eyebrow { margin: 0 0 10px; color: #ae6758; font-size: 9px; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; }
  .modal-title { margin: 0; color: #281915; font-family: 'Cormorant Garamond', serif; font-size: 34px; font-weight: 600; }
  .modal-copy { margin: 10px auto 22px; color: #96847d; font-size: 13px; line-height: 1.6; }
  .modal-actions { display: grid; gap: 11px; }
  .map-option, .cancel-button { min-height: 52px; border-radius: 999px; display: grid; place-items: center; text-decoration: none; cursor: pointer; font-size: 10px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; }
  .map-option { border: 1px solid rgba(130, 93, 82, 0.18); background: #fffdfb; color: #735d55; }
  .primary-map { border-color: #2c1c18; background: #2c1c18; color: #fffaf7; }
  .cancel-button { width: 100%; margin-top: 9px; border: 0; background: transparent; color: #aa9891; }

  @media (max-width: 560px) {
    .rsvp-page {
      padding: 0;
      align-items: stretch;
    }

    .rsvp-card,
    .success-card {
      min-height: 100vh;
      border: 0;
      border-radius: 0;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .attendance-grid {
      grid-template-columns: 1fr;
    }

    .event-details { padding: 17px; }
    .navigation-modal { padding: 32px 22px 24px; }
  }
`