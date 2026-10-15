/* Membership categories, eligibility and requirements, word for word from the
   Secretariat's "Membership Eligibility & Requirement" document (Oct 2026),
   current fees included. It replaced the old website's text, which still asked
   for hard copies and flash drives from before applications moved online.
   Replace it here when the membership officer revises it; do not paraphrase.

   Block kinds: p (paragraph), pb (bold paragraph), h (sub-heading),
   ol / ul (lists; an item may be { text, sub: [...] }). */
const MEMBERSHIP_REQUIREMENTS = [
  {
    tab: 'Student',
    title: 'Student',
    blocks: [
      { h: 'Eligibility' },
      { p: "Student must have earned at least five credit passes including English Language, Mathematics, Physics, and two other relevant subjects in either the WAEC (SSCE/GCE O'Level) or NECO examinations. Additionally, such person must be undergoing a course of study or training in Quantity Surveying in an approved Institutions by the Quantity Surveyors Registration Board of Nigeria (QSRBN)" },
      { h: 'Requirements' },
      { ul: [
        'Official letter of admission into the higher institution.',
        "The online application must be endorsed by the applicant's Head of Department.",
        'A non-refundable application fee of ₦3,000',
      ] },
    ],
  },
  {
    tab: 'Technician',
    title: 'Technician',
    blocks: [
      { h: 'Eligibility' },
      { p: 'A Graduate holding a degree in any built environment discipline from a recognized institution, provided he/she is actively and exclusively performing quantity surveying duties under the direct supervision of a Registered Quantity Surveyor.' },
      { h: 'Requirements' },
      { ul: [
        'A B.Sc. or HND in an allied discipline within the built environment (e.g., Building, Civil Engineering).',
        'At least five O’level credit passes, including mandatory credits in English Language, Mathematics, and Physics, plus any two subjects from Chemistry, Further Mathematics, Economics, Geography, Technical Drawing, or Biology.',
        'The online application must be endorsed by two referees, both of whom must be financially up-to-date members of the Institute.',
        'The online application must also be endorsed by the Chapter',
        'A non-refundable application fee of ₦10,000.',
      ] },
    ],
  },
  {
    tab: 'Probationer',
    title: 'Probationer',
    blocks: [
      { h: 'Eligibility' },
      { p: 'A Candidate who hold either a degree (B.Sc/B.Tech) or Higher National Diploma (HND) in Quantity Surveying from recognized institutions and is actively engaged exclusively in quantity surveying duties under the direct supervision of a Registered Quantity Surveyor.' },
      { h: 'Requirements' },
      { ul: [
        'B.Sc/B.Tech or HND in Quantity Surveying',
        'At least five O’level credit passes, including mandatory credits in English Language, Mathematics, and Physics, plus any two subjects from Chemistry, Further Mathematics, Economics, Geography, Technical Drawing, or Biology.',
        'The online application must be endorsed by two referees, both of whom must be financially up-to-date members of the Institute, and also be endorsed by the Chapter',
        'A non-refundable application fee of ₦10,000.',
      ] },
    ],
  },
  {
    tab: 'Member',
    title: 'Member',
    blocks: [
      { h: 'Eligibility' },
      { ul: [
        'Candidate who have successfully passed the Institute’s written Test of Professional Competence (TPC), Diary and Logbook Assessment (logbook stages 1-3)*, and Professional Competence Interview (PCI).',
        'Candidate holding recognized equivalent foreign qualifications, subject to passing an interview conducted by the National Executive Council.',
        'Accomplished professionals, who possess exceptional career achievements and distinctions of significant value to the Institute, provided they are at least 40 years of age and successfully pass the Mature Route Interview conducted by the Exams Board of the Institute National Executive Council.',
      ] },
      { h: 'Requirements' },
      { ul: [
        'A pass result in either the Professional Competence Interview (PCI) or the Matured Route Interview (MRI).',
        '60/100 Continuous Professional Development (CPD Units) for Professional Competence Interview and Matured Route applicants respectively.',
        "Minimum of five O'Level credit passes, including mandatory credits in English Language, Mathematics, and Physics, alongside two other subjects selected from Chemistry, Further Mathematics, Economics, Commerce, Geography, Technical Drawing, or Biology.",
        'The application must be endorsed by the State Chapter and two referees who are financially up-to-date members of the Institute.',
        'An original degree certificate must be submitted (statements of result are strictly not accepted for upgrade processing)',
        'A non-refundable application fee of ₦35,000 for PCI and N135,000 for MRI',
      ] },
    ],
  },
  {
    tab: 'Fellow',
    title: 'Fellow',
    blocks: [
      { h: 'Eligibility' },
      { ul: [
        'Must have been a Corporate Member of the Institute for a minimum of 10 years.',
        'Candidate should be at least 40 years of age, with a minimum of 10 years in a position of executive or senior responsibility.',
        'Demonstrated active participation in Institute activities and programs at both National and Chapter levels.',
        'Presented or published at least two papers/articles on Quantity Surveying or the Built Environment through Institute-organized events or approved editorial channels.',
        'A consistent record of benevolence to the Institute through financial support, philanthropic contributions, or dedicated service.',
        'Unblemished ethical and financial standing, with no record of criminal conviction, bankruptcy, or disciplinary action by the Institute.',
        'Verified evidence of active professional practice within the construction and built environment industry.',
      ] },
      { h: 'Requirement' },
      { ul: [
        'Valid evidence of current and up-to-date financial standing with the Nigerian Institute of Quantity Surveyors (NIQS).',
        'Valid evidence of current and up-to-date financial standing with the Quantity Surveyors Registration Board of Nigeria (QSRBN).',
        'Accumulation of a minimum of 300 Continuous Professional Development (CPD) points.',
        'Online application must be endorsed by the State Chapter two financial members of the Institute.',
        'A non-refundable application fee of ₦100,000.',
      ] },
      { h: 'Documentation & Portfolio' },
      { ul: [
        'A digital passport photograph (460 x 300px) sent in PDF format.',
        'A one-page professional citation summarizing academic and professional qualifications, organizational leadership roles, major quantity surveying projects executed, board or national committee appointments, key professional achievements, and public relevance.',
      ] },
      { p: "Shortlisted applications are submitted to the Membership Committee Fellows' Forum for screening before final recommendations are submitted to the National Executive Council (NEC)." },
    ],
  },
  {
    tab: 'Honorary Fellow',
    title: 'Honorary Fellow',
    blocks: [
      { p: 'Prospective Honorary Fellow shall be non-Quantity Surveyor nominated by the National Policy Committee in recognition of their exceptional contributions toward advancing the aims and objectives of the Institute. Upon election, such individuals are authorized to use the designatory title “Hon. Fellow.”' },
    ],
  },
  {
    tab: 'Practice Firm',
    title: 'Practice Firm',
    blocks: [
      { pb: 'Requirements for Registration of Quantity Surveying Practice Firms:' },
      { ul: [
        'Certificate of Incorporation or Business Name Registration Certificate from the Corporate Affairs Commission (CAC), alongside Status Report of the company CAC Form 2 or Form 7.',
        'Principal Partner must hold NIQS and QSRBN Diploma Certificates.',
        'Principal Partner must possess a minimum of five years post-membership (MNIQS) experience.',
        'Detailed Curriculum Vitae (CV) of the Principal Partner and any additional partner(s).',
        'All partner/s must be in good financial standing with the Institute.',
        'Evidence of a minimum of 100 Continuous Professional Development (CPD) units for the partner/s.',
        'Online application must be endorsed by two financial members of the Institute.',
        'A non-refundable application fee of ₦100,000.',
      ] },
    ],
  },
  {
    tab: 'Corporate Affiliate',
    title: 'Corporate Affiliate',
    blocks: [
      { p: 'The NIQS has unveiled the registration of Corporate Affiliate membership, which is open to Construction Companies, Property Development Companies, Specialist Building Products Companies, Manufacturers, Suppliers, Banks, and Consulting Firms.' },
      { h: 'Requirements' },
      { ul: [
        "A minimum of three NIQS Corporate Members on the firm's payroll.",
        'Valid Tax Clearance Certificate covering the immediate past three (3) years.',
        'Comprehensive Company Profile containing the Certificate of Incorporation, Memorandum and Articles of Association, Particulars of Directors and Shareholders, alongside CVs and academic/professional credentials of key directors and staff.',
        'Verifiable evidence of benevolence or financial support to the Institute, or demonstrable Corporate Social Responsibility (CSR) contributions advancing the profession.',
        'Non-refundable Application Form Fee of ₦10,000.00.',
        'One-time Registration Fee of ₦250,000.00.',
        'Minimum Annual Sponsorship Commitment Fee of ₦1,000,000.00.',
      ] },
      { h: 'Benefits of Subscription' },
      { ul: [
        'Complimentary Conference Proceedings provided for the Managing Director / Chief Executive Officer.',
        'Opportunities to participate in Institute activities and actively promote Quantity Surveying and Total Cost Management (TCM).',
        'Formal recognition and visibility across all official NIQS events and activities.',
        "Access to the prestigious NIQS President's Business Luncheon.",
        'High-level business networking opportunities with key industry stakeholders and decision-makers.',
        'Potential for direct and indirect business patronage by the Institute.',
      ] },
    ],
  },
];

/* How to apply, from the Secretariat's "Membership Application Process"
   document (Oct 2026): one route for new members, one for upgrades, both
   through the membership portal. */
export const APPLICATION_FLOWS = [
  {
    key: 'new',
    title: 'How to apply for Student / Technician / Probationer membership',
    href: 'https://portal.niqsng.org/register',
    steps: [
      'Click Apply Now below to open the Membership Portal.',
      'Select your category to create an account, pay the required fee to begin registration.',
      'Upload your documents and submit your application for your Referees and Chapter Chairman’s approval (All intending members are expected to belong to a Chapter).',
      'Submit the completed form and contact your referees and Chapter for their endorsement.',
      'Check your email inbox or spam folder for updates on your application (add our email address to your safe senders list to prevent messages from going to spam).',
      'Upon application approval by the Membership Committee, pay the required upgrade charges.',
      'Receive your Membership Number, access your logbook, and manage all future activities through your portal.',
    ],
  },
  {
    key: 'upgrade',
    title: 'Membership upgrade: Probationer / Member / Fellow / Firm',
    href: 'https://portal.niqsng.org/',
    steps: [
      'Click Apply Now below to open the Membership Portal.',
      'Sign in to your existing account, select Upgrade on your dashboard, and proceed with the application.',
      'Once submitted, monitor your email inbox and spam folder for application status updates (add our email address to your safe senders list to prevent messages from going to spam).',
    ],
  },
];

export default MEMBERSHIP_REQUIREMENTS;
