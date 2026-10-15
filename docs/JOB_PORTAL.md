# NIQS Job Portal

Built from the *NIQS Job Portal: Feature Proposal* (ADLM Studio, 8 October 2026).
All three phases are in the code; what is switched on is a Secretariat decision,
made in **Admin → Job Board → Settings** rather than in code.

## Who uses it

| Who | Where | What they do |
|---|---|---|
| Visitors | `/jobs`, `/jobs/:id`, `/employers` | Browse and filter listings; employers read prices and register |
| Members | `/portal/jobs`, `/portal/job-alerts`, `/portal/career-profile` | Apply, track applications, saved jobs, alerts, profile and CV |
| Employers | `/employers/sign-in`, `/employers/register`, `/employer/*` | Post listings, applicant inbox, featured requests, talent search |
| Secretariat (main + national admins) | `/admin/jobs` | Approve employers and listings, featured payments, packages, reports, settings |
| Chapters (state admins) | `/admin/chapter-jobs` | See and share live listings in their own state |

## Rules the code enforces

- **Two approvals.** An employer account starts `pending`. It can draft, but cannot
  submit a listing until approved. Every listing then waits in the moderation
  queue (`pending`) until approved. Editing a live listing sends it back to the queue.
- **Suspending or rejecting an employer pauses all their live and pending listings.**
  The employer cannot resume a pause the Secretariat made.
- **Professional standards.** A listing marked "requires a qualified QS" must name a
  minimum grade. Grade ladder: student < probationer < graduate < corporate (MNIQS)
  < fellow (FNIQS). Technicians meet only "Open to all".
- **Verified means the register.** An application stores a snapshot of the membership
  check. `verified: true` only when the membership portal API (`PORTAL_API_URL`,
  `PORTAL_API_KEY`) confirms the member *and* its email matches the website account.
  Until that API is connected, the website's own record is shown as
  "Recorded grade … not yet checked against the NIQS register", never as verified.
- **CVs are private.** Stored in MongoDB (`JobFile`), 2 MB, PDF or Word (checked by
  file signature), streamed only to the owner, an employer the member applied to,
  an approved employer viewing a profile the member made visible, or an admin.
  Never on the public CDN.
- **Talent search shows no contact details.** Employers invite; the member decides.
- **Retention.** When a listing closes or fills, its applications and CVs are purged
  after `retentionDays` (default 180). A CV still on the member's profile is kept.
- **Housekeeping** runs at start-up and every 6 hours on each API task: closes
  listings past their deadline, ends featured placements, purges expired applicant
  data. Turn off with `JOB_BOARD_HOUSEKEEPING=off`.

## Settings (the proposal's "Decisions needed")

| Decision | Setting | Default |
|---|---|---|
| Who approves, target time | `moderatorEmails`, `approvalTargetHours` | none, 48 h |
| Free, paid, or free with paid featured | `standardListingFee`, `featuredFee`, `featuredDays`, `paymentInstructions`, `packages` | all free, 30 days |
| Can non-members apply | `nonMembersCanApply` (off = every listing members-only); per listing `membersOnly` | on |
| Require a register check to apply | `requireRegisterCheck` | off |
| Applicant data retention | `retentionDays` (30–730) | 180 |
| Talent search | `talentSearchEnabled` | on |

There is no card payment gateway. A fee is paid offline (the instructions are shown
to the employer) and the Secretariat records the amount and reference; reports count
income in the month it was recorded.

## API

Base `/api`. Auth is the existing bearer token / `token` cookie. Employer tokens carry
`kind: 'employer'` and resolve to `req.employer`. `/auth/me` returns `{ employer, type: 'employer' }`.

### Public
- `GET /jobs?q&state&sector&type&track&minGrade&eligible&salaryMin&salaryMax&employer&featured=1&page&limit&allTracks=1` →
  `{ jobs, total, page, pages }`. Track defaults to `job`; featured sorts first. `minGrade` is an exact match; `eligible=<grade>` means "roles this grade can apply for".
  Each job: `_id title company location state type track sector sectorLabel minGrade minGradeLabel requiresQS membersOnly description requirements salary salaryMin salaryMax logo deadline applyMethod applicationLink publishedAt status featured employer{ _id companyName website logo sector state about registeredFirm qsFirm{_id,name} isPartner } saved`
- `GET /jobs/meta` → `{ states, sectors[{value,label}], grades[{value,label}], types, tracks, countsByState, countsByTrack, nonMembersCanApply }`
- `GET /jobs/:id` → one job; members also get `myApplication {status, createdAt} | null`; closed/filled listings stay readable
- `GET /employers/info` → `{ standardListingFee, featuredFee, featuredDays, approvalTargetHours, packages, nonMembersCanApply }`

### Employer accounts
- `POST /employers/register { companyName, contactName, contactRole, email, password(≥8), phone, website, logo, address, state, sector, rcNumber, about, acceptTerms:true }` → `{ token, employer }`
- `POST /employers/login { email, password }` → `{ token, employer }` (rejected accounts get 403 with the reason)
- `GET|PUT /employers/me`, `PUT /employers/me/password { currentPassword, newPassword }`
- `GET /employers/me/summary` → `{ status, statusNote, listings{status:n}, applications, unread, package|null, pricing{…} }`
- `POST /employers/forgot-password { email }`, `PUT /employers/reset-password/:token { password }` (link: `/reset-password/:token?type=employer`)

### Employer listings
- `GET /jobs/mine` → `{ jobs }` (full documents, including `status moderationNote featured views applicationCount`)
- `POST /jobs/mine { …listing, submit }` → 201 `{ job }`; 202 when saved as draft because the account is unapproved
- `PUT /jobs/mine/:id { …listing, submit }` → `{ job, requeued }`
- `POST /jobs/mine/:id/status { action: submit|pause|resume|close|fill, filledThroughNiqs }`
- `POST /jobs/mine/:id/feature` → `{ job, viaPackage, confirmed, fee, paymentInstructions }`
- `DELETE /jobs/mine/:id` (drafts / rejected without applications)
- Listing fields: `title company location state type track sector minGrade requiresQS membersOnly description requirements salary salaryMin salaryMax logo deadline applyMethod(portal|external) applicationLink`

### Applicant inbox and talent (employers)
- `GET /careers/inbox?job&status&verified=1` → `{ applications }`; `GET /careers/inbox/:id` marks viewed
- `PUT /careers/inbox/:id { status, note, employerNote }` — status ∈ viewed shortlisted interview offered hired not_selected
- Application: `_id job{_id,title,location,status} fullName email phone coverNote cv{_id,filename,size} verification{verified source membershipNumber grade gradeLabel goodStanding checkedAt} status history[{status,at,by,note}] employerNote viewedAt createdAt profile|null`
- `GET /careers/talent?q&state&sector&minGrade&placement=1` (approved employers) → `{ profiles }` without contact details
- `POST /careers/talent/:profileId/invite { job, message }`
- `GET /careers/files/:id` streams a CV (see the access rule above)

### Members
- `POST /jobs/:id/apply { coverNote, cv, phone, shareProfile }` — 403 codes: `members_only`, `register_check`, `grade`; 409 if already applied
- `GET /careers/verification` → `{ verification }`, `GET /careers/cv` → `{ files }`, `POST /careers/cv` (multipart `file`) → the file, `DELETE /careers/cv/:id`
- `GET /careers/applications`, `POST /careers/applications/:id/withdraw`
- `GET /careers/applications` → `{ applications }`; `GET /careers/saved` → `{ jobs }`, `POST|DELETE /careers/saved/:jobId`
- `GET|POST /careers/alerts`, `PUT|DELETE /careers/alerts/:id` — `{ name states sectors types tracks keywords matchMyGrade active }`, up to 10
- `GET|PUT /careers/profile` → `{ profile }` — `{ headline summary state yearsExperience sectors skills qualifications cv visibleToEmployers openToWork seekingPlacement institution }`

### Secretariat (main + national admins; settings: main admin only)
- `GET /jobs/admin/all?status&q&employer&featuredRequested=1`
- `POST /jobs` (posts live; `status:'draft'` to hold), `PUT /jobs/:id`, `DELETE /jobs/:id` (main admin; deletes its applicant data too)
- `POST /jobs/:id/moderate { action: approve|reject|pause|restore|remove, note }` (reject and remove need a note)
- `POST /jobs/:id/featured { active, days, amount, reference, inNewsletter }` (omit `active` to change only the newsletter flag), `POST /jobs/:id/listing-fee { amount, reference }`
- `GET /job-admin/employers?status&q&flagged=1`, `POST /job-admin/employers/:id/status { status, note }`,
  `POST /job-admin/employers/:id/flag { flagged, note }`, `PUT /job-admin/employers/:id { qsFirm, isPartner, partner, package{ name listingsQuota featuredQuota months amountPaid reference renew } }` (same name without `renew` keeps the term)
- `GET /job-admin/reports?from=YYYY-MM&to=YYYY-MM&state` → `{ from, to, months[], states[], totals, now{ live, pendingListings, pendingEmployers, approvedEmployers } }`; `GET /job-admin/reports.csv`
- `GET|PUT /job-admin/settings`
- `GET /careers/admin/applications?job`
- `GET /jobs/chapter?state` (any admin; state admins always get their own chapter's state)

## Emails

All through `utils/email.js` (no-ops when SMTP is unset): new employer and new
listing to `moderatorEmails`; account and listing decisions to the employer; new
application to the employer; status changes to the applicant; job alerts; talent
invitations; employer password reset.

## Testing locally

Never point a test run at the production Atlas URI. Start a throwaway `mongod`
and run the API with `MONGO_URI=mongodb://127.0.0.1:<port>/niqs_jobs_test`.
