/**
 * Route module registry — the single place that knows how to load a page.
 *
 * Every page is a dynamic import, so Rollup emits one chunk per page instead of
 * bundling all 60 into the entry chunk. The same loader is reused for two jobs:
 *
 *   Pages.About        — the lazy component App.jsx renders
 *   loaderFor(path)    — the prefetch hook calls this on link hover
 *
 * Keeping both off one map means a page can never be lazy-rendered from one path
 * and prefetched from another, which would silently emit two chunks.
 *
 * Home is deliberately NOT here — see the static import in App.jsx.
 */
import { lazy } from 'react';

/* ── Public ── */
const load = {
  About:            () => import('../pages/public/About'),
  President:        () => import('../pages/public/President'),
  Council:          () => import('../pages/public/Council'),
  NPC:              () => import('../pages/public/NPC'),
  NationalBodies:   () => import('../pages/public/NationalBodies'),
  Trustees:         () => import('../pages/public/Trustees'),
  PastPresidents:   () => import('../pages/public/PastPresidents'),
  Chapters:         () => import('../pages/public/Chapters'),
  ChapterDetail:    () => import('../pages/public/ChapterDetail'),
  WAQSN:            () => import('../pages/public/WAQSN'),
  YQSF:             () => import('../pages/public/YQSF'),
  Reciprocity:      () => import('../pages/public/Reciprocity'),
  BrandMaterials:   () => import('../pages/public/BrandMaterials'),
  Membership:       () => import('../pages/public/Membership'),
  SearchQSFirms:    () => import('../pages/public/SearchQSFirms'),
  WorkshopMaterials:() => import('../pages/public/WorkshopMaterials'),
  Exams:            () => import('../pages/public/Exams'),
  Research:         () => import('../pages/public/Research'),
  Library:          () => import('../pages/public/Library'),
  LibraryItem:      () => import('../pages/public/LibraryItem'),
  News:             () => import('../pages/public/News'),
  NewsArticle:      () => import('../pages/public/NewsArticle'),
  Events:           () => import('../pages/public/Events'),
  EventRegister:    () => import('../pages/public/EventRegister'),
  EventAttend:      () => import('../pages/public/EventAttend'),
  Jobs:             () => import('../pages/public/Jobs'),
  JobDetail:        () => import('../pages/public/JobDetail'),
  Employers:        () => import('../pages/public/Employers'),
  Payment:          () => import('../pages/public/Payment'),
  Contact:          () => import('../pages/public/Contact'),
  Partnership:      () => import('../pages/public/Partnership'),
  PartnerDetail:    () => import('../pages/public/PartnerDetail'),
  FlyerRequest:     () => import('../pages/public/FlyerRequest'),
  RequestFlyer:     () => import('../pages/public/RequestFlyer'),
  PrivacyPolicy:    () => import('../pages/public/PrivacyPolicy'),
  TermsOfUse:       () => import('../pages/public/TermsOfUse'),

  /* ── Auth ── */
  Login:            () => import('../pages/auth/Login'),
  ForgotPassword:   () => import('../pages/auth/ForgotPassword'),
  ResetPassword:    () => import('../pages/auth/ResetPassword'),
  EmployerSignIn:   () => import('../pages/auth/EmployerSignIn'),
  EmployerRegister: () => import('../pages/auth/EmployerRegister'),

  /* ── Member portal ── */
  PortalLayout:     () => import('../pages/portal/PortalLayout'),
  PortalDashboard:  () => import('../pages/portal/PortalDashboard'),
  PortalProfile:    () => import('../pages/portal/PortalProfile'),
  PortalLibrary:    () => import('../pages/portal/PortalLibrary'),
  PortalJobs:       () => import('../pages/portal/PortalJobs'),
  PortalJobAlerts:  () => import('../pages/portal/PortalJobAlerts'),
  PortalCareerProfile: () => import('../pages/portal/PortalCareerProfile'),

  /* ── Employer area (job board) ── */
  EmployerLayout:      () => import('../pages/employer/EmployerLayout'),
  EmployerDashboard:   () => import('../pages/employer/EmployerDashboard'),
  EmployerListings:    () => import('../pages/employer/EmployerListings'),
  EmployerListingForm: () => import('../pages/employer/EmployerListingForm'),
  EmployerApplicants:  () => import('../pages/employer/EmployerApplicants'),
  EmployerTalent:      () => import('../pages/employer/EmployerTalent'),
  EmployerProfile:     () => import('../pages/employer/EmployerProfile'),

  /* ── Admin ──
     The heaviest group by far. FlyerStudio alone pulls jspdf, html2canvas and
     jszip — ~184 KB brotli that every public visitor used to download to read a
     news article. It now loads only when an authenticated admin opens it. */
  AdminLayout:            () => import('../pages/admin/AdminLayout'),
  AdminDashboard:         () => import('../pages/admin/Dashboard'),
  ManageAdmins:           () => import('../pages/admin/ManageAdmins'),
  ManageNews:             () => import('../pages/admin/ManageNews'),
  ManageEvents:           () => import('../pages/admin/ManageEvents'),
  EventCalendar:          () => import('../pages/admin/EventCalendar'),
  FlyerStudio:            () => import('../pages/admin/FlyerStudio'),
  FlyerRequests:          () => import('../pages/admin/FlyerRequests'),
  ManageRegistrations:    () => import('../pages/admin/ManageRegistrations'),
  ManageExco:             () => import('../pages/admin/ManageExco'),
  ManageChapters:         () => import('../pages/admin/ManageChapters'),
  ManageJobs:             () => import('../pages/admin/ManageJobs'),
  ChapterJobs:            () => import('../pages/admin/ChapterJobs'),
  ManagePartners:         () => import('../pages/admin/ManagePartners'),
  ManageMembers:          () => import('../pages/admin/ManageMembers'),
  ManageBrandMaterials:   () => import('../pages/admin/ManageBrandMaterials'),
  ManagePresident:        () => import('../pages/admin/ManagePresident'),
  ManagePastPresidents:   () => import('../pages/admin/ManagePastPresidents'),
  ManageSiteSettings:     () => import('../pages/admin/ManageSiteSettings'),
  ManagePartnerAdvert:    () => import('../pages/admin/ManagePartnerAdvert'),
  ManageContactInfo:      () => import('../pages/admin/ManageContactInfo'),
  ManageQSFirms:          () => import('../pages/admin/ManageQSFirms'),
  ManageExamResults:      () => import('../pages/admin/ManageExamResults'),
  ManageQSConnect:        () => import('../pages/admin/ManageQSConnect'),
  ManageWebinars:         () => import('../pages/admin/ManageWebinars'),
  ManageWorkshopMaterials:() => import('../pages/admin/ManageWorkshopMaterials'),
  ManageJournal:          () => import('../pages/admin/ManageJournal'),
  ManageLibrary:          () => import('../pages/admin/ManageLibrary'),
  ManageMessages:         () => import('../pages/admin/ManageMessages'),
  ManageProfile:          () => import('../pages/admin/ManageProfile'),
};

/** Lazy components, one per entry above. lazy() does not run the import. */
export const Pages = Object.fromEntries(
  Object.entries(load).map(([name, loader]) => [name, lazy(loader)])
);

/**
 * Prefetch targets. Public and auth routes only — prefetching admin chunks for
 * anonymous visitors would download the flyer toolchain we just removed.
 */
const byPath = {
  '/about': load.About,
  '/president': load.President,
  '/council': load.Council,
  '/npc': load.NPC,
  '/national-bodies': load.NationalBodies,
  '/board-of-trustees': load.Trustees,
  '/past-presidents': load.PastPresidents,
  '/chapters': load.Chapters,
  '/waqsn': load.WAQSN,
  '/yqsf': load.YQSF,
  '/reciprocity': load.Reciprocity,
  '/brand-materials': load.BrandMaterials,
  '/membership': load.Membership,
  '/search-qs-firms': load.SearchQSFirms,
  '/workshop-materials': load.WorkshopMaterials,
  '/exams': load.Exams,
  '/research': load.Research,
  '/library': load.Library,
  '/news': load.News,
  '/events': load.Events,
  '/jobs': load.Jobs,
  '/employers': load.Employers,
  '/employers/sign-in': load.EmployerSignIn,
  '/employers/register': load.EmployerRegister,
  '/payment': load.Payment,
  '/contact': load.Contact,
  '/partnership': load.Partnership,
  '/request-flyer': load.RequestFlyer,
  '/flyer-request': load.FlyerRequest,
  '/privacy-policy': load.PrivacyPolicy,
  '/terms-of-use': load.TermsOfUse,
  '/login': load.Login,
  '/forgot-password': load.ForgotPassword,
};

/**
 * Dynamic routes. Checked only after an exact match fails, so `/chapters`
 * resolves to the index page while `/chapters/katsina` resolves to the detail
 * page. Order does not matter — the prefixes do not overlap.
 */
const byPrefix = [
  ['/news/', load.NewsArticle],
  ['/library/', load.LibraryItem],
  ['/chapters/', load.ChapterDetail],
  ['/partnership/', load.PartnerDetail],
  ['/flyer-request/', load.FlyerRequest],
  ['/reset-password/', load.ResetPassword],
];

/** Returns the loader for a pathname, or undefined if nothing matches. */
export function loaderFor(pathname) {
  const clean = pathname.replace(/[?#].*$/, '').replace(/\/+$/, '') || '/';
  if (byPath[clean]) return byPath[clean];
  return byPrefix.find(([prefix]) => clean.startsWith(prefix))?.[1];
}
