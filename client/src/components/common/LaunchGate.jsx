import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Holding page shown until the official launch.
 *
 * Covers the site with a countdown. Triple-click the logo lockup at the top left
 * — where the navigation bar sits behind it — and the site is revealed for that
 * browser until the launch date passes, at which point the cover retires itself.
 *
 * **This is a curtain, not a lock.** It runs in the browser, so the pages behind
 * it are still served and anyone who knows to look can read them. That is the
 * right trade for a launch that is a week away and a site whose content is
 * meant to be public anyway — but do not put anything behind it that would
 * matter if it were read early.
 *
 * Two things are deliberately let through:
 *
 * - **The admin panel and sign-in.** The secretariat is loading content during
 *   exactly this week — news, jobs, partners, firms. Gating those would stop the
 *   work the countdown exists to make room for.
 * - **Anything with `?preview` on the URL**, so a link can be handed to someone
 *   for review without teaching them the click.
 */

/* Launch: midday on Friday 14 August 2026, a week out from the President's
   approval. Noon rather than midnight for two reasons — a launch nobody is awake
   for is a launch nobody can fix, and the days figure is a floor, so a midnight
   target would already read 06 by mid-morning on the first day.

   Change this one line to move the date. Delete the component from App.jsx to
   take the cover down early; it also retires itself once the date passes.

   Written with an explicit +01:00 rather than `new Date(2026, 7, 14, 12, 0, 0)`,
   which is not the same thing: that form means noon *on the visitor's own
   device*, so the cover would lift at a different absolute moment for everyone
   who opened it. A member in Sydney would have seen the site nine hours before
   the Institute announced it, and one in New York would still have been looking
   at a countdown five hours after the President had. WAT is UTC+1 year-round —
   Nigeria keeps no daylight saving — so this is a fixed offset, and every
   visitor now unlocks at the same instant: noon in Lagos. */
export const LAUNCH_AT = new Date('2026-08-14T12:00:00+01:00'); // 14 August 2026, 12:00 WAT

const KEY = 'niqs.launch.unlocked';
const CLICKS_TO_UNLOCK = 3;
const CLICK_WINDOW_MS = 800;

/* Routes the cover never applies to. Prefix match. */
const ALWAYS_OPEN = ['/admin', '/login', '/forgot-password', '/reset-password'];

function remaining(to, from) {
  const ms = Math.max(0, to.getTime() - from.getTime());
  return {
    ms,
    days: Math.floor(ms / 86400000),
    hours: Math.floor((ms % 86400000) / 3600000),
    minutes: Math.floor((ms % 3600000) / 60000),
    seconds: Math.floor((ms % 60000) / 1000),
  };
}

function Unit({ value, label }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 74 }}>
      <div style={{
        fontFamily: "'Sora', sans-serif", fontSize: 'clamp(2rem, 6vw, 3.4rem)',
        fontWeight: 800, lineHeight: 1, color: '#fff', letterSpacing: '-.03em',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {String(value).padStart(2, '0')}
      </div>
      <div style={{
        marginTop: 8, fontSize: '.6rem', fontWeight: 700, letterSpacing: '.16em',
        textTransform: 'uppercase', color: 'rgba(235,200,122,.9)',
      }}>
        {label}
      </div>
    </div>
  );
}

export default function LaunchGate() {
  const { pathname, search } = useLocation();

  const passed = () => Date.now() >= LAUNCH_AT.getTime();
  const [unlocked, setUnlocked] = useState(() => {
    if (typeof window === 'undefined') return true;
    if (passed()) return true;
    try { if (localStorage.getItem(KEY) === '1') return true; } catch { /* private mode */ }
    return new URLSearchParams(window.location.search).has('preview');
  });
  const [left, setLeft] = useState(() => remaining(LAUNCH_AT, new Date()));
  const [hint, setHint] = useState(false);
  const clicks = useRef([]);

  /* One timer, not one per unit — and it retires the cover on its own when the
     date arrives, so a tab left open overnight does not keep showing a countdown
     at zero. */
  useEffect(() => {
    if (unlocked) return undefined;
    const t = setInterval(() => {
      const r = remaining(LAUNCH_AT, new Date());
      setLeft(r);
      if (r.ms === 0) setUnlocked(true);
    }, 1000);
    return () => clearInterval(t);
  }, [unlocked]);

  /* The page behind must not scroll while the cover is up. */
  useEffect(() => {
    if (unlocked) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [unlocked]);

  const onLockClick = useCallback(() => {
    const now = Date.now();
    clicks.current = [...clicks.current.filter(t => now - t < CLICK_WINDOW_MS), now];
    if (clicks.current.length >= CLICKS_TO_UNLOCK) {
      clicks.current = [];
      try { localStorage.setItem(KEY, '1'); } catch { /* private mode: this session only */ }
      setUnlocked(true);
      return;
    }
    // Acknowledge the first click so the gesture does not feel broken mid-way.
    setHint(true);
    setTimeout(() => setHint(false), CLICK_WINDOW_MS);
  }, []);

  if (unlocked) return null;
  if (ALWAYS_OPEN.some(p => pathname.startsWith(p))) return null;
  if (new URLSearchParams(search).has('preview')) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Website launching soon"
      style={{
        position: 'fixed', inset: 0, zIndex: 100000,
        display: 'flex', flexDirection: 'column',
        background:
          'radial-gradient(1200px 600px at 15% -10%, #1B3A7A 0%, transparent 60%),'
          + 'radial-gradient(900px 500px at 110% 110%, #17306B 0%, transparent 55%),'
          + 'linear-gradient(160deg, #0B1F4B 0%, #08163A 100%)',
      }}
    >
      {/* Where the navigation bar sits behind the cover. Triple-click the lockup. */}
      <div style={{ padding: 'clamp(1rem, 3vw, 1.8rem) clamp(1rem, 5vw, 3rem)' }}>
        <button
          type="button"
          onClick={onLockClick}
          aria-label="NIQS"
          title=""
          style={{
            display: 'flex', alignItems: 'center', gap: '.7rem',
            background: 'transparent', border: 0, padding: 0, cursor: 'default',
            WebkitTapHighlightColor: 'transparent', userSelect: 'none',
            outline: 'none',
          }}
        >
          <img
            src="/NIQS-LOGO-PNG-NAV.png" alt=""
            style={{
              height: 46, width: 'auto', display: 'block',
              filter: hint ? 'brightness(1.35)' : 'none',
              transition: 'filter .18s ease',
            }}
            draggable="false"
          />
          <span style={{
            fontFamily: "'Sora', sans-serif", fontSize: '.72rem', fontWeight: 700,
            letterSpacing: '.14em', textTransform: 'uppercase',
            color: 'rgba(255,255,255,.55)',
          }}>
            Nigerian Institute of<br />Quantity Surveyors
          </span>
        </button>
      </div>

      {/* The glass card */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem clamp(1rem, 5vw, 3rem) clamp(2rem, 6vw, 4rem)',
      }}>
        <div style={{
          width: '100%', maxWidth: 720, textAlign: 'center',
          padding: 'clamp(1.8rem, 5vw, 3.2rem) clamp(1.4rem, 5vw, 3rem)',
          borderRadius: 22,
          background: 'rgba(255,255,255,.07)',
          backdropFilter: 'blur(22px) saturate(140%)',
          WebkitBackdropFilter: 'blur(22px) saturate(140%)',
          border: '1px solid rgba(255,255,255,.16)',
          boxShadow: '0 24px 70px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.14)',
        }}>
          <div style={{
            fontSize: '.66rem', fontWeight: 700, letterSpacing: '.2em',
            textTransform: 'uppercase', color: '#C9974A', marginBottom: '1rem',
          }}>
            Official launch
          </div>

          {/* Heading face, like every other heading on the site. This one was
              pinned to the body face inline, which is why it alone came out in
              Sora. The countdown digits above stay in Sora on purpose — they
              are set with tabular-nums so the numbers do not jump as they
              tick, and that is a property of this face here. */}
          <h1 style={{
            fontFamily: "var(--font-heading)",
            fontSize: 'clamp(1.6rem, 5vw, 2.6rem)', fontWeight: 800,
            lineHeight: 1.15, color: '#fff', margin: '0 0 .9rem', letterSpacing: '-.02em',
          }}>
            Our new website<br />goes live in
          </h1>

          <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
            gap: 'clamp(.4rem, 3vw, 1.6rem)', flexWrap: 'wrap',
            margin: '1.6rem 0 1.5rem',
          }}>
            <Unit value={left.days} label="Days" />
            <Unit value={left.hours} label="Hours" />
            <Unit value={left.minutes} label="Minutes" />
            <Unit value={left.seconds} label="Seconds" />
          </div>

          <p style={{
            fontSize: 'clamp(.86rem, 2vw, .96rem)', lineHeight: 1.65,
            color: 'rgba(255,255,255,.72)', margin: '0 auto', maxWidth: 460,
          }}>
            The Nigerian Institute of Quantity Surveyors is putting the finishing
            touches to its new home online. Thank you for your patience.
          </p>

          <div style={{
            marginTop: '1.8rem', paddingTop: '1.3rem',
            borderTop: '1px solid rgba(255,255,255,.12)',
            display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
            gap: '.4rem 1.4rem',
            fontSize: '.78rem', color: 'rgba(255,255,255,.6)',
          }}>
            <a href="mailto:info@niqs.org.ng" style={{ color: 'rgba(235,200,122,.95)', textDecoration: 'none' }}>
              info@niqs.org.ng
            </a>
            <span>QS Olusegun Ajanlekoko House, Abuja</span>
          </div>
        </div>
      </div>
    </div>
  );
}
