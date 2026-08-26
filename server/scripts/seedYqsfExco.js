/**
 * Publishes the Young Quantity Surveyors Forum's national Executive Council
 * (Exco scope:'yqsf') from the forum's own EC pack, July 2026.
 *
 * The YQSF page had only its Chairman on it, borrowed from his NEC card,
 * because he was the only member the secretariat's go-live package covered.
 * This seeds the other twelve so the forum gets the same treatment as every
 * other body on the site.
 *
 * Portraits are read from <portraitsDir>/yqsf/yqsf-<slug>.jpg, uploaded through
 * the shared storage helper and attached to the record. Idempotent: members are
 * matched by (scope, title), and any yqsf-scope record whose title is no longer
 * on the roster is retired.
 *
 * Usage (from the server folder):
 *   node scripts/seedYqsfExco.js <portraitsDir> [--no-photos]
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { storeBuffer } = require('../utils/storage');
const Exco = require('../models/Exco');

const portraitsDir = process.argv[2];
const noPhotos = process.argv.includes('--no-photos');
if (!portraitsDir) {
  console.error('Usage: node scripts/seedYqsfExco.js <portraitsDir> [--no-photos]');
  process.exit(2);
}

/* [slug, name, title, order]

   The pack labels its files by name and office and nothing else, so the names
   here are bare — no QS, no post-nominals — because that is how they arrived
   and adding either on someone's behalf is a claim about registration that is
   not ours to make. Two are styled, and only on evidence: the Chairman from his
   NEC card in the secretariat's go-live package, and the North West coordinator
   from Kaduna's own senate pack, where he is also a co-opted member.

   WARNING: changing a title in this list is not a text edit. Exco is keyed on
   (scope, title), so a renamed seat is written as a new record and the old one is
   deleted with its `image` field, orphaning the portrait on Cloudinary with no
   way back to its URL from the database. That happened to this very entry on
   2026-08-26 and the asset had to be recovered by elimination through the
   Cloudinary Admin API -- the one file in the batch that no record referenced.
   Re-run with the portraits directory, not --no-photos, after any title change.

   NAQSS is spelt out in full -- National Association of Quantity Surveying
   Students -- confirmed by the operator on 2026-08-26. It was the one body on the
   site printed as a bare acronym, which a reader outside the profession cannot
   decode. Supplied as "Student"; pluralised here, since the body is an
   association of students and the singular reads as a slip. */
const COUNCIL = [
  ['abubakar-ahmed-maigatari', 'QS Abubakar Ahmed Maigatari, MNIQS', 'Chairman', 1],
  ['khalifa-faruk-sanusi', 'Khalifa Faruk Sanusi', 'Deputy Chairman, Finance & Sponsorship', 2],
  ['oluwabusolami-adebiyi', 'Oluwabusolami Adebiyi', 'Deputy Chairman, Capacity Building', 3],
  ['mohammed-m-ndagi', 'Mohammed M. Ndagi', 'Regional Coordinator, North Central', 4],
  ['hassan-mustapha', 'Hassan Mustapha', 'Regional Coordinator, North East', 5],
  ['yusuf-musa-uba', 'QS Yusuf Musa Uba, MNIQS', 'Regional Coordinator, North West', 6],
  ['ifunanya-bridget-anyigor', 'Ifunanya Bridget Anyigor', 'Regional Coordinator, South East', 7],
  ['ojeaga-samuel-wade', 'Ojeaga Samuel Wade', 'Regional Coordinator, South South', 8],
  ['tolu-samuel-agboola', 'Tolu Samuel Agboola', 'Regional Coordinator, South West', 9],
  ['zulfat-o-muhammad', 'Zulfat O. Muhammad', 'Ex-Officio, Student Affairs', 10],
  ['ahmad-yakubu', 'Ahmad Yakubu', 'National President, National Association of Quantity Surveying Students', 11],
  ['abdulrafiu-ibrahim', 'Abdulrafiu Ibrahim', 'Co-opted Member — FCT YQSF', 12],
  ['faith-ozichi-nwuzor', 'Faith Ozichi Nwuzor', 'Co-opted Member — Lagos YQSF', 13],
];

(async () => {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 20000 });
  console.log('Connected.\n── YQSF Executive Council ──');

  for (const [slug, name, title, order] of COUNCIL) {
    let storage = 'text only';
    let image;
    if (!noPhotos) {
      const file = path.join(portraitsDir, 'yqsf', `yqsf-${slug}.jpg`);
      if (!fs.existsSync(file)) {
        console.warn(`   !! missing portrait ${file} — text only`);
      } else {
        const buffer = fs.readFileSync(file);
        const stored = await storeBuffer({
          buffer, originalname: `yqsf-${slug}.jpg`, mimetype: 'image/jpeg', size: buffer.length,
        });
        image = stored.url;
        storage = stored.storage;
      }
    }

    await Exco.findOneAndUpdate(
      { scope: 'yqsf', title },
      { name, title, scope: 'yqsf', order, isActive: true, ...(image ? { image } : {}) },
      { upsert: true },
    );
    console.log(`   ${storage.padEnd(10)} ${String(order).padStart(2)}. ${title} — ${name}`);
  }

  const keepTitles = COUNCIL.map(([, , title]) => title);
  const stale = await Exco.deleteMany({ scope: 'yqsf', title: { $nin: keepTitles } });
  if (stale.deletedCount) console.log(`   removed ${stale.deletedCount} stale record(s)`);

  await mongoose.disconnect();
  console.log(`\nDone — ${COUNCIL.length} council members.`);
})().catch((e) => { console.error(e); process.exit(1); });
