/**
 * Applies the content NIQS sent after the review (Liaison Office Drive,
 * 14-15 Oct 2026): contact details, chapter profiles and corrections, the
 * National Policy Committee roster, the missing past presidents, the AGM-season
 * events, the portal announcement and four of the President's speeches.
 *
 * Every write is computed from the current record, so a second run reports
 * "no changes". Every filter must match exactly one record; anything that
 * matches none or several is skipped and listed, never guessed at. Name
 * corrections for Borno, Delta and Kogi are matched on surname + initials and
 * printed as an old → new table so they can be read before --apply.
 *
 * Portraits are not in here: they arrive separately and go through
 * normalizePortraits.py + applyNewPortraits.js.
 *
 * Data files (verbatim from the NIQS documents) live in scripts/data/:
 *   chapterProfilesOct2026.json, npcRosterOct2026.json, presidentSpeechesOct2026.json
 *
 * Usage (from the server folder):
 *   node scripts/applyContentPackOct2026.js            # dry run
 *   node scripts/applyContentPackOct2026.js --apply    # write
 *   node scripts/applyContentPackOct2026.js --only=npc,events   # some sections
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const path = require('path');
const mongoose = require('mongoose');

const Admin = require('../models/Admin');
const Chapter = require('../models/Chapter');
const ContactInfo = require('../models/ContactInfo');
const Event = require('../models/Event');
const Exco = require('../models/Exco');
const PastPresident = require('../models/PastPresident');
const President = require('../models/President');
const SiteSettings = require('../models/SiteSettings');

const APPLY = process.argv.includes('--apply');
const ONLY = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const data = (f) => require(path.join(__dirname, 'data', f));

const skipped = [];
const skip = (section, why) => skipped.push(`[${section}] ${why}`);
const change = (label, run) => ({ label, run });

/* "QS Godson O. Moneke FNIQS" / "QS A. A. Samuel. MNIQS" → a comma before the post-nominal. */
function tidyName(n) {
  n = n.replace(/\s+/g, ' ').trim();
  const m = n.match(/^(.*?)(,?)\s+((?:[MF]NIQS|PPNIQS)(?:,\s*(?:[MF]NIQS|PPNIQS))*)$/);
  if (!m || m[2]) return n;
  // "Samuel." loses its stray full stop; an initial ("I.", "U.N.") keeps its own.
  const head = /(^|\s)([A-Za-z]\.)+$/.test(m[1]) ? m[1] : m[1].replace(/\.$/, '');
  return `${head}, ${m[3]}`;
}

/* Words of a name, lower-cased, without titles or post-nominals. */
// Traditional titles stay in: "Alhaji" is the A. in "QS I. A. Modu".
const TITLE = /^(qs|dr|prof|engr|arc|surv|mr|mrs|ms|miss)$/i;
const POST = /^(mniqs|fniqs|ppniqs)$/i;
function parts(name) {
  const core = name.split(',')[0];
  const toks = core.split(/\s+/).map(t => t.replace(/^[(]|[,)]$/g, '')).filter(Boolean);
  const words = [], initials = [];
  for (const t of toks) {
    const bare = t.replace(/\.$/, '');
    if (TITLE.test(bare) || POST.test(bare)) continue;
    if (/^([A-Za-z]\.)+[A-Za-z]?\.?$/.test(t) || /^[A-Za-z]\.?$/.test(t)) initials.push(t.replace(/\./g, '').toLowerCase());
    else words.push(t.replace(/\.$/, '').toLowerCase());
  }
  return { words, initials };
}

/* Which existing record does a corrected name refer to? Every full word of the
   corrected name must appear in the record, and every initial must be the first
   letter of one of the record's other words. "I. P. U.N." has no full word, so
   it matches on the literal "U.N." token instead. */
function matchCorrected(corrected, records) {
  const c = parts(corrected);
  const hits = records.filter((r) => {
    const rw = parts(r.name);
    const all = [...rw.words, ...rw.initials];
    if (!c.words.length) return c.initials.length && rw.initials.includes(c.initials.at(-1)) ||
      all.includes(c.initials.at(-1));
    if (!c.words.every(w => rw.words.includes(w))) return false;
    const rest = rw.words.filter(w => !c.words.includes(w)).map(w => w[0]).concat(rw.initials.map(i => i[0]));
    return c.initials.every(i => rest.includes(i[0]));
  });
  return hits;
}

async function chapterByName(name) {
  const docs = await Chapter.find({ name });
  return docs.length === 1 ? docs[0] : null;
}

/* ── 1. Contact details ─────────────────────────────────────────────────── */
const HEAD_OFFICE = {
  label: 'NIQS Head Office Secretariat',
  address: 'QS J. Segun Ajanlekoko House, No. 24, NIQS Crescent, Off Michael Ama Nnachi Crescent, Cadastral Zone B6, Mabushi District, Abuja, Nigeria.',
  phone1: '08167593807',
  email1: 'info@niqs.org.ng',
  email2: 'contact@niqs.org.ng',
};

async function contacts() {
  const out = [];
  // WAQSN and YQSF use the Institute's own details (corrections doc).
  for (const id of ['national', 'waqsn', 'yqsf']) {
    const doc = await ContactInfo.findById(id);
    const want = { ...HEAD_OFFICE, ...(id !== 'national' ? { label: doc?.label || id.toUpperCase() } : {}) };
    const diff = Object.keys(want).filter(k => (doc?.[k] || '') !== want[k]);
    if (diff.length) out.push(change(`contact-info/${id}: ${diff.join(', ')}`,
      () => ContactInfo.updateOne({ _id: id }, { $set: want }, { upsert: true })));
  }
  const s = await SiteSettings.findById('global');
  const site = { address: HEAD_OFFICE.address, phone1: HEAD_OFFICE.phone1, email1: HEAD_OFFICE.email1, email2: HEAD_OFFICE.email2 };
  const sd = Object.keys(site).filter(k => (s?.[k] || '') !== site[k]);
  if (sd.length) out.push(change(`site-settings: ${sd.join(', ')}`,
    () => SiteSettings.updateOne({ _id: 'global' }, { $set: site }, { upsert: true })));
  skip('contacts', 'Lagos Liaison Office (Victor Akan QS House, 17/19 Idowu Taylor Street, Victoria Island; 08137399669; liaisonoffice@niqs.org.ng) has no field in ContactInfo/SiteSettings — it is set in the client (Footer, Contact page)');
  return out;
}

/* ── 2. Chapters ────────────────────────────────────────────────────────── */
async function chapters() {
  const out = [];
  const profiles = data('chapterProfilesOct2026.json');
  for (const [state, about] of Object.entries(profiles)) {
    const ch = await chapterByName(`${state} Chapter`);
    if (!ch) { skip('chapters', `no single "${state} Chapter"`); continue; }
    if (ch.about !== about) out.push(change(`${ch.name}: profile text`, () => Chapter.updateOne({ _id: ch._id }, { about })));
  }
  const ekiti = await chapterByName('Ekiti Chapter');
  if (ekiti) {
    const want = { address: 'Ministry of Works and Infrastructure, Ajilosun, Ado-Ekiti', phone: '08161382550', email: 'ekitiniqs@gmail.com' };
    const diff = Object.keys(want).filter(k => ekiti[k] !== want[k]);
    if (diff.length) out.push(change(`Ekiti Chapter: ${diff.join(', ')}`, () => Chapter.updateOne({ _id: ekiti._id }, want)));
  }
  // "Delete KEBBI AND TARABA CHAPTERS": hidden, not deleted — the public list
  // and the chapter pages read isActive, and the record stays recoverable.
  for (const n of ['Kebbi Chapter', 'Taraba Chapter']) {
    const ch = await chapterByName(n);
    if (!ch) skip('chapters', `no single "${n}"`);
    else if (ch.isActive) out.push(change(`${n}: hide (isActive=false)`, () => Chapter.updateOne({ _id: ch._id }, { isActive: false })));
  }
  // Sokoto and Kebbi are one chapter. Only the display name changes: the slug
  // stays (links), and `state` stays "Sokoto State" because the state map and
  // ChapterMap match on it — the client draws Kebbi alongside for this chapter.
  const sok = await Chapter.findOne({ slug: 'sokoto-chapter' });
  if (!sok) skip('chapters', 'no sokoto-chapter');
  else if (sok.name !== 'Sokoto-Kebbi Chapter') out.push(change(`${sok.name} → Sokoto-Kebbi Chapter (slug and state unchanged)`,
    () => Chapter.updateOne({ _id: sok._id }, { name: 'Sokoto-Kebbi Chapter' })));
  return out;
}

/* ── 3. Chapter executives ──────────────────────────────────────────────── */
const CORRECTED = {
  Borno: ['QS B. Tanko, MNIQS', 'QS A. Muhammad, MNIQS', 'S. Simon', 'QS T. Idris, MNIQS', 'QS D. Wadai, MNIQS', 'QS I. A. Modu, MNIQS', 'QS Y. A. Margima, MNIQS'],
  Delta: ['QS Francis O. Okorho, FNIQS', 'QS A. O. Andrew, MNIQS', 'QS F. E. Jegbe, MNIQS', 'QS E. E. Ikhide, MNIQS', 'QS O. N. Joe, MNIQS',
    'QS Omoh-Paul I. MNIQS', 'QS I. P. U.N. MNIQS', 'N. S. Ifechukwude', 'QS P. Olorunfemi, MNIQS', 'QS N. E. Ifeoma, MNIQS',
    'QS Dr. C. O. Aduze, FNIQS', 'QS M. O. Izevbokun, FNIQS', 'QS S. P. Onoriode, FNIQS'],
  Kogi: ['QS A. A. Samuel. MNIQS', 'QS O. I. Bayo, MNIQS', 'QS E. K. Jeremiah, MNIQS', 'QS M. Hadiza, MNIQS', 'QS O. Samuel, MNIQS', 'O. Casimir'],
};
// Probationer members: no QS, no post-nominal (exact record → exact new name).
const PROBATIONERS = {
  Abia: [['QS Nwagbara Nwokodimkpa', 'Nwokodimkpa N. Nwagbara'], ['QS Ogenkwa Esther Onyinyechi', 'Esther O. Ogenkwa']],
  Rivers: [['QS Izidor Smith Nwachukwu', 'I. S. Nwachukwu']],
  Zamfara: [['QS Abdurrahman Ibrahim', 'A. Ibrahim']],
};

async function chapterExco() {
  const out = [];
  const excoOf = async (state) => {
    const ch = await chapterByName(`${state} Chapter`);
    if (!ch) { skip('exco', `no single "${state} Chapter"`); return [null, []]; }
    return [ch, await Exco.find({ scope: 'chapter', chapter: ch._id, isActive: true }).sort('order')];
  };
  const rename = (r, name, why) => r.name !== name &&
    out.push(change(`${why}: "${r.name}" → "${name}"`, () => Exco.updateOne({ _id: r._id }, { name })));

  // Deputy chairmen: no phone or email on any chapter page.
  const deps = await Exco.find({ scope: 'chapter', isActive: true, title: /deputy\s+chairman/i,
    $or: [{ email: { $nin: [null, ''] } }, { phone: { $nin: [null, ''] } }] });
  for (const d of deps) out.push(change(`deputy chairman contact removed: ${d.name}`,
    () => Exco.updateOne({ _id: d._id }, { $set: { email: '', phone: '' } })));

  for (const [state, pairs] of Object.entries(PROBATIONERS)) {
    const [, recs] = await excoOf(state);
    for (const [from, to] of pairs) {
      const hit = recs.filter(r => r.name === from || r.name === to);
      if (hit.length !== 1) skip('exco', `${state}: "${from}" matched ${hit.length}`);
      else rename(hit[0], to, `${state} probationer`);
    }
  }

  for (const state of ['Nasarawa', 'Niger']) {
    const [, recs] = await excoOf(state);
    for (const r of recs) if (!/,\s*[MF]NIQS/.test(r.name)) rename(r, `${r.name.trim()}, MNIQS`, `${state} add MNIQS`);
  }

  {
    const [, recs] = await excoOf('Ogun');
    const keep = ['QS Lukman Adewunmi', 'QS Azeez Mustapha'];
    for (const r of recs) {
      if (/Ola-Ade/i.test(r.name)) rename(r, 'QS E. Ola-Ade, FNIQS', 'Ogun chairman');
      else if (!keep.includes(r.name.trim()) && !/,\s*[MF]NIQS/.test(r.name)) rename(r, `${r.name.trim()}, MNIQS`, 'Ogun add MNIQS');
    }
  }

  // Borno: QS Mamman Modu Gana is late — hide the record.
  const [borno, bornoRecs] = await excoOf('Borno');
  const gana = bornoRecs.filter(r => /\bGana\b/i.test(r.name));
  if (gana.length === 1) out.push(change(`Borno: hide "${gana[0].name}" (late)`, () => Exco.updateOne({ _id: gana[0]._id }, { isActive: false })));
  else if (borno) skip('exco', `Borno: Gana matched ${gana.length}`);

  // Borno / Delta / Kogi corrected names, matched to records and shown for review.
  console.log('\nName corrections (review before --apply):');
  for (const [state, list] of Object.entries(CORRECTED)) {
    const [, recs0] = await excoOf(state);
    const recs = recs0.filter(r => !/\bGana\b/i.test(r.name));
    const used = new Set();
    for (const raw of list) {
      const name = tidyName(raw);
      const hits = matchCorrected(name, recs).filter(r => !used.has(String(r._id)));
      if (hits.length !== 1) { skip('exco', `${state}: "${name}" matched ${hits.length} (${hits.map(h => h.name).join(' | ')})`); continue; }
      used.add(String(hits[0]._id));
      console.log(`  ${state.padEnd(6)} ${hits[0].title.padEnd(34)} ${hits[0].name}  →  ${name}`);
      rename(hits[0], name, `${state} corrected`);
    }
  }

  // Kogi: Financial Secretary was missing.
  const [kogi, kogiRecs] = await excoOf('Kogi');
  if (kogi && !kogiRecs.some(r => /Rashidat/i.test(r.name))) {
    const fs = 6;
    out.push(change('Kogi: add "Lawal Rashidat" — Financial Secretary', async () => {
      await Exco.updateMany({ scope: 'chapter', chapter: kogi._id, order: { $gte: fs } }, { $inc: { order: 1 } });
      await Exco.create({ name: 'Lawal Rashidat', title: 'Financial Secretary', scope: 'chapter', chapter: kogi._id, state: 'Kogi State', order: fs });
    }));
  }
  return out;
}

/* ── 4. Board of Trustees ───────────────────────────────────────────────── */
async function trustees() {
  const out = [];
  const want = [[/Ndah/i, 'QS Anthony V. Ndah, FNIQS'], [/Dikko/i, 'QS Hussaini A. Dikko, FNIQS, PPNIQS'], [/Iyortyer/i, 'QS Mercy T. Iyortyer, FNIQS, PPNIQS']];
  for (const [re, name] of want) {
    const hit = await Exco.find({ scope: 'bot', isActive: true, name: re });
    if (hit.length !== 1) { skip('bot', `${re} matched ${hit.length}`); continue; }
    if (hit[0].name !== name) out.push(change(`BOT: "${hit[0].name}" → "${name}"`, () => Exco.updateOne({ _id: hit[0]._id }, { name })));
  }
  return out;
}

/* ── 5. National Policy Committee roster ────────────────────────────────── */
async function npc() {
  const out = [];
  const hasGroup = !!Exco.schema.path('group');
  if (!hasGroup) skip('npc', 'Exco has no `group` field yet — roster written without section headings (deploy the model change first)');
  const roster = data('npcRosterOct2026.json').map(r => ({ ...r, name: tidyName(r.name) }));
  const existing = await Exco.find({ scope: 'npc' });
  const key = (r) => `${r.group || ''}|${r.name}`;
  const byKey = new Map(existing.map(e => [key(e), e]));
  const wanted = new Set();
  for (const r of roster) {
    const doc = { name: r.name, title: r.title, order: r.order, scope: 'npc', isActive: true, ...(hasGroup ? { group: r.group } : {}) };
    const k = hasGroup ? key(r) : `|${r.name}`;
    wanted.add(k);
    const cur = byKey.get(k) || (!hasGroup && existing.find(e => e.name === r.name && e.title === r.title));
    if (!cur) out.push(change(`NPC add: ${r.group} — ${r.name} (${r.title})`, () => Exco.create(doc)));
    else if (cur.title !== r.title || cur.order !== r.order || !cur.isActive)
      out.push(change(`NPC update: ${r.name}`, () => Exco.updateOne({ _id: cur._id }, { $set: doc })));
  }
  for (const e of existing) {
    if (e.isActive && !wanted.has(hasGroup ? key(e) : `|${e.name}`))
      out.push(change(`NPC hide (not on the list): ${e.name}`, () => Exco.updateOne({ _id: e._id }, { isActive: false })));
  }
  return out;
}

/* ── 6. Past presidents ─────────────────────────────────────────────────── */
const MISSING_PAST_PRESIDENTS = [
  ['QS Gafar A. Nosiru, FNIQS', '1973'],
  ['QS Emmanuel O. Nwogu, FNIQS', '1974 - 1975'],
  ['QS Thomas B. Adebayo, FNIQS', '1975 - 1976'],
  ['QS Appolonius O. Nwanze, FNIQS', '1976 - 1977'],
  ['QS Olukayode A. Aderibigbe, FNIQS', '1977 - 1979'],
  ['QS Chukwuemeka A. Osemenam, FNIQS', '1979 - 1982'],
  ['QS Bisi A. Oduntan, FNIQS', '1982 - 1984'],
  ['QS Shehu L. Giwa, FNIQS', '1984 - 1986'],
  ['QS Williams E. Owete, FNIQS', '1990 - 1992'],
  ['QS Samson E. Emiowele, FNIQS', '1994 - 1996'],
  ['QS Murtala A. Oladapo, FNIQS', '1996 - 2000'],
  ['QS Emmanuel C. Oforeh, FNIQS', '2004 - 2006'],
];

async function pastPresidents() {
  const out = [];
  const all = await PastPresident.find({});
  const surname = (n) => n.split(',')[0].trim().split(/\s+/).at(-1);
  const adding = [];
  for (const [name, term] of MISSING_PAST_PRESIDENTS) {
    const s = surname(name);
    const hits = all.filter(p => new RegExp(`\\b${s}\\b`, 'i').test(p.name));
    if (hits.length > 1) { skip('past-presidents', `${s} matched ${hits.length}`); continue; }
    if (!hits.length) {
      adding.push({ name, term });
      out.push(change(`add ${name} (${term})`, () => PastPresident.create({ name, term, isActive: true })));
    }
  }
  skip('past-presidents', 'TODO: QS Ezugo Isiadinso and QS Aderoju A. Adekanmbi have no term in the files (term is required) — likely 1986-1990; confirm with the Secretariat, then add');
  // Newest first, by the start year of the term — only if anything is out of place.
  const year = (t) => parseInt((String(t).match(/\d{4}/) || ['0'])[0], 10);
  const byYear = (a, b) => year(b.term) - year(a.term);
  const planned = [...all, ...adding].sort(byYear);
  if (adding.length || planned.some((p, i) => p.order !== undefined && p.order !== i)) {
    out.push(change('reorder past presidents by start year (newest first)', async () => {
      const now = (await PastPresident.find({})).sort(byYear);
      for (let i = 0; i < now.length; i++) if (now[i].order !== i) await PastPresident.updateOne({ _id: now[i]._id }, { order: i });
    }));
  }
  return out;
}

/* ── 7. Events and the portal announcement ──────────────────────────────── */
const AGM_VENUE = 'De Peace Hotel and Suite, University Road, Ilorin, Kwara State';
const EVENTS = [
  { title: '2026 National Workshop & AGM Press Conference', type: 'meeting', isFeatured: false,
    date: '2026-11-10T10:00:00+01:00', location: 'Abuja', venue: 'NIQS Secretariat, Mabushi, Abuja',
    description: 'Press conference ahead of the 2026 National Conference and Annual General Meeting.' },
  { title: 'National Conference & Annual General Meeting 2026', type: 'agm', isFeatured: true,
    date: '2026-11-16T09:00:00+01:00', endDate: '2026-11-20T18:00:00+01:00', location: 'Ilorin, Kwara State', venue: AGM_VENUE,
    registrationLink: 'https://www.niqs.org.ng/register/agm2026',
    description: 'Theme: "FINANCING SUSTAINABLE MASS HOUSING: Synergising Cost Management and Capital Markets for Affordable Shelter in Nigeria." Virtual session/module: 10th to 13th November 2026. Main event: 16th to 20th November 2026.' },
  { title: 'Induction of New Members', type: 'ceremony', isFeatured: true,
    date: '2026-11-19T10:00:00+01:00', location: 'Ilorin, Kwara State', venue: AGM_VENUE,
    description: 'Induction of new members at the 2026 National Conference and Annual General Meeting.' },
  { title: 'Investiture of Fellows', type: 'ceremony', isFeatured: true,
    date: '2026-11-20T10:00:00+01:00', location: 'Ilorin, Kwara State', venue: AGM_VENUE,
    description: 'Investiture of Fellows at the 2026 National Conference and Annual General Meeting.' },
];
const BANNER = 'Update your profile on the upgraded NIQS portal — portal.niqsng.org';

async function events() {
  const out = [];
  const author = await Admin.findOne({ role: 'main_admin' }).sort('createdAt');
  if (!author) { skip('events', 'no main_admin to set as author — events not created'); }
  // The home spotlight has three slots; only upcoming featured items take one.
  const ours = new Set(EVENTS.map(e => e.title));
  const othersFeatured = await Event.find({ isFeatured: true, $or: [{ endDate: { $gte: new Date() } }, { date: { $gte: new Date() } }] });
  const blocking = othersFeatured.filter(e => !ours.has(e.title));
  if (blocking.length) skip('events', `other upcoming featured events (${blocking.map(e => e.title).join('; ')}) — AGM items left unfeatured to respect the 3 slots`);
  for (const e of EVENTS) {
    const want = { ...e, date: new Date(e.date), ...(e.endDate ? { endDate: new Date(e.endDate) } : {}), scope: 'national',
      isFeatured: e.isFeatured && !blocking.length };
    const hit = await Event.find({ title: e.title });
    if (hit.length > 1) { skip('events', `"${e.title}" matched ${hit.length}`); continue; }
    if (!hit.length) {
      if (author) out.push(change(`add event: ${e.title}`, () => Event.create({ ...want, author: author._id })));
      continue;
    }
    const cur = hit[0];
    const diff = ['description', 'location', 'venue', 'type', 'registrationLink', 'isFeatured']
      .filter(k => (want[k] ?? '') !== (cur[k] ?? '')).concat(+cur.date !== +want.date ? ['date'] : []);
    if (diff.length) out.push(change(`update event ${e.title}: ${diff.join(', ')}`, () => Event.updateOne({ _id: cur._id }, { $set: want })));
  }
  const s = await SiteSettings.findById('global');
  if (!(s?.bannerItems || []).includes(BANNER)) out.push(change(`ticker: add "${BANNER}"`,
    () => SiteSettings.updateOne({ _id: 'global' }, { $push: { bannerItems: { $each: [BANNER], $position: 0 } } }, { upsert: true })));
  return out;
}

/* ── 8. President's speeches ────────────────────────────────────────────── */
async function speeches() {
  const out = [];
  const p = await President.findOne({ _singleton: 'president' });
  if (!p) { skip('speeches', 'no President record'); return out; }
  const have = new Set((p.speeches || []).map(s => s.title));
  for (const s of data('presidentSpeechesOct2026.json')) {
    if (have.has(s.title)) continue;
    out.push(change(`add speech: ${s.title} (${s.date})`, () => President.updateOne({ _id: p._id },
      { $push: { speeches: { ...s, date: new Date(`${s.date}T12:00:00+01:00`) } } })));
  }
  return out;
}

(async () => {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 20000 });
  console.log(`Connected to MongoDB. ${APPLY ? 'APPLYING changes.' : 'Dry run — nothing will be written.'}`);

  const steps = [
    ['contacts', '1 Contact details', contacts],
    ['chapters', '2 Chapters', chapters],
    ['exco', '3 Chapter executives', chapterExco],
    ['bot', '4 Board of Trustees', trustees],
    ['npc', '5 National Policy Committee', npc],
    ['past-presidents', '6 Past presidents', pastPresidents],
    ['events', '7 Events and announcement', events],
    ['speeches', "8 President's speeches", speeches],
  ].filter(([id]) => !ONLY.length || ONLY.includes(id));

  let total = 0;
  for (const [, title, plan] of steps) {
    const changes = await plan();
    console.log(`\n${title}: ${changes.length ? `${changes.length} change(s)` : 'no changes'}`);
    for (const c of changes) {
      console.log(`  - ${c.label}`);
      if (APPLY) await c.run();
    }
    total += changes.length;
  }

  if (skipped.length) {
    console.log(`\nSkipped / needs attention (${skipped.length}):`);
    for (const s of skipped) console.log(`  ! ${s}`);
  }
  console.log(`\n${total} change(s) ${APPLY ? 'applied' : 'pending — re-run with --apply to write'}.`);
  await mongoose.disconnect();
})().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
