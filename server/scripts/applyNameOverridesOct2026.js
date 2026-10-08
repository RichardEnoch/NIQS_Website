/**
 * Short-name overrides for records the automatic initials get wrong
 * (review round 2, Oct 2026).
 *
 * client/src/utils/names.js keeps the LAST word as the surname unless one word
 * is hyphenated. A few chapter records list the surname first, and the
 * National Executive Council lists the same person surname-last, so the two
 * pages would show two different people. These overrides cover only the cases
 * the NEC record settles; the rest are listed in the Naming Structure document
 * for the Secretariat to confirm, and can be set in admin (Short name field).
 *
 * Dry run by default; --apply writes. Re-running changes nothing.
 *
 * Usage (from the server folder):
 *   node scripts/applyNameOverridesOct2026.js
 *   node scripts/applyNameOverridesOct2026.js --apply
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const Exco = require('../models/Exco');

const APPLY = process.argv.includes('--apply');

// Matched on the exact stored name and scope, so nothing else can be touched.
const OVERRIDES = [
  // NEC: "QS Dr. Chukwuemeka Patrick Ogbu, MNIQS"; Edo chapter stores it surname-first.
  { scope: 'chapter', name: 'QS Dr. Ogbu Chukwuemeka Patrick, MNIQS', shortName: 'QS Dr. C. P. Ogbu, MNIQS' },
  // NEC: "QS Donatus Chidi Oduenyi, MNIQS"; Anambra chapter stores it surname-first.
  { scope: 'chapter', name: 'QS Oduenyi Donatus Chidi, MNIQS', shortName: 'QS D. C. Oduenyi, MNIQS' },
];

async function main() {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 20000 });
  console.log(APPLY ? 'Applying name overrides' : 'Dry run (pass --apply to write)');
  for (const o of OVERRIDES) {
    const docs = await Exco.find({ scope: o.scope, name: o.name });
    if (docs.length !== 1) { console.warn(`  ! expected one "${o.name}", found ${docs.length}; skipped`); continue; }
    const d = docs[0];
    if (d.shortName === o.shortName) { console.log(`  = ${o.name} already "${o.shortName}"`); continue; }
    console.log(`  ~ ${o.name}: shortName "${d.shortName || ''}" -> "${o.shortName}"`);
    if (APPLY) await Exco.updateOne({ _id: d._id }, { $set: { shortName: o.shortName } });
  }
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
