'use client'

import { useRouter } from 'next/navigation'

const packages = [
  {
    name: 'Basic',
    price: 'RM49',
    description: 'A simple digital wedding gallery for photo memories.',
    features: ['Photo uploads', 'Private event link', 'Guest QR code'],
  },
  {
    name: 'Premium',
    price: 'RM99',
    description: 'For couples who want both photos and videos.',
    features: ['Photo uploads', 'Video uploads', 'Live wedding gallery'],
    featured: true,
  },
  {
    name: 'VIP',
    price: 'RM149',
    description: 'The complete wedding memory experience.',
    features: ['Photos & videos', 'Voice messages', 'Priority experience'],
  },
]

const features = [
  {
    icon: '01',
    title: 'Create your event',
    description:
      'Add the couple’s names, choose a package and generate a private wedding space.',
  },
  {
    icon: '02',
    title: 'Share one QR code',
    description:
      'Guests scan the QR code and upload their photos, videos and messages instantly.',
  },
  {
    icon: '03',
    title: 'Keep every memory',
    description:
      'The couple receives a beautifully organised gallery filled with memories from the day.',
  },
]

export default function HomePage() {
  const router = useRouter()

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=DM+Sans:wght@300;400;500;600&display=swap');

        :root {
          --home-bg: #f4ede7;
          --home-surface: rgba(255, 252, 249, 0.88);
          --home-card: #fffdfb;
          --home-ink: #241713;
          --home-muted: #8d7b73;
          --home-soft: #b7a59c;
          --home-accent: #a76356;
          --home-accent-dark: #80483f;
          --home-line: rgba(89, 53, 44, 0.11);
        }

        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
          background: var(--home-bg);
          color: var(--home-ink);
        }

        button,
        a {
          font: inherit;
        }

        .home-page {
          min-height: 100vh;
          overflow-x: hidden;
          background:
            radial-gradient(circle at 8% 3%, rgba(198, 141, 120, 0.2), transparent 28%),
            radial-gradient(circle at 92% 8%, rgba(228, 191, 177, 0.23), transparent 30%),
            linear-gradient(180deg, #f9f3ee 0%, #f4ede7 48%, #ece2da 100%);
          font-family: 'DM Sans', sans-serif;
        }

        .home-nav {
          position: sticky;
          top: 0;
          z-index: 40;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 16px clamp(16px, 4vw, 54px);
          border-bottom: 1px solid rgba(78, 47, 39, 0.08);
          background: rgba(249, 243, 238, 0.82);
          backdrop-filter: blur(18px);
        }

        .brand-lockup {
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--home-ink);
          text-decoration: none;
        }

        .brand-mark {
          width: 32px;
          height: 32px;
          border: 1px solid rgba(167, 99, 86, 0.35);
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: rgba(255,255,255,0.68);
          color: var(--home-accent);
          font-family: 'Cormorant Garamond', serif;
          font-style: italic;
        }

        .brand-text {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.2em;
          text-transform: uppercase;
        }

        .nav-links {
          display: flex;
          align-items: center;
          gap: 22px;
        }

        .nav-links a {
          color: var(--home-muted);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-decoration: none;
          text-transform: uppercase;
        }

        .nav-cta {
          border: 0;
          border-radius: 999px;
          padding: 11px 16px;
          background: var(--home-ink);
          color: #fffaf6;
          cursor: pointer;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.11em;
          text-transform: uppercase;
        }

        .hero {
          width: min(1340px, 100%);
          margin: 0 auto;
          padding: 76px clamp(16px, 5vw, 64px) 84px;
        }

        .hero-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) minmax(340px, 0.85fr);
          gap: 32px;
          align-items: center;
        }

        .hero-copy {
          padding: 30px 0;
        }

        .hero-kicker {
          margin: 0 0 18px;
          color: var(--home-accent);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.28em;
          text-transform: uppercase;
        }

        .hero-title {
          margin: 0;
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(66px, 9vw, 122px);
          font-weight: 500;
          line-height: 0.79;
          letter-spacing: -0.06em;
        }

        .hero-title span,
        .hero-title em {
          display: block;
        }

        .hero-title em {
          margin-top: 16px;
          color: var(--home-accent);
          font-weight: 400;
          font-style: italic;
        }

        .hero-description {
          max-width: 580px;
          margin: 30px 0 0;
          color: var(--home-muted);
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(20px, 2.4vw, 28px);
          line-height: 1.45;
          font-style: italic;
        }

        .hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 30px;
        }

        .primary-action,
        .secondary-action {
          border-radius: 999px;
          padding: 14px 20px;
          cursor: pointer;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-decoration: none;
          text-transform: uppercase;
        }

        .primary-action {
          border: 0;
          background: var(--home-ink);
          color: #fffaf6;
        }

        .secondary-action {
          border: 1px solid var(--home-line);
          background: rgba(255, 252, 249, 0.7);
          color: var(--home-muted);
        }

        .hero-visual {
          position: relative;
          min-height: 560px;
          border: 1px solid rgba(91, 55, 46, 0.09);
          border-radius: 28px;
          overflow: hidden;
          background:
            linear-gradient(160deg, rgba(194, 132, 111, 0.8), rgba(120, 73, 62, 0.92)),
            #a76356;
          box-shadow: 0 30px 80px rgba(67, 39, 31, 0.15);
        }

        .hero-visual::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 50% 10%, rgba(255,255,255,0.24), transparent 34%),
            linear-gradient(180deg, transparent 40%, rgba(37, 18, 14, 0.35));
        }

        .visual-card {
          position: absolute;
          left: 26px;
          right: 26px;
          bottom: 26px;
          padding: 26px;
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 22px;
          background: rgba(255, 250, 246, 0.88);
          box-shadow: 0 18px 50px rgba(37, 18, 14, 0.24);
          backdrop-filter: blur(16px);
        }

        .visual-label {
          margin: 0 0 8px;
          color: var(--home-accent);
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .visual-title {
          margin: 0;
          font-family: 'Cormorant Garamond', serif;
          font-size: 44px;
          font-weight: 600;
        }

        .visual-copy {
          margin: 8px 0 0;
          color: var(--home-muted);
          font-size: 12px;
          line-height: 1.6;
        }

        .visual-grid{
          display:grid;
          grid-template-columns:repeat(3,1fr);
          gap:14px;
          margin-top:22px;
        }

        .visual-photo{
          width:100%;
          aspect-ratio:1;
          border-radius:18px;
          overflow:hidden;
          background:#f4ede7;
          box-shadow:0 10px 24px rgba(0,0,0,.12);
        }

        .visual-image{
          width:100%;
          height:100%;
          object-fit:cover;
          object-position:center;
          display:block;
          transition:.35s ease;
        }

        .visual-photo:hover .visual-image{
          transform:scale(1.06);
        }



        .visual-tile {
          aspect-ratio: 1;
          border-radius: 12px;
          background:
            linear-gradient(145deg, rgba(197, 140, 118, 0.72), rgba(106, 62, 52, 0.92));
        }

        .section {
          width: min(1280px, 100%);
          margin: 0 auto;
          padding: 80px clamp(16px, 4vw, 54px);
        }

        .section-heading {
          max-width: 760px;
          margin-bottom: 34px;
        }

        .section-kicker {
          margin: 0 0 10px;
          color: var(--home-accent);
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.17em;
          text-transform: uppercase;
        }

        .section-title {
          margin: 0;
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(42px, 6vw, 66px);
          font-weight: 600;
          line-height: 0.95;
        }

        .section-subtitle {
          max-width: 620px;
          margin: 16px 0 0;
          color: var(--home-muted);
          font-size: 13px;
          line-height: 1.7;
        }

        .steps-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

        .step-card {
          min-height: 280px;
          padding: 26px;
          border: 1px solid rgba(91, 55, 46, 0.09);
          border-radius: 22px;
          background: var(--home-surface);
          box-shadow: 0 16px 42px rgba(67, 39, 31, 0.06);
        }

        .step-number {
          display: inline-flex;
          margin-bottom: 48px;
          color: var(--home-accent);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.12em;
        }

        .step-card h3 {
          margin: 0;
          font-family: 'Cormorant Garamond', serif;
          font-size: 32px;
          font-weight: 600;
        }

        .step-card p {
          margin: 12px 0 0;
          color: var(--home-muted);
          font-size: 12px;
          line-height: 1.7;
        }

        .packages-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

        .package-card {
          position: relative;
          padding: 28px;
          border: 1px solid rgba(91, 55, 46, 0.09);
          border-radius: 22px;
          background: var(--home-surface);
          box-shadow: 0 16px 42px rgba(67, 39, 31, 0.06);
        }

        .package-card.featured {
          border-color: rgba(167, 99, 86, 0.34);
          background: rgba(255, 248, 244, 0.9);
          transform: translateY(-8px);
          box-shadow: 0 24px 58px rgba(67, 39, 31, 0.1);
        }

        .featured-label {
          position: absolute;
          top: 18px;
          right: 18px;
          padding: 7px 9px;
          border-radius: 999px;
          background: var(--home-ink);
          color: #fffaf6;
          font-size: 8px;
          font-weight: 600;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        }

        .package-name {
          margin: 0;
          font-family: 'Cormorant Garamond', serif;
          font-size: 34px;
          font-weight: 600;
        }

        .package-price {
          margin: 14px 0 0;
          color: var(--home-accent-dark);
          font-family: 'Cormorant Garamond', serif;
          font-size: 46px;
          font-weight: 600;
        }

        .package-description {
          margin: 10px 0 0;
          color: var(--home-muted);
          font-size: 12px;
          line-height: 1.6;
        }

        .package-features {
          display: grid;
          gap: 10px;
          margin-top: 24px;
        }

        .package-feature {
          display: flex;
          align-items: center;
          gap: 9px;
          color: var(--home-muted);
          font-size: 11px;
        }

        .package-feature::before {
          content: '✓';
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: rgba(167, 99, 86, 0.08);
          color: var(--home-accent-dark);
          font-size: 10px;
        }

        .package-button {
          width: 100%;
          margin-top: 26px;
          border: 0;
          border-radius: 999px;
          padding: 13px 17px;
          background: var(--home-ink);
          color: #fffaf6;
          cursor: pointer;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .final-cta {
          width: min(1180px, calc(100% - 32px));
          margin: 30px auto 90px;
          padding: clamp(42px, 7vw, 78px);
          border-radius: 28px;
          background:
            linear-gradient(145deg, rgba(168, 100, 87, 0.96), rgba(105, 59, 50, 0.98));
          color: #fff8f4;
          text-align: center;
          box-shadow: 0 30px 80px rgba(67, 39, 31, 0.18);
        }

        .final-cta h2 {
          margin: 0;
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(46px, 7vw, 74px);
          font-weight: 500;
          line-height: 0.95;
        }

        .final-cta p {
          max-width: 560px;
          margin: 18px auto 0;
          color: rgba(255, 248, 244, 0.75);
          font-size: 13px;
          line-height: 1.7;
        }

        .final-cta button {
          margin-top: 26px;
          border: 0;
          border-radius: 999px;
          padding: 14px 20px;
          background: #fff8f4;
          color: var(--home-accent-dark);
          cursor: pointer;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .home-footer {
          padding: 24px 20px 40px;
          text-align: center;
          color: var(--home-soft);
          font-size: 9px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        @media (max-width: 980px) {
          .hero-grid {
            grid-template-columns: 1fr;
          }

          .hero-visual {
            min-height: 460px;
          }

          .steps-grid,
          .packages-grid {
            grid-template-columns: 1fr;
          }

          .package-card.featured {
            transform: none;
          }
        }

        @media (max-width: 680px) {
          .nav-links {
            display: none;
          }

          .brand-text {
            display: none;
          }

          .hero {
            padding-top: 48px;
          }

          .hero-title {
            font-size: clamp(64px, 21vw, 92px);
          }

          .hero-visual {
            min-height: 400px;
          }

          .visual-card {
            left: 16px;
            right: 16px;
            bottom: 16px;
          }

          .section {
            padding-top: 58px;
            padding-bottom: 58px;
          }
        }
      `}</style>

      <main className="home-page">
        <header className="home-nav">
          <a href="/" className="brand-lockup">
            <span className="brand-mark">W</span>
            <span className="brand-text">Wedding Memories</span>
          </a>

          <nav className="nav-links">
            <a href="#how-it-works">How it works</a>
            <a href="#packages">Packages</a>
          </nav>

          <button
            type="button"
            className="nav-cta"
            onClick={() => router.push('/create-event')}
          >
            Create event
          </button>
        </header>

        <section className="hero">
          <div className="hero-grid">
            <div className="hero-copy">
              <p className="hero-kicker">Your wedding, remembered beautifully</p>

              <h1 className="hero-title">
                Every guest.
                <em>Every memory.</em>
              </h1>

              <p className="hero-description">
                One private QR code for guests to share photos, videos, voice
                messages and wishes from your wedding day.
              </p>

              <div className="hero-actions">
                <button
                  type="button"
                  className="primary-action"
                  onClick={() => router.push('/create-event')}
                >
                  Create your event
                </button>

                <a href="#how-it-works" className="secondary-action">
                  See how it works
                </a>
              </div>
            </div>

            <div className="hero-visual">
              <div className="visual-card">
                <p className="visual-label">Live wedding gallery</p>
                <h2 className="visual-title">Pana & Amy</h2>
                <p className="visual-copy">
                  Memories shared by family and friends, beautifully collected
                  in one place.
                </p>

                <div className="visual-grid">
                  <div className="visual-photo">
                    <img
                      className="visual-image"
                      src="/images/wedding-1.jpeg"
                      alt="Wedding memory"
                    />
                  </div>

                  <div className="visual-photo">
                    <img
                      className="visual-image"
                      src="/images/wedding-2.jpeg"
                      alt="Wedding memory"
                    />
                  </div>

                  <div className="visual-photo">
                    <img
                      className="visual-image"
                      src="/images/wedding-3.jpeg"
                      alt="Wedding memory"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="how-it-works">
          <div className="section-heading">
            <p className="section-kicker">Simple for everyone</p>
            <h2 className="section-title">Three steps. One beautiful gallery.</h2>
            <p className="section-subtitle">
              No application download is required. Guests simply scan, upload
              and continue enjoying the celebration.
            </p>
          </div>

          <div className="steps-grid">
            {features.map((feature) => (
              <article key={feature.title} className="step-card">
                <span className="step-number">{feature.icon}</span>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section" id="packages">
          <div className="section-heading">
            <p className="section-kicker">Choose your experience</p>
            <h2 className="section-title">Packages for every celebration.</h2>
            <p className="section-subtitle">
              Start with a simple photo gallery or choose a complete experience
              with videos and voice messages.
            </p>
          </div>

          <div className="packages-grid">
            {packages.map((item) => (
              <article
                key={item.name}
                className={`package-card ${item.featured ? 'featured' : ''}`}
              >
                {item.featured && (
                  <span className="featured-label">Most popular</span>
                )}

                <h3 className="package-name">{item.name}</h3>
                <p className="package-price">{item.price}</p>
                <p className="package-description">{item.description}</p>

                <div className="package-features">
                  {item.features.map((feature) => (
                    <span key={feature} className="package-feature">
                      {feature}
                    </span>
                  ))}
                </div>

                <button
                  type="button"
                  className="package-button"
                  onClick={() => router.push('/create-event')}
                >
                  Choose {item.name}
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="final-cta">
          <h2>Turn your wedding day into a living memory.</h2>
          <p>
            Create your private wedding gallery and let every guest become part
            of the story.
          </p>
          <button type="button" onClick={() => router.push('/create-event')}>
            Create wedding event
          </button>
        </section>

        <footer className="home-footer">
          Wedding Memories · Created for celebrations worth remembering
        </footer>
      </main>
    </>
  )
}
