/**
 * Data corrections from the NIQS website review session (7 Oct 2026).
 *
 * Covers the items that live in the database rather than the code:
 *   B1  QS High Chief Felix Okereke-Onyeri's term: 2009 - 2011 → 2008 - 2011
 *   B2  Past presidents: clear the `info` note ("PPNIQS" on every record)
 *   B3  National Body Chairmen: the two DGs move to the end of the list
 *
 * Deliberately NOT here:
 *   - Chapter `about` text. The chapter page no longer renders it, but
 *     ChapterMap and the chapters list read it as the "full profile" flag, so
 *     clearing it would unmark every published chapter.
 *   - Abbreviated past-president names. Waiting on Secretariat approval; the
 *     proposed mapping is in the TODO at the bottom of this file.
 *
 * Dry run by default — prints what it would change and writes nothing. Every
 * change is computed from the current record, so re-running after --apply
 * reports "no changes".
 *
 * Usage (from the server folder):
 *   node scripts/applyReviewCorrectionsOct2026.js           # dry run
 *   node scripts/applyReviewCorrectionsOct2026.js --apply   # write
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const PastPresident = require('../models/PastPresident');
const Exco = require('../models/Exco');

const APPLY = process.argv.includes('--apply');

async function correctTerm() {
  // Matched on surname, not the full name string: the record carries the
  // honorific ("QS High Chief Felix Okereke-Onyeri, FNIQS"), and that is
  // exactly the part the pending name abbreviation may change.
  const docs = await PastPresident.find({ name: /Okereke-Onyeri/i });
  if (docs.length !== 1) {
    console.warn(`  ! expected one Okereke-Onyeri record, found ${docs.length}; skipped`);
    return [];
  }
  const doc = docs[0];
  const term = '2008 - 2011';
  if (doc.term === term) return [];
  return [{ label: `${doc.name}: term "${doc.term}" → "${term}"`, run: () => PastPresident.updateOne({ _id: doc._id }, { term }) }];
}

async function clearPastPresidentInfo() {
  const docs = await PastPresident.find({ info: { $nin: ['', null] } });
  return docs.map(d => ({
    label: `${d.name}: info "${d.info}" → ""`,
    run: () => PastPresident.updateOne({ _id: d._id }, { info: '' }),
  }));
}

async function moveDGsToEnd() {
  const heads = await Exco.find({ scope: 'body-heads' }).sort({ order: 1, createdAt: 1 });
  const isDG = m => /^DG\b/i.test(m.title || '');
  // Everyone else keeps their relative order; the DGs follow, also in order.
  const wanted = [...heads.filter(m => !isDG(m)), ...heads.filter(isDG)];
  return wanted
    .map((m, i) => ({ m, order: i + 1 }))
    .filter(({ m, order }) => m.order !== order)
    .map(({ m, order }) => ({
      label: `${m.name} (${m.title}): order ${m.order} → ${order}`,
      run: () => Exco.updateOne({ _id: m._id }, { order }),
    }));
}

(async () => {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 20000 });
  console.log(`Connected to MongoDB. ${APPLY ? 'APPLYING changes.' : 'Dry run — nothing will be written.'}\n`);

  const steps = [
    ['B1 Okereke-Onyeri term', correctTerm],
    ['B2 Past-president info', clearPastPresidentInfo],
    ['B3 Body-heads order', moveDGsToEnd],
  ];

  let total = 0;
  for (const [title, plan] of steps) {
    const changes = await plan();
    console.log(`${title}: ${changes.length ? `${changes.length} change(s)` : 'no changes'}`);
    for (const c of changes) {
      console.log(`  - ${c.label}`);
      if (APPLY) await c.run();
    }
    total += changes.length;
  }

  console.log(`\n${total} change(s) ${APPLY ? 'applied' : 'pending — re-run with --apply to write'}.`);
  await mongoose.disconnect();
})().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});

/* TODO (pending Secretariat approval — review item #17): abbreviate the past
   presidents' names to prefix + first name + middle initial + surname. Proposed:
     QS Kene Christopher Nzekwe, FNIQS        → QS Kene C. Nzekwe, FNIQS
     QS Obafemi O. Onashile, FNIQS            → unchanged
     QS Agele J. Alufohai, FNIQS              → unchanged
     QS High Chief Felix Okereke-Onyeri, FNIQS → QS Felix Okereke-Onyeri, FNIQS ?  (keep "High Chief"?)
     QS Francis Oluwole Adetola, FNIQS        → QS Francis O. Adetola, FNIQS
     QS Joseph Olusegun Ajanlekoko, FNIQS     → QS Joseph O. Ajanlekoko, FNIQS
     QS Chief Gabriel Adetona Balogun, FNIQS  → QS Chief Gabriel A. Balogun, FNIQS
   The rest are already in that form. Also confirm Adetola's 2006 - 2008 does
   not overlap the corrected 2008 - 2011. */
