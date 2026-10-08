/**
 * Local-only seed for building and testing the Digital Library.
 *
 *   MONGO_URI=mongodb://127.0.0.1:27027/niqs-library-dev node scripts/seedLibraryDev.js
 *
 * Refuses to run against anything but a localhost database: the titles below are
 * test fixtures, not the Institute's catalogue, and must never reach Atlas.
 * Creates a main admin, one member and a spread of library items, and writes a
 * small sample PDF to /uploads so "Read now" has something to open.
 */
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const User = require('../models/User');
const LibraryItem = require('../models/LibraryItem');
const LibraryProgress = require('../models/LibraryProgress');

const URI = process.env.MONGO_URI || '';
if (!/^mongodb:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(URI)) {
  console.error('Refusing to seed: MONGO_URI must be a localhost mongodb:// URI. Got:', URI.replace(/\/\/.*@/, '//***@') || '(unset)');
  process.exit(1);
}

/* Test accounts for the local database only. */
const DEV_ADMIN  = { email: 'library.admin@niqs.test',  password: 'LibraryDev#2026', firstName: 'Library', lastName: 'Admin', role: 'main_admin', isActive: true };
const DEV_MEMBER = { email: 'library.member@niqs.test', password: 'LibraryDev#2026', firstName: 'Ada', lastName: 'Okafor', membershipType: 'corporate', membershipId: 'NIQS-DEV-0001' };

// Absolute, because the Vite dev server proxies /api only, not /uploads.
const PDF_FILE = 'library-dev-sample.pdf';
const PDF = `http://localhost:${process.env.PORT || 5000}/uploads/${PDF_FILE}`;

const ITEMS = [
  ['NIQS Standard Method of Measurement for Building Works', 'standard', 'Measurement & Estimating', 'members', 2024, ['NIQS Technical Committee'], 4, true, 312],
  ['Cost Planning and Control: A Practice Guide', 'guide', 'Cost Management', 'members', 2023, ['NIQS Practice Board'], 3, true, 188],
  ['Public Procurement Act 2007: Notes for Quantity Surveyors', 'book', 'Procurement & Contracts', 'public', 2022, ['F. Adeyemi'], 2, true, 96],
  ['BIM-Based Quantity Take-off in Nigerian Practice', 'paper', 'Digital Construction & BIM', 'public', 2024, ['O. Bello', 'K. Eze'], 1, true, 24],
  ['TPC Exam Preparation: Measurement and Valuation', 'course', 'Exam Preparation', 'members', 2025, ['NIQS Education Committee'], 6, true, 0],
  ['Final Accounts and Valuations', 'guide', 'Professional Practice', 'members', 2023, ['NIQS Practice Board'], 3, true, 140],
  ['Bill of Quantities Template, 2025 Edition', 'template', 'Measurement & Estimating', 'public', 2025, [], 0, false, 0],
  ['Life-Cycle Costing and Sustainable Construction', 'book', 'Sustainability', 'members', 2021, ['NIQS Research Committee'], 3, false, 220],
  ['Standard Forms of Building Contract in Nigeria', 'book', 'Construction Law', 'members', 2020, ['A. Ogunleye'], 3, false, 276],
  ['Journal of Quantity Surveying, Vol. 12 Issue 2', 'journal', 'Research & Journals', 'public', 2024, ['NIQS'], 0, false, 88],
  ['Project Cost Reporting for Clients', 'guide', 'Project Management', 'members', 2024, ['NIQS Practice Board'], 2, false, 64],
  ['Measuring Civil Engineering Works', 'standard', 'Measurement & Estimating', 'members', 2022, ['NIQS Technical Committee'], 4, false, 198],
  ['Dispute Avoidance and Adjudication', 'paper', 'Construction Law', 'members', 2023, ['T. Musa'], 1, false, 18],
  ['Introduction to 5D BIM for Quantity Surveyors', 'video', 'Digital Construction & BIM', 'members', 2025, ['YQSF'], 2, false, 0],
];

/* Smallest valid one-page PDF with a line of text. */
function writeSamplePdf() {
  const dir = path.join(__dirname, '..', 'uploads');
  fs.mkdirSync(dir, { recursive: true });
  const text = 'NIQS Digital Library - local test file';
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    null,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  const stream = `BT /F1 20 Tf 72 760 Td (${text}) Tj ET`;
  objs[3] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  let out = '%PDF-1.4\n';
  const offsets = [];
  objs.forEach((o, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  fs.writeFileSync(path.join(dir, PDF_FILE), out);
}

(async () => {
  await mongoose.connect(URI);
  writeSamplePdf();

  await Promise.all([Admin.deleteMany({ email: DEV_ADMIN.email }), User.deleteMany({ email: DEV_MEMBER.email }), LibraryItem.deleteMany({}), LibraryProgress.deleteMany({})]);
  const admin = await Admin.create(DEV_ADMIN);
  const member = await User.create(DEV_MEMBER);

  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const items = await LibraryItem.insertMany(ITEMS.map(([title, type, category, access, year, authors, cpdHours, isFeatured, pages], i) => ({
    title, slug: slug(title), type, category, access, year, authors, cpdHours, isFeatured, pages,
    publisher: 'NIQS', sortOrder: i, openCount: Math.max(0, 40 - i * 3),
    description: `${title} is a test fixture for the Digital Library. It stands in for the real publication until the secretariat uploads the catalogue.\n\nUse it to check the catalogue, the item page, the member gate and the reading shelf.`,
    tags: category.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3),
    fileUrl: PDF, storage: 'local', isPublished: true, createdBy: admin._id,
  })));

  await LibraryProgress.insertMany([
    { user: member._id, item: items[0]._id, percent: 50, status: 'in_progress' },
    { user: member._id, item: items[1]._id, percent: 100, status: 'completed', completedAt: new Date() },
    { user: member._id, item: items[8]._id, percent: 0, status: 'saved', saved: true },
  ]);

  console.log(`Seeded ${items.length} library items, 1 admin and 1 member into ${URI}`);
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
