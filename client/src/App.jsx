import { Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import LaunchGate from './components/common/LaunchGate';
import CookieNotice from './components/common/CookieNotice';
import { useEffect, Suspense } from 'react';

/* ── Global scroll-reveal observer ── */
function useScrollReveal() {
  useEffect(() => {
    // The stylesheet only hides .reveal content beneath .js-reveal. Adding the
    // class here — after confirming the API exists, and never before the observer
    // is built — means a browser without IntersectionObserver, or a run where
    // this effect never executes, simply shows the content instead of hiding it
    // forever with nothing to reveal it.
    if (typeof IntersectionObserver === 'undefined') return;
    document.documentElement.classList.add('js-reveal');

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    // Observe existing + future elements
    const observe = () => {
      document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
    };

    observe();
    // Re-run on route changes via MutationObserver
    const mo = new MutationObserver(observe);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mo.disconnect();
      // Nothing is left to add .visible, so stop hiding.
      document.documentElement.classList.remove('js-reveal');
    };
  }, []);
}

/* ── Page fade wrapper ── */
function PageFade({ children }) {
  const { pathname } = useLocation();
  return (
    <div key={pathname} className="page-transition">
      {children}
    </div>
  );
}

// Layout — on every page, so these stay in the entry chunk.
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import PartnerAdvert from './components/layout/PartnerAdvert';

// Common
import ProtectedRoute from './components/common/ProtectedRoute';

// Prefetches a route's chunk when a link is hovered or focused.
import useRoutePrefetch from './hooks/useRoutePrefetch';

// Counts a pageview on each navigation — a single-page app produces no page
// loads for an analytics provider to notice on its own.
import useAnalytics from './hooks/useAnalytics';

// Per-route <title> and rel="canonical". index.html is served for every route,
// so neither can be written there without claiming it of all of them.
import useCanonical from './hooks/useCanonical';

/**
 * Home is the one page imported eagerly. It is the most common entry point, and
 * lazy-loading it would cost an extra round trip on the very first paint: entry
 * chunk arrives, React renders, *then* the Home chunk is requested. It is small
 * enough that carrying it in the entry chunk is the better trade.
 *
 * Every other page comes from the registry in routes/pages.js as its own chunk.
 */
import Home from './pages/public/Home';
import { Pages } from './routes/pages';

/**
 * Shown while a route chunk is in flight. The min-height matters: without it the
 * footer jumps up to fill the empty space and then back down, which reads as a
 * layout bug. Intentionally blank rather than a spinner — hovering prefetches the
 * chunk, so on most navigations this never renders at all, and a spinner that
 * flashes for 40ms looks worse than nothing.
 */
function RouteFallback() {
  return <div style={{ minHeight: '60vh' }} aria-busy="true" />;
}

// Public layout wrapper
function PublicLayout({ children }) {
  return (
    <>
      <Navbar />
      <main>
        <PageFade>
          {/* Inside the layout, not around <Routes>. A boundary further up would
              unmount the navbar and footer while a chunk loads, flashing the
              whole shell. Here only the page content swaps. */}
          <Suspense fallback={<RouteFallback />}>{children}</Suspense>
        </PageFade>
      </main>
      <Footer />
      <PartnerAdvert />
    </>
  );
}

// Wrap each public page route
function PublicPage({ element }) {
  return <PublicLayout>{element}</PublicLayout>;
}

/* The fixed "Built by ADLM" pill that used to sit here — bottom-left, on every
   page — was removed on 10 August 2026.

   The MoU grants ADLM one attribution and is specific about it: clause 10.1,
   Annexe E11 and the Milestone 2 go-live checklist each name a **footer**
   credit reading "Powered by ADLM Studio", styled to NIQS brand standards. A
   second badge floating above every page was not part of that, and it floated
   above every page — including the President's, the Board of Trustees, and
   condolence notices, where a vendor's name hovering over a memorial is the
   failure case nobody wants to defend at a Council meeting.

   The credit now lives once, in Footer.jsx, in the words the MoU names. */

export default function App() {
  useScrollReveal();
  useRoutePrefetch();
  useCanonical();
  // After useCanonical, so the pageview it sends carries the page's own title
  // rather than the previous route's.
  useAnalytics();
  return (
    <AuthProvider>
      {/* Holding page until launch. Sits above everything, lets the admin panel
          and sign-in through, and retires itself on the date — see LaunchGate.
          Delete this line to take the cover down early. */}
      <LaunchGate />
      {/* Renders nothing at all unless the active analytics provider sets
          cookies — see CookieNotice. Below LaunchGate in z-order on purpose:
          asking about cookies over the top of a countdown is noise. */}
      <CookieNotice />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            fontFamily: "'Sora', sans-serif",
            fontSize: '0.85rem',
          },
        }}
      />

      {/* Outer boundary for routes that render outside PublicLayout — the auth
          pages, and the portal and admin shells themselves. */}
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* ══════ PUBLIC ROUTES ══════ */}
          <Route path="/" element={<PublicPage element={<Home />} />} />
          <Route path="/about" element={<PublicPage element={<Pages.About />} />} />
          <Route path="/president" element={<PublicPage element={<Pages.President />} />} />
          <Route path="/council" element={<PublicPage element={<Pages.Council />} />} />
          <Route path="/npc" element={<PublicPage element={<Pages.NPC />} />} />
          <Route path="/national-bodies" element={<PublicPage element={<Pages.NationalBodies />} />} />
          <Route path="/board-of-trustees" element={<PublicPage element={<Pages.Trustees />} />} />
          <Route path="/past-presidents" element={<PublicPage element={<Pages.PastPresidents />} />} />
          <Route path="/chapters" element={<PublicPage element={<Pages.Chapters />} />} />
          <Route path="/chapters/:slug" element={<PublicPage element={<Pages.ChapterDetail />} />} />
          <Route path="/waqsn" element={<PublicPage element={<Pages.WAQSN />} />} />
          <Route path="/yqsf" element={<PublicPage element={<Pages.YQSF />} />} />
          <Route path="/reciprocity" element={<PublicPage element={<Pages.Reciprocity />} />} />
          <Route path="/brand-materials" element={<PublicPage element={<Pages.BrandMaterials />} />} />
          <Route path="/membership" element={<PublicPage element={<Pages.Membership />} />} />
          <Route path="/search-qs-firms"    element={<PublicPage element={<Pages.SearchQSFirms />} />} />
          <Route path="/webinars"           element={<PublicPage element={<Pages.Webinars />} />} />
          <Route path="/workshop-materials" element={<PublicPage element={<Pages.WorkshopMaterials />} />} />
          <Route path="/exams" element={<PublicPage element={<Pages.Exams />} />} />
          <Route path="/research" element={<PublicPage element={<Pages.Research />} />} />
          <Route path="/library" element={<PublicPage element={<Pages.Library />} />} />
          <Route path="/library/:slug" element={<PublicPage element={<Pages.LibraryItem />} />} />
          <Route path="/news" element={<PublicPage element={<Pages.News />} />} />
          <Route path="/news/:slug" element={<PublicPage element={<Pages.NewsArticle />} />} />
          <Route path="/events" element={<PublicPage element={<Pages.Events />} />} />
          <Route path="/events/:id/register" element={<PublicPage element={<Pages.EventRegister />} />} />
          <Route path="/events/attend/:token" element={<PublicPage element={<Pages.EventAttend />} />} />
          <Route path="/request-flyer" element={<PublicPage element={<Pages.RequestFlyer />} />} />
          <Route path="/flyer-request" element={<PublicPage element={<Pages.FlyerRequest />} />} />
          <Route path="/flyer-request/:token" element={<PublicPage element={<Pages.FlyerRequest />} />} />
          <Route path="/jobs" element={<PublicPage element={<Pages.Jobs />} />} />
          <Route path="/payment" element={<PublicPage element={<Pages.Payment />} />} />
          <Route path="/contact" element={<PublicPage element={<Pages.Contact />} />} />
          <Route path="/partnership" element={<PublicPage element={<Pages.Partnership />} />} />
          <Route path="/partnership/:id" element={<PublicPage element={<Pages.PartnerDetail />} />} />
          <Route path="/privacy-policy" element={<PublicPage element={<Pages.PrivacyPolicy />} />} />
          <Route path="/terms-of-use" element={<PublicPage element={<Pages.TermsOfUse />} />} />

          {/* ══════ AUTH ROUTES ══════ */}
          <Route path="/login" element={<Pages.Login />} />
          <Route path="/forgot-password" element={<Pages.ForgotPassword />} />
          <Route path="/reset-password/:token" element={<Pages.ResetPassword />} />

          {/* ══════ MEMBER PORTAL ══════ */}
          <Route
            path="/portal"
            element={
              <ProtectedRoute>
                <Pages.PortalLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Pages.PortalDashboard />} />
            <Route path="profile" element={<Pages.PortalProfile />} />
            <Route path="library" element={<Pages.PortalLibrary />} />
          </Route>

          {/* ══════ ADMIN PANEL ══════ */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <Pages.AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Pages.AdminDashboard />} />
            <Route path="news" element={<Pages.ManageNews />} />
            <Route path="events" element={<Pages.ManageEvents />} />
            <Route path="calendar" element={<Pages.EventCalendar />} />
            <Route path="flyer-studio" element={<Pages.FlyerStudio />} />
            <Route path="flyer-requests" element={<Pages.FlyerRequests />} />
            <Route path="registrations" element={<Pages.ManageRegistrations />} />
            <Route path="exco" element={<Pages.ManageExco />} />
            <Route path="chapters" element={<Pages.ManageChapters />} />
            <Route path="jobs" element={<Pages.ManageJobs />} />
            <Route path="partners" element={<Pages.ManagePartners />} />
            <Route path="members" element={<Pages.ManageMembers />} />
            <Route path="admins" element={<Pages.ManageAdmins />} />
            <Route path="brand-materials" element={<Pages.ManageBrandMaterials />} />
            <Route path="president" element={<Pages.ManagePresident />} />
            <Route path="past-presidents" element={<Pages.ManagePastPresidents />} />
            <Route path="site-settings"  element={<Pages.ManageSiteSettings />} />
            <Route
              path="partner-advert"
              element={
                <ProtectedRoute adminRoles={['main_admin']}>
                  <Pages.ManagePartnerAdvert />
                </ProtectedRoute>
              }
            />
            <Route path="contact-info"   element={<Pages.ManageContactInfo  />} />
            <Route path="qs-firms"        element={<Pages.ManageQSFirms />} />
            <Route path="exam-results"        element={<Pages.ManageExamResults />} />
            <Route path="qs-connect"          element={<Pages.ManageQSConnect />} />
            <Route path="webinars"            element={<Pages.ManageWebinars />} />
            <Route path="workshop-materials"  element={<Pages.ManageWorkshopMaterials />} />
            <Route path="journal"             element={<Pages.ManageJournal />} />
            <Route path="library"             element={<Pages.ManageLibrary />} />
            <Route path="messages"            element={<Pages.ManageMessages />} />
            <Route path="profile"             element={<Pages.ManageProfile />} />
          </Route>

          {/* ══════ 404 ══════ */}
          <Route
            path="*"
            element={
              <PublicLayout>
                <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', padding: '4rem 2rem', textAlign: 'center' }}>
                  <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '4rem', fontWeight: 800, color: 'var(--navy)', letterSpacing: '-.04em' }}>404</h1>
                  <p style={{ color: 'var(--text2)', fontSize: '1rem' }}>Page not found</p>
                  <a href="/" className="btn bp" style={{ marginTop: '1rem' }}>Back to Home</a>
                </div>
              </PublicLayout>
            }
          />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}
