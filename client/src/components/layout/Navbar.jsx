import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Icon from '../common/Icon';

/* ── helper: closes dropdown when clicking outside ── */
function useClickOutside(ref, handler) {
  useEffect(() => {
    function listener(e) {
      if (!ref.current || ref.current.contains(e.target)) return;
      handler();
    }
    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler]);
}

/* ── single dropdown component ── */
function NavDropdown({ label, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useClickOutside(ref, () => setOpen(false));

  const childrenWithClose = React.Children.map(children, (child) => {
    if (!child) return child;
    if (child.props && child.props.to !== undefined) {
      return React.cloneElement(child, { onClick: () => setOpen(false) });
    }
    return child;
  });

  return (
    <div className="ndd" ref={ref}>
      <button
        className={`nl${open ? " on" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {label}{" "}
        <span
          className="nl-chevron"
          style={
            open
              ? { transform: "rotate(180deg)", color: "var(--color-gold)" }
              : {}
          }
        >
          &#9662;
        </span>
      </button>
      <div className={`ddmenu${open ? " ddopen" : ""}`}>
        {childrenWithClose}
      </div>
    </div>
  );
}

/* ── User avatar chip (shown when logged in) ── */
function UserChip() {
  const { admin, user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useClickOutside(ref, () => setOpen(false));

  const isAdminUser = !!admin;
  const firstName = admin?.firstName || user?.firstName || "";
  const lastName = admin?.lastName || user?.lastName || "";
  const initials =
    `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase() || "?";
  const fullName = `${firstName} ${lastName}`.trim() || "Account";
  const portalPath = isAdminUser ? "/admin" : "/portal";

  const bgColor = isAdminUser ? "#D9B650" : "#000066";

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate("/login");
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "transparent",
          border: "1.5px solid rgba(255,255,255,0.25)",
          borderRadius: 50,
          padding: "5px 12px 5px 5px",
          cursor: "pointer",
          color: "#fff",
          fontSize: 13,
          fontWeight: 600,
          transition: "border-color 0.2s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#D9B650")}
        onMouseLeave={(e) =>
          (e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)")
        }
      >
        {/* Avatar circle */}
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: bgColor,
            border: "2px solid rgba(255,255,255,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 700,
            color: "#fff",
            flexShrink: 0,
          }}
        >
          {initials}
        </span>
        {firstName}
        <span style={{ fontSize: 10, opacity: 0.7 }}>&#9662;</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 10px)",
            right: 0,
            background: "#fff",
            borderRadius: 10,
            border: "1px solid #e5e7eb",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            minWidth: 200,
            zIndex: 2000,
            overflow: "hidden",
          }}
        >
          {/* Info header */}
          <div
            style={{
              padding: "14px 16px",
              borderBottom: "1px solid #f3f4f6",
              background: "#f9fafb",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: bgColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 15,
                fontWeight: 700,
                color: "#fff",
                marginBottom: 8,
              }}
            >
              {initials}
            </div>
            <p
              style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 700,
                color: "#111827",
              }}
            >
              {fullName}
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "#9ca3af" }}>
              {isAdminUser
                ? admin?.role?.replace(/_/g, " ") || "Admin"
                : "Member"}
            </p>
          </div>

          {/* Links */}
          <div style={{ padding: "6px 0" }}>
            <button
              onClick={() => {
                setOpen(false);
                navigate(portalPath);
              }}
              style={menuItemStyle}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#f3f4f6")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              {isAdminUser
                ? <><Icon name="shield" size="sm" /> Admin Panel</>
                : <><Icon name="user" size="sm" /> My Portal</>}
            </button>
            <button
              onClick={handleLogout}
              style={{ ...menuItemStyle, color: "#dc2626" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#fef2f2")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <Icon name="logout" size="sm" /> Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const menuItemStyle = {
  display: "block",
  width: "100%",
  padding: "9px 16px",
  background: "transparent",
  border: "none",
  textAlign: "left",
  fontSize: 13,
  fontWeight: 500,
  color: "#374151",
  cursor: "pointer",
  transition: "background 0.1s",
};

/* Height of the fixed bar, matching #nav in the stylesheet. */
const NAV_HEIGHT = 68;

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [overHero, setOverHero] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { admin, user, logout } = useAuth();

  const isLoggedIn = !!(admin || user);
  // "Request a Flyer" is an admin-facing entry point — only surface it to admins.
  const isAdminUser = !!admin;

  /* The bar rides transparent over the landing hero and takes its navy plate the
     moment the hero's bottom edge clears it. Measured off the hero element rather
     than a fixed offset, because the hero is not a fixed height any more — it
     grows when the fan strip opens — and a hard-coded threshold would go stale
     the first time that layout changed.

     Pages with no hero (`#heroWrap` absent) keep the old always-solid bar: the
     content there starts immediately under the nav and would read straight
     through it. */
  useEffect(() => {
    const handleScroll = () => {
      const hero = document.getElementById("heroWrap");
      const isOver = hero ? hero.getBoundingClientRect().bottom > NAV_HEIGHT : false;
      setOverHero(isOver);
      setScrolled(window.scrollY > 10);
      /* Published on the root element as well as held in state, because the
         announcement ticker is a sibling rendered by the page, not by this bar,
         and it has to drop its own navy plate at exactly the same moment. A
         transparent bar sitting on a solid navy strip reads as a broken header. */
      document.documentElement.toggleAttribute("data-nav-over-hero", isOver);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      document.documentElement.removeAttribute("data-nav-over-hero");
    };
    /* Re-run on navigation: whether a hero exists at all is a per-route fact, and
       the listener alone would not fire until the reader next scrolled. */
  }, [location.pathname]);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const toggleMenu = () => setMenuOpen((v) => !v);
  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      {/* An open mobile menu drops a white panel straight below the bar, so the
          bar takes its plate back regardless of where the scroll is — otherwise
          the panel hangs off a transparent strip. */}
      <nav
        id="nav"
        className={`${scrolled ? "sc" : ""}${overHero && !menuOpen ? " over-hero" : ""}`}
      >
        <div className="ninner">
          {/* Logo — the official horizontal lockup from the 2026 brand pack.
              It already carries the emblem, the Institute's name and the
              tagline, so the wordmark that used to sit beside the old crest
              would now be the name twice over. Dark-BG variant: the bar is
              navy at every scroll state. */}
          <Link to="/" className="nlogo">
            <img
              src="/brand/lockup-horizontal-dark.png"
              alt="Nigerian Institute of Quantity Surveyors"
              style={{
                height: 46,
                width: "auto",
                display: "block",
                objectFit: "contain",
              }}
            />
          </Link>

          {/* Desktop Nav */}
          <div className="nlinks">
            <Link
              to="/"
              className={`nl${location.pathname === "/" ? " on" : ""}`}
            >
              Home
            </Link>

            <NavDropdown label="About Us">
              <Link to="/about" className="ddi">
                About NIQS
              </Link>
              <Link to="/brand-materials" className="ddi">
                Brand Materials
              </Link>
              <div className="ddi-div"></div>
              <Link to="/president" className="ddi">
                The President
              </Link>
              <Link to="/council" className="ddi">
                National Executive Council
              </Link>
              <Link to="/npc" className="ddi">
                National Policy Committee
              </Link>
              <Link to="/national-bodies" className="ddi">
                National Body Chairmen
              </Link>
              <Link to="/board-of-trustees" className="ddi">
                Board of Trustees
              </Link>
              <Link to="/past-presidents" className="ddi">
                Past Presidents
              </Link>
              <div className="ddi-div"></div>
              <Link to="/chapters" className="ddi">
                State Chapters
              </Link>
              <Link to="/waqsn" className="ddi">
                WAQSN
              </Link>
              <Link to="/yqsf" className="ddi">
                YQSF
              </Link>
              <Link to="/reciprocity" className="ddi">
                Reciprocity Agreements
              </Link>
            </NavDropdown>

            <NavDropdown label="Membership">
              <Link to="/membership" className="ddi">
                Requirements &amp; Registration
              </Link>
              <Link to="/search-qs-firms" className="ddi">
                Search QS / QS Firm
              </Link>
              <div className="ddi-div"></div>
              <Link to="/login" className="ddi">
                Member Portal <span className="lock"><Icon name="lock" size="sm" /></span>
              </Link>
              <Link to="/login" className="ddi">
                Induction Letter <span className="lock"><Icon name="lock" size="sm" /></span>
              </Link>
              <Link to="/login" className="ddi">
                Upgrade Letter <span className="lock"><Icon name="lock" size="sm" /></span>
              </Link>
            </NavDropdown>

            <NavDropdown label="Exams">
              <Link to="/exams" className="ddi">
                Examinations
              </Link>
              <Link to="/exams" className="ddi">
                Published Results
              </Link>
              <div className="ddi-div"></div>
              <Link to="/login" className="ddi">
                Interview Results <span className="lock"><Icon name="lock" size="sm" /></span>
              </Link>
              <Link to="/login" className="ddi">
                TPC/GDE Results <span className="lock"><Icon name="lock" size="sm" /></span>
              </Link>
              <Link to="/login" className="ddi">
                Logbook Result <span className="lock"><Icon name="lock" size="sm" /></span>
              </Link>
            </NavDropdown>

            <NavDropdown label="Research &amp; Devt">
              <Link to="/library" className="ddi">
                Digital Library
              </Link>
              <Link to="/login" className="ddi">
                Workshop Certificates <span className="lock"><Icon name="lock" size="sm" /></span>
              </Link>
              <Link to="/workshop-materials" className="ddi">
                Workshop Materials
              </Link>
              <Link to="/research" className="ddi">
                Publications
              </Link>
              <Link to="/research#journal" className="ddi">
                Journal of QS
              </Link>
            </NavDropdown>

            <NavDropdown label="News">
              <Link to="/events" className="ddi">
                Upcoming Events
              </Link>
              <Link to="/news" className="ddi">
                Latest News
              </Link>
              <Link to="/news" className="ddi">
                QS Connect
              </Link>
            </NavDropdown>

            {/* Top level since the October 2026 review: NIQS wanted partnership
                visible from every page, not two clicks deep under About. */}
            <Link
              to="/partnership"
              className={`nl${location.pathname.startsWith("/partnership") ? " on" : ""}`}
            >
              Partnership
            </Link>
            <Link
              to="/jobs"
              className={`nl${location.pathname === "/jobs" ? " on" : ""}`}
            >
              Jobs
            </Link>
            {isAdminUser && (
              <Link
                to="/request-flyer"
                className={`nl${location.pathname === "/request-flyer" ? " on" : ""}`}
              >
                Request a Flyer
              </Link>
            )}
            <Link
              to="/contact"
              className={`nl${location.pathname === "/contact" ? " on" : ""}`}
            >
              Contact
            </Link>
          </div>

          {/* CTA — swaps to user chip when logged in. Two pills rather than the
              single "Member Portal" link, per the mockups (2026-08-12): signing in
              and joining are different errands and the old link only named one of
              them. Both still land where "Member Portal" did — /login is the
              portal entrance. */}
          {isLoggedIn ? (
            <UserChip />
          ) : (
            <div className="ncta-pair">
              <Link to="/login" className="ncta-in">
                Log In
              </Link>
              <Link to="/membership" className="ncta">
                Become a Member
              </Link>
            </div>
          )}

          {/* Hamburger */}
          <button
            className={`ham${menuOpen ? " op" : ""}`}
            onClick={toggleMenu}
            aria-label="Toggle navigation"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div className={`mmenu${menuOpen ? " op" : ""}`}>
        <Link to="/" className="ml" onClick={closeMenu}>
          Home
        </Link>

        <div className="ml-hd">About Us</div>
        <Link to="/about" className="ml-sub" onClick={closeMenu}>
          About NIQS
        </Link>
        <Link to="/president" className="ml-sub" onClick={closeMenu}>
          The President
        </Link>
        <Link to="/council" className="ml-sub" onClick={closeMenu}>
          National Executive Council
        </Link>
        <Link to="/national-bodies" className="ml-sub" onClick={closeMenu}>
          National Body Chairmen
        </Link>
        <Link to="/board-of-trustees" className="ml-sub" onClick={closeMenu}>
          Board of Trustees
        </Link>
        <Link to="/past-presidents" className="ml-sub" onClick={closeMenu}>
          Past Presidents
        </Link>
        <Link to="/chapters" className="ml-sub" onClick={closeMenu}>
          State Chapters
        </Link>
        <Link to="/waqsn" className="ml-sub" onClick={closeMenu}>
          WAQSN
        </Link>
        <Link to="/yqsf" className="ml-sub" onClick={closeMenu}>
          YQSF
        </Link>
        <Link to="/reciprocity" className="ml-sub" onClick={closeMenu}>
          Reciprocity Agreements
        </Link>

        <div className="ml-hd">Membership</div>
        <Link to="/membership" className="ml-sub" onClick={closeMenu}>
          Requirements &amp; Registration
        </Link>
        {isLoggedIn ? (
          <>
            <button
              className="ml-sub"
              style={{
                background: "none",
                border: "none",
                textAlign: "left",
                width: "100%",
                cursor: "pointer",
                padding: 0,
              }}
              onClick={() => {
                closeMenu();
                navigate(admin ? "/admin" : "/portal");
              }}
            >
              {admin
                ? <><Icon name="shield" size="sm" /> Admin Panel</>
                : <><Icon name="user" size="sm" /> My Portal</>}
            </button>
            <button
              className="ml-sub"
              style={{
                background: "none",
                border: "none",
                textAlign: "left",
                width: "100%",
                cursor: "pointer",
                padding: 0,
                color: "#dc2626",
              }}
              onClick={async () => {
                closeMenu();
                await logout();
                navigate("/login");
              }}
            >
              <Icon name="logout" size="sm" /> Sign Out
            </button>
          </>
        ) : (
          <Link to="/login" className="ml-sub" onClick={closeMenu}>
            Member Portal <Icon name="lock" size="sm" />
          </Link>
        )}

        <div className="ml-hd">Exams</div>
        <Link to="/exams" className="ml-sub" onClick={closeMenu}>
          Examinations
        </Link>
        <Link to="/exams" className="ml-sub" onClick={closeMenu}>
          Published Results
        </Link>
        <Link to="/login" className="ml-sub" onClick={closeMenu}>
          My Results <Icon name="lock" size="sm" />
        </Link>

        <div className="ml-hd">Research &amp; Devt</div>
        <Link to="/library" className="ml-sub" onClick={closeMenu}>
          Digital Library
        </Link>
        <Link to="/research" className="ml-sub" onClick={closeMenu}>
          Publications &amp; Journal
        </Link>

        <Link to="/news" className="ml" onClick={closeMenu}>
          News
        </Link>
        <Link to="/partnership" className="ml" onClick={closeMenu}>
          Partnership
        </Link>
        <Link to="/jobs" className="ml" onClick={closeMenu}>
          Jobs
        </Link>
        {isAdminUser && (
          <Link to="/request-flyer" className="ml" onClick={closeMenu}>
            Request a Flyer
          </Link>
        )}
        <Link to="/contact" className="ml" onClick={closeMenu}>
          Contact
        </Link>
      </div>
    </>
  );
};

export default Navbar;
