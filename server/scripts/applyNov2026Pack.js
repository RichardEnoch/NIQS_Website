/**
 * Applies the corrections and material NIQS sent on 4 Nov 2026 (Gloria
 * Ifiorah's email and the Drive folder MATERIAL - BATCH 2).
 *
 *   names     restores the first names the October pack cut to initials,
 *             adds QS for Niger, removes it for two Ogun members, and sets a
 *             display override (shortName) on records stored surname first,
 *             so every card reads "first name, initial, surname, post-nominal"
 *             under the November rule in client/src/utils/names.js
 *   rosters   the new Kaduna, Oyo and Osun executives; seats not on the new
 *             roster are hidden (isActive false), never deleted
 *   profiles  the second batch of chapter profiles (22 chapters) and the
 *             Kaduna secretariat's address, phone and email
 *   portraits normalised portraits (normalizePortraits.py, u2net_human_seg)
 *             onto the records listed in data/nov2026Pack.json
 *   qsconnect the QS Connect editions, 2020 to 2026, PDFs to S3/CloudFront
 *
 * Data: scripts/data/nov2026Pack.json and chapterProfilesNov2026.json. Every
 * filter must match exactly one record; anything else is skipped and listed.
 * Every write is computed from the current record, so a second run reports
 * no changes. Dry run by default; the names section prints an old -> new
 * display table so it can be read before --apply.
 *
 * Usage (from the server folder):
 *   node scripts/applyNov2026Pack.js [--pack=<file>] [--only=names,rosters] [--portraits=<dir>] [--qsconnect=<dir>] [--apply]
 *   --pack       a later pack in the same shape (default data/nov2026Pack.json)
 *   --portraits  folder of <group>/<slug>.jpg (the normalised set)
 *   --qsconnect  folder of <year>/<file>.pdf plus covers/<file>.jpg
 *   --table=<f>  also write the full name table (every leader record) as TSV
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { storeBuffer } = require('../utils/storage');

const Chapter = require('../models/Chapter');
const Exco = require('../models/Exco');
const PastPresident = require('../models/PastPresident');
const QSConnect = require('../models/QSConnect');

const arg = (k) => (process.argv.find(a => a.startsWith(`--${k}=`)) || '').slice(k.length + 3);
const APPLY = process.argv.includes('--apply');
const ONLY = arg('only').split(',').filter(Boolean);
const PORTRAITS = arg('portraits');
const QSC_DIR = arg('qsconnect');
const TABLE = arg('table');
const want = (s) => !ONLY.length || ONLY.includes(s);

// --pack=<file> runs a later pack in the same shape (e.g. data/nov2026Pack6Nov.json,
// the Secretariat's reply of 6 Nov); sections a pack does not carry are empty.
const pack = { renames: [], addQS: [], displayOverrides: [], retitles: [], rosters: {}, portraits: [], chapterContacts: {},
  ...require(arg('pack') ? path.resolve(arg('pack')) : './data/nov2026Pack.json') };
const profiles = require('./data/chapterProfilesNov2026.json');
const MODELS = { Exco, PastPresident };

const skipped = [];
const changes = [];
const change = (label, run) => changes.push({ label, run });
const skip = (s, why) => skipped.push(`[${s}] ${why}`);

async function upload(file) {
  const buffer = fs.readFileSync(file);
  const ext = path.extname(file).toLowerCase();
  const mimetype = ext === '.pdf' ? 'application/pdf' : 'image/jpeg';
  const r = await storeBuffer({ buffer, originalname: path.basename(file), mimetype, size: buffer.length });
  if (r.storage === 'local') throw new Error(`${file} fell back to local disk; set CLOUDINARY_* / S3_BUCKET`);
  return r.url;
}

/* The November display rule, mirrored from client/src/utils/names.js so the
   table shows what the site will show. Kept small on purpose: titles, then
   first given name, initials of the rest, surname (or the single hyphenated
   word), post-nominals after a comma. */
const PREFIXES = ['high chief', 'qs', 'surv', 'dr', 'prof', 'engr', 'arc', 'arch', 'chief', 'alhaji', 'alhaja', 'hajiya', 'hajia',
  'mallam', 'malam', 'mrs', 'mr', 'ms', 'miss', 'barr', 'sir', 'hon', 'pastor', 'rev', 'otunba', 'oba', 'hrh', 'dame', 'lady',
  'elder', 'deacon', 'deaconess', 'comrade', 'amb'];
const SHOWN = ['qs', 'surv', 'dr', 'prof', 'engr', 'arc', 'arch', 'barr'];
const bare = (w) => w.replace(/\.$/, '').toLowerCase();
const isInitial = (w) => /^[A-Za-z]\.?$/.test(w) || /^([A-Za-z]\.)+$/.test(w);
function display(full, { override, drop = [] } = {}) {
  if (override && override.trim()) return override.trim();
  const [namePart, ...post] = String(full || '').split(',');
  const words = namePart.trim().split(/\s+/).filter(Boolean);
  const titles = [];
  while (words.length) {
    const two = words.length > 1 ? bare(`${words[0]} ${words[1]}`) : null;
    if (two && PREFIXES.includes(two)) { titles.push(words.shift(), words.shift()); continue; }
    if (PREFIXES.includes(bare(words[0]))) { titles.push(words.shift()); continue; }
    break;
  }
  if (!words.length) return String(full || '').trim();
  const hy = words.filter(w => w.includes('-'));
  const sAt = hy.length === 1 ? words.indexOf(hy[0]) : words.length - 1;
  const given = words.filter((_, i) => i !== sAt);
  const fAt = given.findIndex(w => !isInitial(w));
  const inits = given.filter((_, i) => i !== fAt).map(w => (isInitial(w) ? (w.endsWith('.') ? w : `${w}.`) : `${w[0].toUpperCase()}.`));
  const shown = [...(fAt >= 0 ? [given[fAt]] : []), ...inits, words[sAt]];
  const posts = post.join(',').split(',').map(s => s.trim()).filter(Boolean).filter(p => !drop.map(d => d.toLowerCase()).includes(p.toLowerCase()));
  const name = [...titles.filter(w => SHOWN.includes(bare(w))), ...shown].join(' ');
  return posts.length ? `${name}, ${posts.join(', ')}` : name;
}

/* ── names ─────────────────────────────────────────────────────────────── */
async function names() {
  const all = await Exco.find({ isActive: true });
  const next = new Map(all.map(r => [String(r._id), { name: r.name, shortName: r.shortName || '' }]));
  const pick = (f, nameKey) => all.filter(r => r.scope === f.scope
    && (!f.state || r.state === f.state) && (!f.title || r.title === f.title)
    && next.get(String(r._id))[nameKey] === (nameKey === 'name' ? (f.from ?? f.name) : f.name));

  for (const f of pack.renames) {
    const hits = pick(f, 'name');
    if (!hits.length && pick({ ...f, from: f.to }, 'name').length === 1) continue;   // already applied
    if (hits.length !== 1) { skip('names', `rename "${f.from}" (${f.scope} ${f.state || f.title || ''}) matched ${hits.length}`); continue; }
    next.get(String(hits[0]._id)).name = f.to;
  }
  for (const f of pack.addQS) {
    for (const r of all.filter(x => x.scope === f.scope && x.state === f.state)) {
      const n = next.get(String(r._id));
      if (!/^QS\b/.test(n.name)) n.name = `QS ${n.name.replace(/^(Mr|Mrs|Ms|Miss)\.?\s+/, '')}`;
    }
  }
  for (const f of pack.retitles) {
    const hits = all.filter(r => r.scope === f.scope && (!f.state || r.state === f.state) && r.title === f.from);
    if (!hits.length && all.some(r => r.scope === f.scope && (!f.state || r.state === f.state) && r.title === f.to)) continue;   // already applied
    if (hits.length !== 1) { skip('names', `retitle "${f.from}" (${f.scope} ${f.state || ''}) matched ${hits.length}`); continue; }
    console.log(`  title  ${(f.state || f.scope).padEnd(16)} ${f.from} -> ${f.to}`);
    change(`exco ${hits[0]._id}: title ${f.to}`, () => Exco.updateOne({ _id: hits[0]._id }, { $set: { title: f.to } }));
  }
  for (const f of pack.displayOverrides) {
    const hits = all.filter(r => r.scope === f.scope && (!f.state || r.state === f.state) && next.get(String(r._id)).name === f.name);
    if (hits.length !== 1) { skip('names', `override "${f.name}" (${f.scope} ${f.state || ''}) matched ${hits.length}`); continue; }
    next.get(String(hits[0]._id)).shortName = f.shortName;
  }

  console.log('\nName changes (old display -> new display):');
  const rows = [];
  for (const r of all) {
    const n = next.get(String(r._id));
    const before = r.name; const was = r.shortName || '';
    const changed = n.name !== before || n.shortName !== was;
    if (changed) {
      console.log(`  ${(r.state || r.scope).padEnd(16)} ${r.title.slice(0, 30).padEnd(30)} ${before}${was ? ` [${was}]` : ''}  ->  ${display(n.name, { override: n.shortName })}`);
      const set = {};
      if (n.name !== before) set.name = n.name;
      if (n.shortName !== was) set.shortName = n.shortName;
      change(`exco ${r._id}: ${JSON.stringify(set)}`, () => Exco.updateOne({ _id: r._id }, { $set: set }));
    }
    rows.push([r.scope, r.state || '', r.title, before, display(before, { override: was }).replace(/^(.*)$/, '$1'), display(n.name, { override: n.shortName })]);
  }
  if (TABLE) {
    const pp = await PastPresident.find();
    for (const p of pp) rows.push(['pastpres', '', '', p.name, display(p.name, { override: p.shortName, drop: ['PPNIQS'] }), display(p.name, { override: p.shortName, drop: ['PPNIQS'] })]);
    fs.writeFileSync(TABLE, ['scope\tstate\ttitle\trecord\tshown before (Nov rule, no fixes)\tshown after'].concat(rows.map(r => r.join('\t'))).join('\n'));
    console.log(`  full table written to ${TABLE}`);
  }
}

/* ── rosters ───────────────────────────────────────────────────────────── */
async function rosters() {
  for (const [chapterName, ro] of Object.entries(pack.rosters)) {
    const chs = await Chapter.find({ name: chapterName });
    if (chs.length !== 1) { skip('rosters', `${chapterName} matched ${chs.length}`); continue; }
    const ch = chs[0];
    const current = await Exco.find({ scope: 'chapter', chapter: ch._id });
    const keep = new Set();
    console.log(`\n${chapterName}: ${ro.members.length} executives (${ro.basis})`);
    for (const [i, [slug, name, title, shortName]] of ro.members.entries()) {
      const order = i + 1;
      const file = PORTRAITS ? path.join(PORTRAITS, ro.group, `${slug}.jpg`) : '';
      const hasPhoto = file && fs.existsSync(file);
      if (PORTRAITS && !hasPhoto) skip('rosters', `${chapterName}: no portrait ${ro.group}/${slug}.jpg`);
      const same = current.filter(r => r.title === title);
      if (same.length > 1) { skip('rosters', `${chapterName} "${title}" has ${same.length} records`); continue; }
      const rec = same[0];
      if (rec) keep.add(String(rec._id));
      const set = { name, shortName, order, isActive: true, state: ro.state };
      const diff = rec ? Object.keys(set).filter(k => String(rec[k] ?? '') !== String(set[k])) : Object.keys(set);
      console.log(`  ${String(order).padStart(2)} ${title.padEnd(32)} ${rec ? (rec.name === name ? '=' : `${rec.name} ->`) : '+'} ${name}${shortName ? `  [shown: ${shortName}]` : ''}${hasPhoto ? '' : '  (no photo)'}`);
      if (!diff.length && !hasPhoto) continue;
      change(`${chapterName} ${title}: ${name}`, async () => {
        const image = hasPhoto ? await upload(file) : undefined;
        const doc = { ...set, ...(image ? { image } : {}) };
        if (rec) await Exco.updateOne({ _id: rec._id }, { $set: doc });
        else await Exco.create({ ...doc, title, scope: 'chapter', chapter: ch._id });
      });
    }
    for (const r of current) {
      if (keep.has(String(r._id)) || !r.isActive) continue;
      console.log(`   - hide ${r.title}: ${r.name} (not on the new roster)`);
      change(`${chapterName}: hide ${r.title} ${r.name}`, () => Exco.updateOne({ _id: r._id }, { $set: { isActive: false } }));
    }
    const chair = ro.members.find(m => /chair(man|person)$/i.test(m[2]));
    const sec = ro.members.find(m => /^general secretary$/i.test(m[2]));
    const cset = {};
    if (chair && ch.chairperson !== chair[1]) cset.chairperson = chair[1];
    if (sec && ch.secretary !== sec[1]) cset.secretary = sec[1];
    if (Object.keys(cset).length) change(`${chapterName}: ${JSON.stringify(cset)}`, () => Chapter.updateOne({ _id: ch._id }, { $set: cset }));
  }
}

/* ── profiles ──────────────────────────────────────────────────────────── */
async function chapterProfiles() {
  for (const [key, about] of Object.entries(profiles)) {
    const chs = await Chapter.find({ name: `${key} Chapter` });
    if (chs.length !== 1) { skip('profiles', `"${key} Chapter" matched ${chs.length}`); continue; }
    if ((chs[0].about || '').trim() === about.trim()) continue;
    console.log(`  profile: ${key} Chapter (${about.length} chars)`);
    change(`profile ${key}`, () => Chapter.updateOne({ _id: chs[0]._id }, { $set: { about } }));
  }
  for (const [name, c] of Object.entries(pack.chapterContacts)) {
    const chs = await Chapter.find({ name });
    if (chs.length !== 1) { skip('profiles', `${name} matched ${chs.length}`); continue; }
    const set = {};
    for (const k of ['address', 'phone', 'email']) if ((chs[0][k] || '') !== c[k]) set[k] = c[k];
    if (Object.keys(set).length) {
      console.log(`  contacts: ${name} ${JSON.stringify(set)}`);
      change(`contacts ${name}`, () => Chapter.updateOne({ _id: chs[0]._id }, { $set: set }));
    }
  }
}

/* ── portraits ─────────────────────────────────────────────────────────── */
async function portraits() {
  if (!PORTRAITS) { skip('portraits', 'no --portraits=<dir>; skipped'); return; }
  for (const p of pack.portraits) {
    const file = path.join(PORTRAITS, p.file);
    if (!fs.existsSync(file)) { skip('portraits', `missing ${p.file}`); continue; }
    const found = await MODELS[p.model].find(p.filter);
    if (found.length !== 1) { skip('portraits', `${p.file}: ${JSON.stringify(p.filter)} matched ${found.length}`); continue; }
    console.log(`  portrait ${p.file} -> ${found[0].name}${found[0].title ? ` (${found[0].title})` : ''}`);
    change(`portrait ${p.file}`, async () => {
      const url = await upload(file);
      await MODELS[p.model].updateOne({ _id: found[0]._id }, { $set: { image: url } });
    });
  }
}

/* ── QS Connect ────────────────────────────────────────────────────────── */
async function qsconnect() {
  if (!QSC_DIR) { skip('qsconnect', 'no --qsconnect=<dir>; skipped'); return; }
  const files = [];
  for (const y of fs.readdirSync(QSC_DIR).filter(d => /^\d{4}$/.test(d))) {
    for (const f of fs.readdirSync(path.join(QSC_DIR, y)).filter(f => /\.pdf$/i.test(f))) files.push({ year: y, f });
  }
  for (const { year, f } of files) {
    const m = f.match(/VOL\.?\s*([\d.]+)/i);
    if (!m) { skip('qsconnect', `no volume in "${f}"`); continue; }
    const volume = m[1].replace(/\.$/, '');
    const title = `QS Connect Vol. ${volume}`;
    const existing = await QSConnect.find({ volume });
    if (existing.length > 1) { skip('qsconnect', `${title} has ${existing.length} records`); continue; }
    if (existing.length === 1 && existing[0].fileUrl) continue;
    const pdf = path.join(QSC_DIR, year, f);
    const cover = path.join(QSC_DIR, 'covers', f.replace(/\.pdf$/i, '.jpg'));
    const [maj, min] = volume.split('.').map(Number);
    console.log(`  QS Connect ${volume} (${year}) ${(fs.statSync(pdf).size / 1048576).toFixed(1)} MB${fs.existsSync(cover) ? ' + cover' : ''}`);
    change(`QS Connect ${volume}`, async () => {
      const fileUrl = await upload(pdf);
      const coverImage = fs.existsSync(cover) ? await upload(cover) : '';
      const doc = { title, volume, issueDate: year, fileUrl, coverImage, fileSize: fs.statSync(pdf).size, isPublished: true, sortOrder: -(maj * 100 + (min || 0)) };
      if (existing.length) await QSConnect.updateOne({ _id: existing[0]._id }, { $set: doc });
      else await QSConnect.create(doc);
    });
  }
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 20000 });
  const host = mongoose.connection.host;
  console.log(`${APPLY ? 'APPLYING to' : 'Dry run against'} ${host}/${mongoose.connection.name}`);
  if (want('names')) await names();
  if (want('rosters')) await rosters();
  if (want('profiles')) { console.log('\nChapter profiles:'); await chapterProfiles(); }
  if (want('portraits')) { console.log('\nPortraits:'); await portraits(); }
  if (want('qsconnect')) { console.log('\nQS Connect:'); await qsconnect(); }

  console.log(`\n${changes.length} change(s)${APPLY ? '' : ' (dry run; pass --apply to write)'}`);
  if (APPLY) {
    for (const c of changes) {
      try { await c.run(); } catch (e) { skip('apply', `${c.label}: ${e.message}`); }
    }
    console.log('applied');
  }
  if (skipped.length) { console.log(`\nSkipped (${skipped.length}):`); skipped.forEach(s => console.log(`  ${s}`)); }
  await mongoose.disconnect();
}

main().catch(async (e) => { console.error(e); await mongoose.disconnect().catch(() => {}); process.exit(1); });
