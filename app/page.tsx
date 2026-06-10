import Link from 'next/link'

export default function HomePage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .home-page {
          min-height: 100vh;
          background-color: #FAF7F2;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-family: 'DM Sans', sans-serif;
          position: relative;
          overflow: hidden;
        }

        .home-bg {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
        }

        .home-content {
          position: relative;
          z-index: 2;
          text-align: center;
          padding: 24px;
          max-width: 520px;
        }

        .home-eyebrow {
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: #B8965A;
          margin-bottom: 16px;
        }

        .home-ornament {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-bottom: 20px;
        }

        .orn-line {
          height: 1px;
          width: 50px;
          background: linear-gradient(to right, transparent, #B8965A80);
        }
        .orn-line.r {
          background: linear-gradient(to left, transparent, #B8965A80);
        }
        .orn-diamond {
          width: 5px;
          height: 5px;
          background: #B8965A;
          transform: rotate(45deg);
        }

        .home-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(44px, 9vw, 72px);
          font-weight: 300;
          color: #1C1714;
          line-height: 1.05;
          letter-spacing: -0.02em;
          margin-bottom: 8px;
        }

        .home-title em {
          font-style: italic;
          color: #C4847A;
        }

        .home-subtitle {
          font-size: 14px;
          font-weight: 300;
          color: #9E8E86;
          letter-spacing: 0.06em;
          margin-bottom: 44px;
          text-transform: uppercase;
        }

        .home-cta {
          display: inline-block;
          padding: 14px 44px;
          background: #1C1714;
          color: #FAF7F2;
          text-decoration: none;
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          border-radius: 2px;
          transition: background 0.2s ease;
        }

        .home-cta:hover {
          background: #C4847A;
        }

        .home-tagline {
          margin-top: 28px;
          font-size: 12px;
          color: #B8A8A0;
          letter-spacing: 0.04em;
        }

        .home-tagline span {
          color: #B8965A;
          margin: 0 6px;
        }
      `}</style>

      <div className="home-page">
        <svg className="home-bg" viewBox="0 0 1440 900" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
          <g opacity="0.11" fill="none" stroke="#B8965A" strokeWidth="0.8">
            <path d="M -30 -20 Q 100 80 80 200 Q 60 320 140 400" />
            <path d="M 30 40 Q 130 100 120 240" />
            <ellipse cx="85" cy="190" rx="22" ry="10" transform="rotate(-35 85 190)" />
            <ellipse cx="130" cy="230" rx="18" ry="8" transform="rotate(-55 130 230)" />
            <ellipse cx="50" cy="130" rx="14" ry="6" transform="rotate(25 50 130)" />
            <circle cx="90" cy="60" r="3" /><circle cx="95" cy="53" r="2" /><circle cx="84" cy="53" r="2" />
            <circle cx="97" cy="67" r="2" /><circle cx="82" cy="67" r="2" />
          </g>
          <g opacity="0.09" fill="none" stroke="#C4847A" strokeWidth="0.8" transform="translate(1440,900) rotate(180)">
            <path d="M -30 -20 Q 100 80 80 200 Q 60 320 140 400" />
            <path d="M 30 40 Q 130 100 120 240" />
            <ellipse cx="85" cy="190" rx="22" ry="10" transform="rotate(-35 85 190)" />
            <ellipse cx="130" cy="230" rx="18" ry="8" transform="rotate(-55 130 230)" />
            <ellipse cx="50" cy="130" rx="14" ry="6" transform="rotate(25 50 130)" />
            <circle cx="90" cy="60" r="3" /><circle cx="95" cy="53" r="2" /><circle cx="84" cy="53" r="2" />
          </g>
          <g opacity="0.06" stroke="#B8965A" strokeWidth="0.6" fill="none">
            <circle cx="720" cy="450" r="200" />
            <circle cx="720" cy="450" r="240" />
          </g>
        </svg>

        <div className="home-content">
          <p className="home-eyebrow">Memories, beautifully kept</p>
          <div className="home-ornament">
            <span className="orn-line"></span>
            <span className="orn-diamond"></span>
            <span className="orn-line r"></span>
          </div>
          <h1 className="home-title">
            Wedding<br /><em>QR Gallery</em>
          </h1>
          <p className="home-subtitle">Scan · Upload · Collect</p>

          <Link href="/create-event" className="home-cta">
            Create Your Event
          </Link>

          <p className="home-tagline">
            Share the link <span>·</span> Guests upload photos <span>·</span> You keep everything
          </p>
        </div>
      </div>
    </>
  )
}
