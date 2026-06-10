'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

type PackageType = 'BASIC' | 'PREMIUM' | 'VIP'

export default function CreateEventPage() {
  const router = useRouter()
  const [brideName, setBrideName] = useState('')
  const [groomName, setGroomName] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [packageType, setPackageType] = useState<PackageType>('BASIC')
  const [isCreating, setIsCreating] = useState(false)

  const createSlug = (bride: string, groom: string) => {
    return `${bride}-${groom}`
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
  }

  const handleGenerateEvent = async () => {
    if (!brideName || !groomName || !eventDate) {
      alert('Please fill in all fields')
      return
    }

    try {
      setIsCreating(true)

      const slug = createSlug(brideName, groomName)

      const { error } = await supabase.from('events').upsert(
        {
          slug,
          bride_name: brideName.trim(),
          groom_name: groomName.trim(),
          package_type: packageType,
        },
        { onConflict: 'slug' }
      )

      if (error) {
        alert(error.message)
        return
      }

      router.push(`/event/${slug}`)
    } catch {
      alert('Failed to create wedding event')
    } finally {
      setIsCreating(false)
    }
  }

  const packageDescription =
    packageType === 'BASIC'
      ? 'Photo upload only.'
      : packageType === 'PREMIUM'
        ? 'Photo and video upload enabled.'
        : 'Photo, video and voice message enabled.'

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .page {
          min-height: 100vh;
          background-color: #FAF7F2;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'DM Sans', sans-serif;
          position: relative;
          overflow: hidden;
        }

        .bg-botanical {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
        }

        .card-wrapper {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 480px;
          padding: 24px;
        }

        .crest {
          text-align: center;
          margin-bottom: 32px;
        }

        .crest-ornament {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .crest-line {
          height: 1px;
          width: 60px;
          background: linear-gradient(to right, transparent, #B8965A);
        }

        .crest-line.right {
          background: linear-gradient(to left, transparent, #B8965A);
        }

        .crest-diamond {
          width: 6px;
          height: 6px;
          background: #B8965A;
          transform: rotate(45deg);
          flex-shrink: 0;
        }

        .eyebrow {
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: #B8965A;
          margin-bottom: 8px;
        }

        .main-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(36px, 7vw, 52px);
          font-weight: 300;
          color: #1C1714;
          line-height: 1.1;
          letter-spacing: -0.01em;
        }

        .main-title em {
          font-style: italic;
          color: #C4847A;
        }

        .subtitle {
          font-size: 13px;
          color: #8B7B74;
          font-weight: 300;
          margin-top: 8px;
          letter-spacing: 0.02em;
        }

        .card {
          background: #FFFFFF;
          border-radius: 4px;
          padding: 40px 40px 36px;
          box-shadow:
            0 2px 4px rgba(28, 23, 20, 0.04),
            0 12px 40px rgba(28, 23, 20, 0.08),
            0 0 0 1px rgba(184, 150, 90, 0.12);
          position: relative;
        }

        .card::before,
        .card::after {
          content: '';
          position: absolute;
          width: 20px;
          height: 20px;
          border-color: #B8965A;
          border-style: solid;
          opacity: 0.5;
        }

        .card::before {
          top: 12px;
          left: 12px;
          border-width: 1px 0 0 1px;
        }

        .card::after {
          bottom: 12px;
          right: 12px;
          border-width: 0 1px 1px 0;
        }

        .field-group {
          display: flex;
          flex-direction: column;
          gap: 20px;
          margin-bottom: 28px;
        }

        .field {
          position: relative;
        }

        .field-label {
          display: block;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #B8965A;
          margin-bottom: 6px;
        }

        .field input {
          width: 100%;
          border: none;
          border-bottom: 1px solid #E8DDD6;
          background: transparent;
          padding: 8px 0 10px;
          font-family: 'Cormorant Garamond', serif;
          font-size: 18px;
          font-weight: 400;
          color: #1C1714;
          outline: none;
          transition: border-color 0.2s ease;
          letter-spacing: 0.01em;
        }

        .field input::placeholder {
          color: #C8B8B0;
          font-style: italic;
          font-size: 17px;
        }

        .field input:focus {
          border-bottom-color: #C4847A;
        }

        .ampersand-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: -4px 0;
        }

        .amp-line {
          flex: 1;
          height: 1px;
          background: #F0E6E0;
        }

        .amp-char {
          font-family: 'Cormorant Garamond', serif;
          font-size: 22px;
          font-style: italic;
          color: #D4A0A0;
          font-weight: 300;
          line-height: 1;
        }

        .package-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-top: 10px;
        }

        .package-btn {
          padding: 12px 8px;
          border: 1px solid #E8DDD6;
          background: #FFFFFF;
          color: #8B7B74;
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          border-radius: 4px;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .package-btn.active {
          border-color: #C4847A;
          background: #FFF6F4;
          color: #C4847A;
        }

        .package-desc {
          margin-top: 12px;
          font-size: 11px;
          color: #9E8E86;
          line-height: 1.6;
        }

        .btn-generate {
          width: 100%;
          padding: 15px 24px;
          background: #1C1714;
          color: #FAF7F2;
          border: none;
          border-radius: 2px;
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          cursor: pointer;
          transition: background 0.2s ease, transform 0.1s ease;
        }

        .btn-generate:hover {
          background: #C4847A;
        }

        .btn-generate:disabled {
          background: #9B948D;
          cursor: not-allowed;
        }

        .footer-note {
          text-align: center;
          margin-top: 20px;
          font-size: 11px;
          color: #B8A8A0;
          letter-spacing: 0.05em;
        }

        input[type="date"]::-webkit-calendar-picker-indicator {
          opacity: 0.3;
          cursor: pointer;
          filter: sepia(1) hue-rotate(330deg);
        }

        @media (max-width: 520px) {
          .card {
            padding: 34px 24px 30px;
          }

          .package-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="page">
        <svg
          className="bg-botanical"
          viewBox="0 0 1440 900"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid slice"
        >
          <g opacity="0.12" fill="none" stroke="#B8965A" strokeWidth="1">
            <path d="M -20 -10 Q 80 60 60 160" />
            <path d="M 20 30 Q 110 80 100 200" />
            <path d="M 60 10 Q 40 120 130 180" />
            <ellipse cx="65" cy="155" rx="18" ry="9" transform="rotate(-30 65 155)" />
            <ellipse cx="105" cy="195" rx="22" ry="10" transform="rotate(-50 105 195)" />
            <ellipse cx="135" cy="175" rx="16" ry="7" transform="rotate(20 135 175)" />
            <ellipse cx="30" cy="100" rx="14" ry="6" transform="rotate(-60 30 100)" />
            <ellipse cx="80" cy="80" rx="12" ry="5" transform="rotate(40 80 80)" />
            <circle cx="68" cy="45" r="4" />
            <circle cx="72" cy="38" r="2" />
            <circle cx="62" cy="38" r="2" />
            <circle cx="75" cy="50" r="2" />
            <circle cx="60" cy="50" r="2" />
          </g>

          <g
            opacity="0.10"
            fill="none"
            stroke="#C4847A"
            strokeWidth="1"
            transform="translate(1440, 900) rotate(180)"
          >
            <path d="M -20 -10 Q 80 60 60 160" />
            <path d="M 20 30 Q 110 80 100 200" />
            <path d="M 60 10 Q 40 120 130 180" />
            <ellipse cx="65" cy="155" rx="18" ry="9" transform="rotate(-30 65 155)" />
            <ellipse cx="105" cy="195" rx="22" ry="10" transform="rotate(-50 105 195)" />
            <ellipse cx="135" cy="175" rx="16" ry="7" transform="rotate(20 135 175)" />
            <ellipse cx="30" cy="100" rx="14" ry="6" transform="rotate(-60 30 100)" />
            <ellipse cx="80" cy="80" rx="12" ry="5" transform="rotate(40 80 80)" />
            <circle cx="68" cy="45" r="4" />
            <circle cx="72" cy="38" r="2" />
            <circle cx="62" cy="38" r="2" />
            <circle cx="75" cy="50" r="2" />
            <circle cx="60" cy="50" r="2" />
          </g>

          <g
            opacity="0.07"
            fill="none"
            stroke="#B8965A"
            strokeWidth="0.8"
            transform="translate(1380, 20)"
          >
            <circle cx="0" cy="0" r="30" />
            <circle cx="0" cy="0" r="20" />
            <circle cx="0" cy="0" r="10" />
            <line x1="-35" y1="0" x2="35" y2="0" />
            <line x1="0" y1="-35" x2="0" y2="35" />
          </g>
        </svg>

        <div className="card-wrapper">
          <div className="crest">
            <p className="eyebrow">Wedding Gallery</p>

            <div className="crest-ornament">
              <span className="crest-line"></span>
              <span className="crest-diamond"></span>
              <span className="crest-line right"></span>
            </div>

            <h1 className="main-title">
              Create Your<br />
              <em>Wedding Event</em>
            </h1>

            <p className="subtitle">
              Your memories, beautifully collected in one place
            </p>
          </div>

          <div className="card">
            <div className="field-group">
              <div className="field">
                <label className="field-label">Bride's Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sarah"
                  value={brideName}
                  onChange={(e) => setBrideName(e.target.value)}
                />
              </div>

              <div className="ampersand-row">
                <span className="amp-line"></span>
                <span className="amp-char">&</span>
                <span className="amp-line"></span>
              </div>

              <div className="field">
                <label className="field-label">Groom's Name</label>
                <input
                  type="text"
                  placeholder="e.g. Daniel"
                  value={groomName}
                  onChange={(e) => setGroomName(e.target.value)}
                />
              </div>

              <div className="field">
                <label className="field-label">Wedding Date</label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                />
              </div>

              <div className="field">
                <label className="field-label">Package Type</label>

                <div className="package-grid">
                  {(['BASIC', 'PREMIUM', 'VIP'] as PackageType[]).map((pkg) => (
                    <button
                      key={pkg}
                      type="button"
                      onClick={() => setPackageType(pkg)}
                      className={`package-btn ${
                        packageType === pkg ? 'active' : ''
                      }`}
                    >
                      {pkg}
                    </button>
                  ))}
                </div>

                <p className="package-desc">{packageDescription}</p>
              </div>
            </div>

            <button
              className="btn-generate"
              onClick={handleGenerateEvent}
              disabled={isCreating}
            >
              {isCreating ? 'Creating...' : 'Generate Your Gallery'}
            </button>
          </div>

          <p className="footer-note">
            A private gallery will be created for your guests
          </p>
        </div>
      </div>
    </>
  )
}