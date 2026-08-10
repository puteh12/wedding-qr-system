'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type PackageType = 'BASIC' | 'PREMIUM' | 'VIP'

type PackageOption = {
  name: PackageType
  label: string
  price: string
  description: string
  features: string[]
}

const packageOptions: PackageOption[] = [
  {
    name: 'BASIC',
    label: 'Basic',
    price: 'RM49',
    description: 'A simple wedding gallery for photo memories.',
    features: ['Photo uploads', 'Private event link', 'QR code access'],
  },
  {
    name: 'PREMIUM',
    label: 'Premium',
    price: 'RM99',
    description: 'Perfect for couples who want photos and videos.',
    features: ['Photo uploads', 'Video uploads', 'Live gallery'],
  },
  {
    name: 'VIP',
    label: 'VIP',
    price: 'RM149',
    description: 'The complete wedding memory experience.',
    features: ['Photos & videos', 'Voice messages', 'Priority experience'],
  },
]

export default function CreateEventPage() {
  const router = useRouter()

  const [brideName, setBrideName] = useState('')
  const [groomName, setGroomName] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventStartTime, setEventStartTime] = useState('')
  const [eventEndTime, setEventEndTime] = useState('')
  const [packageType, setPackageType] = useState<PackageType>('BASIC')
  const [isCreating, setIsCreating] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const selectedPackage = useMemo(
    () => packageOptions.find((item) => item.name === packageType)!,
    [packageType]
  )

  const createSlug = (bride: string, groom: string) => {
    return `${bride}-${groom}`
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
  }

  const handleGenerateEvent = async () => {
    setErrorMessage('')

    if (
      !brideName.trim() ||
      !groomName.trim() ||
      !eventDate ||
      !eventStartTime ||
      !eventEndTime
    ) {
      setErrorMessage('Please complete all wedding details before continuing.')
      return
    }

    if (eventEndTime <= eventStartTime) {
      setErrorMessage('End time must be later than start time.')
      return
    }

    try {
      setIsCreating(true)

      const slug = createSlug(brideName, groomName)

      const { data: existingEvent, error: existingError } = await supabase
        .from('events')
        .select('id')
        .eq('slug', slug)
        .maybeSingle()

      if (existingError) {
        throw existingError
      }

      if (existingEvent) {
        router.push(`/event/${slug}`)
        return
      }

      const { error } = await supabase.from('events').insert({
        slug,
        event_date: eventDate,
        event_time: eventStartTime,
        event_end_time: eventEndTime,
        bride_name: brideName.trim(),
        groom_name: groomName.trim(),
        package_type: packageType,
      })

      if (error) {
        throw error
      }

      router.push(`/event/${slug}`)
    } catch (error) {
      console.error('CREATE_EVENT_ERROR:', error)
      setErrorMessage('Unable to create the wedding event. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=DM+Sans:wght@300;400;500;600&display=swap');

        :root {
          --create-bg: #f4ede7;
          --create-surface: rgba(255, 252, 249, 0.9);
          --create-card: #fffdfb;
          --create-ink: #241713;
          --create-muted: #8d7b73;
          --create-soft: #b7a59c;
          --create-accent: #a76356;
          --create-accent-dark: #80483f;
          --create-line: rgba(89, 53, 44, 0.11);
        }

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: var(--create-bg);
          color: var(--create-ink);
        }

        button,
        input {
          font: inherit;
        }

        .create-page {
          min-height: 100vh;
          overflow-x: hidden;
          background:
            radial-gradient(circle at 7% 5%, rgba(198, 141, 120, 0.2), transparent 28%),
            radial-gradient(circle at 92% 8%, rgba(228, 191, 177, 0.23), transparent 30%),
            linear-gradient(180deg, #f9f3ee 0%, #f3ece6 52%, #ece2da 100%);
          font-family: 'DM Sans', sans-serif;
        }

        .create-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 16px clamp(16px, 4vw, 52px);
          border-bottom: 1px solid rgba(78, 47, 39, 0.08);
          background: rgba(249, 243, 238, 0.82);
          backdrop-filter: blur(18px);
        }

        .brand-lockup {
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--create-ink);
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
          color: var(--create-accent);
          font-family: 'Cormorant Garamond', serif;
          font-style: italic;
        }

        .brand-text {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.2em;
          text-transform: uppercase;
        }

        .create-shell {
          width: min(1240px, 100%);
          margin: 0 auto;
          padding: 44px clamp(14px, 4vw, 48px) 76px;
        }

        .create-grid {
          display: grid;
          grid-template-columns: minmax(0, 0.9fr) minmax(420px, 1.1fr);
          gap: 24px;
          align-items: start;
        }

        .intro-card,
        .form-card {
          border: 1px solid rgba(91, 55, 46, 0.09);
          border-radius: 26px;
          background: var(--create-surface);
          box-shadow: 0 18px 46px rgba(67, 39, 31, 0.07);
          backdrop-filter: blur(18px);
        }

        .intro-card {
          position: sticky;
          top: 24px;
          overflow: hidden;
          min-height: 640px;
          padding: clamp(34px, 5vw, 58px);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .intro-card::before {
          content: '';
          position: absolute;
          width: 280px;
          height: 280px;
          right: -100px;
          top: -100px;
          border-radius: 50%;
          background: rgba(196, 132, 112, 0.11);
        }

        .intro-kicker {
          position: relative;
          z-index: 1;
          margin: 0 0 18px;
          color: var(--create-accent);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.28em;
          text-transform: uppercase;
        }

        .intro-title {
          position: relative;
          z-index: 1;
          margin: 0;
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(58px, 7vw, 92px);
          font-weight: 500;
          line-height: 0.86;
          letter-spacing: -0.05em;
        }

        .intro-title em {
          display: block;
          margin-top: 12px;
          color: var(--create-accent);
          font-weight: 400;
          font-style: italic;
        }

        .intro-copy {
          max-width: 430px;
          margin: 28px 0 0;
          color: var(--create-muted);
          font-family: 'Cormorant Garamond', serif;
          font-size: 21px;
          line-height: 1.5;
          font-style: italic;
        }

        .intro-benefits {
          display: grid;
          gap: 12px;
          margin-top: 34px;
        }

        .benefit-row {
          display: flex;
          align-items: center;
          gap: 12px;
          color: var(--create-muted);
          font-size: 12px;
        }

        .benefit-icon {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: rgba(167, 99, 86, 0.08);
          color: var(--create-accent-dark);
          font-size: 14px;
          flex-shrink: 0;
        }

        .form-card {
          padding: clamp(24px, 4vw, 40px);
        }

        .form-heading {
          margin-bottom: 28px;
        }

        .form-kicker {
          margin: 0 0 8px;
          color: var(--create-accent);
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .form-title {
          margin: 0;
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(34px, 5vw, 48px);
          font-weight: 600;
        }

        .form-subtitle {
          margin: 8px 0 0;
          color: var(--create-muted);
          font-size: 12px;
          line-height: 1.7;
        }

        .field-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .field.full {
          grid-column: 1 / -1;
        }

        .field-label {
          color: var(--create-soft);
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .field input {
          width: 100%;
          border: 1px solid rgba(92, 57, 47, 0.1);
          border-radius: 14px;
          padding: 14px 15px;
          outline: none;
          background: rgba(255, 253, 251, 0.82);
          color: var(--create-ink);
          font-size: 14px;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .field input:focus {
          border-color: rgba(167, 99, 86, 0.45);
          box-shadow: 0 0 0 4px rgba(167, 99, 86, 0.08);
        }

        .field input::placeholder {
          color: #c6b7af;
        }

        .package-section {
          margin-top: 28px;
        }

        .package-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 14px;
        }

        .package-heading h2 {
          margin: 0;
          font-family: 'Cormorant Garamond', serif;
          font-size: 28px;
          font-weight: 600;
        }

        .package-heading p {
          margin: 0;
          color: var(--create-soft);
          font-size: 10px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .package-grid {
          display: grid;
          gap: 12px;
        }

        .package-option {
          width: 100%;
          border: 1px solid rgba(92, 57, 47, 0.09);
          border-radius: 18px;
          padding: 18px;
          background: rgba(255, 253, 251, 0.78);
          color: var(--create-ink);
          cursor: pointer;
          text-align: left;
          transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .package-option:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 30px rgba(67, 39, 31, 0.08);
        }

        .package-option.active {
          border-color: rgba(167, 99, 86, 0.42);
          box-shadow: 0 0 0 4px rgba(167, 99, 86, 0.07);
          background: rgba(255, 248, 244, 0.9);
        }

        .package-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .package-name {
          font-family: 'Cormorant Garamond', serif;
          font-size: 25px;
          font-weight: 600;
        }

        .package-price {
          color: var(--create-accent-dark);
          font-size: 12px;
          font-weight: 600;
        }

        .package-description {
          margin: 7px 0 0;
          color: var(--create-muted);
          font-size: 12px;
          line-height: 1.55;
        }

        .package-features {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 12px;
        }

        .package-feature {
          padding: 7px 9px;
          border-radius: 999px;
          background: rgba(167, 99, 86, 0.08);
          color: var(--create-accent-dark);
          font-size: 8px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .summary-box {
          margin-top: 20px;
          padding: 18px;
          border-radius: 16px;
          background: rgba(243, 236, 230, 0.72);
          border: 1px solid rgba(92, 57, 47, 0.08);
        }

        .summary-label {
          margin: 0 0 4px;
          color: var(--create-soft);
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.13em;
          text-transform: uppercase;
        }

        .summary-value {
          margin: 0;
          font-family: 'Cormorant Garamond', serif;
          font-size: 24px;
          font-weight: 600;
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

        .create-button {
          width: 100%;
          margin-top: 20px;
          border: 0;
          border-radius: 999px;
          padding: 15px 20px;
          background: var(--create-ink);
          color: #fffaf6;
          cursor: pointer;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          transition: transform 0.2s ease, background 0.2s ease;
        }

        .create-button:hover:not(:disabled) {
          transform: translateY(-1px);
          background: var(--create-accent-dark);
        }

        .create-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        @media (max-width: 980px) {
          .create-grid {
            grid-template-columns: 1fr;
          }

          .intro-card {
            position: relative;
            top: auto;
            min-height: auto;
          }
        }

        @media (max-width: 640px) {
          .brand-text {
            display: none;
          }

          .create-shell {
            padding-top: 24px;
          }

          .intro-card,
          .form-card {
            border-radius: 20px;
          }

          .field-grid {
            grid-template-columns: 1fr;
          }

          .field.full {
            grid-column: auto;
          }

          .package-heading {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>

      <main className="create-page">
        <header className="create-topbar">
          <a href="/" className="brand-lockup">
            <span className="brand-mark">W</span>
            <span className="brand-text">Wedding Memories</span>
          </a>
        </header>

        <div className="create-shell">
          <div className="create-grid">
            <section className="intro-card">
              <div>
                <p className="intro-kicker">Create your wedding experience</p>

                <h1 className="intro-title">
                  One day,
                  <em>every memory.</em>
                </h1>

                <p className="intro-copy">
                  Create a private wedding space where guests can share photos,
                  videos and wishes through one simple QR code.
                </p>
              </div>

              <div className="intro-benefits">
                <div className="benefit-row">
                  <span className="benefit-icon">♡</span>
                  <span>Private wedding gallery for every event</span>
                </div>
                <div className="benefit-row">
                  <span className="benefit-icon">⌁</span>
                  <span>Fast sharing through QR codes and direct links</span>
                </div>
                <div className="benefit-row">
                  <span className="benefit-icon">✦</span>
                  <span>Designed for mobile guests and modern weddings</span>
                </div>
              </div>
            </section>

            <section className="form-card">
              <div className="form-heading">
                <p className="form-kicker">Wedding details</p>
                <h2 className="form-title">Create a new event</h2>
                <p className="form-subtitle">
                  Add the couple&apos;s details and choose the package that best
                  suits the celebration.
                </p>
              </div>

              <div className="field-grid">
                <div className="field">
                  <label className="field-label">Bride&apos;s name</label>
                  <input
                    type="text"
                    placeholder="e.g. Sarah"
                    value={brideName}
                    onChange={(event) => setBrideName(event.target.value)}
                  />
                </div>

                <div className="field">
                  <label className="field-label">Groom&apos;s name</label>
                  <input
                    type="text"
                    placeholder="e.g. Daniel"
                    value={groomName}
                    onChange={(event) => setGroomName(event.target.value)}
                  />
                </div>

                <div className="field full">
                  <label className="field-label">Wedding date</label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(event) => setEventDate(event.target.value)}
                  />
                </div>

                <div className="field">
                  <label className="field-label">Start time</label>
                  <input
                    type="time"
                    value={eventStartTime}
                    onChange={(event) => setEventStartTime(event.target.value)}
                  />
                </div>

                <div className="field">
                  <label className="field-label">End time</label>
                  <input
                    type="time"
                    value={eventEndTime}
                    onChange={(event) => setEventEndTime(event.target.value)}
                  />
                </div>
              </div>

              <div className="package-section">
                <div className="package-heading">
                  <h2>Choose a package</h2>
                  <p>Can be upgraded later</p>
                </div>

                <div className="package-grid">
                  {packageOptions.map((option) => (
                    <button
                      key={option.name}
                      type="button"
                      className={`package-option ${
                        packageType === option.name ? 'active' : ''
                      }`}
                      onClick={() => setPackageType(option.name)}
                    >
                      <div className="package-top">
                        <span className="package-name">{option.label}</span>
                        <span className="package-price">{option.price}</span>
                      </div>

                      <p className="package-description">
                        {option.description}
                      </p>

                      <div className="package-features">
                        {option.features.map((feature) => (
                          <span key={feature} className="package-feature">
                            {feature}
                          </span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="summary-box">
                <p className="summary-label">Selected package</p>
                <p className="summary-value">
                  {selectedPackage.label} · {selectedPackage.price}
                </p>
              </div>

              {errorMessage && (
                <div className="error-box">{errorMessage}</div>
              )}

              <button
                type="button"
                className="create-button"
                onClick={handleGenerateEvent}
                disabled={isCreating}
              >
                {isCreating ? 'Creating your event...' : 'Create wedding event'}
              </button>
            </section>
          </div>
        </div>
      </main>
    </>
  )
}
