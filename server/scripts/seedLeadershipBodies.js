/**
 * Leadership-bodies seed — populates the National Body Chairmen
 * (Exco scope:'body-heads') and the Incorporated Board of Trustees
 * (Exco scope:'bot') from the committee's approved go-live content
 * package (July 2026).
 *
 * Reads MONGO_URI + Cloudinary/R2 creds from server/.env, uploads the
 * compressed body-head portraits through utils/storage (same tiering as
 * /api/upload), then upserts records by (name, scope) so re-runs are safe.
 * BOT members had no portraits in that package, so this script sets none for
 * them. The secretariat sent all seven on 2026-07-29 and they were published
 * with applyManifestPortraits.js; because the trustee upsert below never writes
 * an `image`, re-running this seed leaves those portraits alone. Keep it that
 * way, or a routine re-seed will blank the Board of Trustees page.
 *
 * Usage (from the server folder):
 *   node scripts/seedLeadershipBodies.js <photosDir>
 *
 * <photosDir> must contain the compressed NATIONAL-BODY-HEADS__*.jpg files
 * (source photos: ADLM Docs/NIQS/.../LEADERSHIP & GOVERNANCE CONTENT/NATIONAL BODY HEADS).
 * Missing photo files are skipped with a warning rather than aborting.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { storeBuffer } = require('../utils/storage');

const Exco = require('../models/Exco');

const [photosDir] = process.argv.slice(2);
if (!photosDir) {
  console.error('Usage: node scripts/seedLeadershipBodies.js <photosDir>');
  process.exit(2);
}

/* The two DGs sit last (review, Oct 2026): the page is "National Body
   Chairmen", so the chairmen lead and the directors-general follow. */
const BODY_HEADS = [
  { order: 1, name: 'QS Kayode Osokomaiya, FNIQS', title: 'Chairman, Fellows Forum', photo: 'NATIONAL-BODY-HEADS__fellows-forum-chairman-qs-kayode-osokomiya.jpg' },
  { order: 2, name: 'QS Faith Ezeugoh, FNIQS', title: 'Chairman, Association of Quantity Surveyors in Contracting Organisations & Real Estate (AQSCO)', photo: 'NATIONAL-BODY-HEADS__aqsco-chairman-qs-faith-ezeugoh.jpg' },
  { order: 3, name: 'QS Fausat Ajibade, FNIQS', title: 'Chairman, Association of Quantity Surveyors in Public Service (AQSPS)', photo: 'NATIONAL-BODY-HEADS__aqsps-chairman-qs-fausat-ajibade-fniqs.jpg' },
  { order: 4, name: 'QS Prof. Ahmad Doko Ibrahim, FNIQS', title: 'Chairman, Association of Quantity Surveyors Lecturers/Educators (AQSLE)', photo: 'NATIONAL-BODY-HEADS__aqsle-chairman-qs-prof-ahmad-doko.jpg' },
  { order: 5, name: 'QS Adamu Yanda Shehu, FNIQS', title: 'Chairman, Association of Consulting Quantity Surveyors (ACQS)', photo: 'NATIONAL-BODY-HEADS__acqs-chairman-qs-adamu-yanda-fniqs.jpg' },
  { order: 6, name: 'QS Auwalu Sani Shehu, FNIQS', title: 'Chairman, Examination Board', photo: 'NATIONAL-BODY-HEADS__examination-board-chairman-auwalu-sani-shehu.jpg' },
  { order: 7, name: 'QS Prof Rufus Ogunsemi, FNIQS', title: 'Chairman, Editorial Board — The Quantity Surveyor Journal', photo: 'NATIONAL-BODY-HEADS__chairman-editorial-board-the-quantity-surveyor-journal-qs-prof-rufus-ogunsemi.jpg' },
  { order: 8, name: 'QS Dr Celestina Nkechi Eke, FNIQS', title: 'DG, NIQS Foundation', photo: 'NATIONAL-BODY-HEADS__dg-niqs-foundation-qs-dr-celestina-nkechi-eke-fniqs.jpg' },
  { order: 9, name: 'QS Ayodele Faleye, FNIQS', title: 'DG, QS Academy', photo: 'NATIONAL-BODY-HEADS__dg-qs-academy-qs-ayodele-faleye-fniqs.jpg' },
];

const TRUSTEES = [
  { order: 1, name: 'QS Hussaini A. Dikko, FNIQS, PPNIQS', title: 'Chairman' },
  { order: 2, name: 'QS Mercy Iyortyer, FNIQS, PPNIQS', title: 'Member' },
  { order: 3, name: 'QS Joshua Abiodun Bamdupe, FNIQS', title: 'Member' },
  { order: 4, name: 'QS Godson Onyebueke Moneke, FNIQS', title: 'Member' },
  { order: 5, name: 'QS Yahaya Abubakar, FNIQS', title: 'Member' },
  { order: 6, name: 'QS Oladimeji Olumuyiwa Garuba, FNIQS', title: 'Member' },
  { order: 7, name: 'QS Tony Ndah, FNIQS', title: 'Member' },
];

async function photoUrl(name) {
  const fullPath = path.join(photosDir, name);
  if (!fs.existsSync(fullPath)) {
    console.warn(`  WARN photo missing, skipping: ${name}`);
    return '';
  }
  const buffer = fs.readFileSync(fullPath);
  const res = await storeBuffer({
    buffer, originalname: name, mimetype: 'image/jpeg', size: buffer.length,
  });
  console.log(`  uploaded ${name} -> ${res.storage}`);
  return res.url;
}

(async () => {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 20000 });
  console.log('Connected to MongoDB.\n');

  console.log('National Body Chairmen…');
  for (const m of BODY_HEADS) {
    const image = await photoUrl(m.photo);
    await Exco.findOneAndUpdate(
      { name: m.name, scope: 'body-heads' },
      { title: m.title, order: m.order, scope: 'body-heads', isActive: true, ...(image ? { image } : {}) },
      { upsert: true }
    );
  }
  console.log(`  ok (${BODY_HEADS.length})\n`);

  console.log('Board of Trustees…');
  for (const m of TRUSTEES) {
    await Exco.findOneAndUpdate(
      { name: m.name, scope: 'bot' },
      { title: m.title, order: m.order, scope: 'bot', isActive: true },
      { upsert: true }
    );
  }
  console.log(`  ok (${TRUSTEES.length})\n`);

  const counts = {
    body_heads: await Exco.countDocuments({ scope: 'body-heads' }),
    bot: await Exco.countDocuments({ scope: 'bot' }),
  };
  console.log('Final counts:', counts);
  await mongoose.disconnect();
  console.log('Done.');
})().catch((err) => { console.error(err); process.exit(1); });
