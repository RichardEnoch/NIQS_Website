/**
 * Builds the "Outstanding Portraits" document — the standing ask to the chapters,
 * listing every officer on the site who still has no photograph.
 *
 * Reads live data, so it is always current: run it, render it, send it. The
 * secretariat asks for this after each round of packs arrives, and hand-keeping
 * a list of 35 chapters against a database that changes weekly does not work.
 *
 * Writes branded HTML into docs/pdf-source; render.js turns that into the PDF:
 *
 *   node scripts/buildOutstandingPortraits.js
 *   cd ../docs/pdf-source && node render.js outstanding-portraits.html \
 *       ../../client/public/documents/niqs-outstanding-portraits.pdf "Outstanding Portraits"
 *
 * That output path is the one the site serves and the admin dashboard links to,
 * so rendering anywhere else leaves the Secretariat downloading a stale list.
 * The PDF ships with the client build — regenerating it needs a deploy to reach
 * them, which is why the dashboard shows its own live count beside the link
 * rather than relying on the number printed in the document.
 *
 * The photo spec near the top is not decoration. Full-length shots, group
 * photos and screenshots of designed posters are what produced every portrait
 * on the site that had to be fixed by hand — Katsina's poster crops and
 * Nasarawa's phone photos both. Saying so up front is cheaper than redoing it.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const OUT = path.join(__dirname, '..', '..', 'docs', 'pdf-source', 'outstanding-portraits.html');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

/* Items that are not "a missing photograph" but still need a chapter to reply.
   Kept here rather than derived, because each one is a question someone asked
   and nobody has answered yet. Delete an entry once it is settled. */
const QUERIES = [
  ['Anambra Chapter', 'The Deputy Chairman is published as the chapter wrote him, '
    + 'QS Chukwuemerie Emmanuel Okechukwu, MNIQS. The Chapter Chairmen List on file names '
    + 'QS Emmanuel Okechukwu Nwankwo for that seat: the given names match but the surname does '
    + 'not, so this is either a different person or a correction the list never received. '
    + 'Please confirm which is right.'],
  ['Plateau Chapter', 'Two portraits are on the site as initials rather than photographs. '
    + 'The Public Relations Officer, QS Nentawe Gobur, MNIQS, was sent as a photograph of a '
    + 'printed photograph and cannot be separated from its background - it comes out as a '
    + 'rectangle with the original backing still attached. The Treasurer, QS Panmwa Gupai, '
    + 'MNIQS, is a good likeness, but the pattern on her top breaks up badly along the bottom '
    + 'edge. Original photographs for both would let them match the rest of the chapter.'],
  ['Plateau Chapter', 'The Financial Secretary is published as Abdulwahab Nasirdeen Garba, '
    + 'exactly as the pack captioned him - the only member of the roster carrying neither QS '
    + 'nor a post-nominal, where every other officer has both. Please confirm whether that is '
    + 'correct or whether they were omitted in error. His photograph also arrived as a PDF '
    + 'scan rather than an image file; it has been used, but a plain photograph is easier.'],
  ['Imo Chapter', 'The executive list is published, but none of the nine photographs could be '
    + 'used, for two reasons. They are about 250 x 320 pixels, roughly a quarter of the size '
    + 'the cards need. More importantly, the Word document does not say which photograph '
    + 'belongs to which officer - the pictures are grouped in ones, twos and fours while the '
    + 'names are listed in threes, so they cannot be matched up with any confidence, and we '
    + 'will not guess at whose face is whose. Please resend the photographs as separate files, '
    + 'each named for the officer, at full size.'],
  ['Imo Chapter', 'Two entries are published exactly as supplied and may need correcting: the '
    + 'Treasurer as QS Egbujor Jane, MNQIS (MNIQS?), and the sixth seat titled SPDL, which we '
    + 'have left as written rather than guess at the full title. Please confirm both.'],
  ['Ekiti Chapter', 'The eight photographs in the chapter pack are between 204x286 and 386x386 '
    + 'pixels, which is roughly a quarter of the resolution the cards need — every face would have '
    + 'to be enlarged three to four times and would look soft beside the other chapters. The roster '
    + 'is published; the portraits are held. Please resend the original photographs at full size.'],
  ['Ekiti Chapter', 'Two names are published exactly as the chapter captioned them and both look '
    + 'incomplete: the Assistant General Secretary as QS Kolawole Sunday Benjami (Benjamin?), and '
    + 'the Research & Development Secretary as QS Adebayo B. O, with initials only. Please confirm '
    + 'or send the full spellings.'],
  ['Sokoto Chapter', 'The pack was sent captioned "KEBBI-SOKOTO CHAPTER" but the roster is the Sokoto one '
    + '(the Chairman and Deputy Chairman are the two already on record for Sokoto), and it has been '
    + 'published there. The Kebbi chapter page is still empty. Does Kebbi share this executive, or '
    + 'is its own roster still to come?'],
  ['Sokoto Chapter', 'The Public Relations Officer is captioned Rilwanu Bello, FNIQS — with the '
    + 'post-nominal of a Fellow but without the QS every other member of the roster carries. '
    + 'Published exactly as supplied. Please confirm whether the QS belongs there.'],
  ['FCT Chapter', 'Is Abdulrafiu Abdullahi, the chapter\'s YQSF Coordinator, the same person as '
    + 'Abdulrafiu Ibrahim on the YQSF Executive Council? No photograph came with the FCT pack for him.'],
  ['FCT Chapter', 'Three names differ between the senate roster document and the photo captions. '
    + 'Published as QS Ahmed Usman Kankia, FNIQS (roster spelt it Kankika); QS Uzoamaka Okobia, MNIQS '
    + '(roster had Uzor Amaka); QS Mary B. Gowom, FNIQS (caption said Gowon). Please confirm each.'],
  ['Katsina Chapter', 'QS Maryam Mua\'azu and QS Sadiya Sani Yar\'Adua are on the site, but their '
    + 'images were cut from the chapter senate poster and cannot be separated from the background '
    + 'cleanly. Original photographs would let them match the rest of the chapter.'],
  ['Rivers Chapter', 'Two files in the chapter pack are the same photograph, byte for byte — the one '
    + 'captioned QS Mercy Adesayo Omotayo, MNIQS (Financial Secretary) and the one captioned '
    + 'Ms Izidor Smith Nwachukwu (YQSF Coordinator). Rather than guess whose face it is, neither '
    + 'card carries it. Please resend both, and confirm which of the two the shared photograph is.'],
  ['Rivers Chapter', 'QS Tochukwu Blessed, MNIQS (Research & Development Secretary) is cropped to the '
    + 'head and upper chest, which leaves nothing of the suit to work with. A photograph taken from '
    + 'the waist up would let his card match the rest of the chapter.'],
  ['Bayelsa Chapter', 'The chapter\'s pack names QS Larry Samuel Agorosor, MNIQS as Deputy Chairman, '
    + 'and the site now says so. The committee\'s Chapter Chairmen List (July 2026) had QS Enize '
    + 'Fidelis Kenigbolo in that office and he is not in the pack at all. Please confirm the change.'],
  ['Bayelsa Chapter', 'The chairman is published as QS Amangala Mabel Morris, FNIQS, the order her '
    + 'own chapter uses; the committee\'s list has QS Mabel Morris Amangala, FNIQS. Which does she use?'],
  ['Ondo Chapter', 'The pack has an Ex-Officio II but no Ex-Officio I, and the site says Ex-Officio II '
    + 'rather than quietly renumbering it. Is there a twelfth officer whose photograph did not come, '
    + 'or is QS Aina Olanrewaju, MNIQS the only one?'],
  ['Ondo Chapter', 'Names are published surname-first throughout, the order the chapter\'s own pack '
    + 'uses; the committee\'s list has the chairman as QS Akinlolu Oyebobola Fadiyimu, FNIQS. Please '
    + 'confirm the order the chapter prefers.'],
  ['Ondo Chapter', 'QS Gbadebo Bunmi, MNIQS (Assistant General Secretary) came as a 413px-wide image '
    + 'already cut out onto white, with the edge of a chair left in it. Her card is softer than the '
    + 'rest of the chapter as a result — the full-size original photograph would fix it.'],
];

const CSS = `
  :root{ --navy:#0B1F4B; --navy2:#132660; --navy3:#1a3280; --gold:#C9974A; --goldl:#EBC87A;
    --goldxl:#f6efe0; --ink:#1c2532; --muted:#5b6573; --muted2:#8a93a3; --line:#e3e7ee;
    --soft:#f6f8fb; --green:#1a7f4b; --greenbg:#e6f4ec; --greenbd:#b8e0c8;
    --amber:#b45309; --amberbg:#fdf3e3; --amberbd:#f0d8a8; --red:#b91c1c; --redbg:#fbe9e9; --redbd:#f3c9c9; }
  *{ box-sizing:border-box; }
  html{ -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  body{ font-family:"Segoe UI","Helvetica Neue",Arial,sans-serif; color:var(--ink);
    font-size:9.4pt; line-height:1.6; margin:0; background:#fff; }
  h1,h2,h3{ font-weight:700; color:var(--navy); margin:0; line-height:1.25; }
  p{ margin:0 0 7pt; }
  .cover{ height:247mm; display:flex; flex-direction:column; break-after:page; }
  .cover-band{ background:var(--navy); color:#fff; padding:9pt 14pt; display:flex;
    justify-content:space-between; align-items:center; border-bottom:3px solid var(--gold); }
  .cover-band .l{ font-weight:800; letter-spacing:.16em; font-size:9pt; }
  .cover-band .l b{ color:var(--gold); }
  .cover-band .r{ font-size:6.6pt; letter-spacing:.14em; color:var(--goldl); font-weight:700; text-transform:uppercase; }
  .cover-body{ flex:1; display:flex; flex-direction:column; align-items:center; text-align:center;
    padding:0 24pt; justify-content:center; }
  .crest{ width:128px; height:auto; margin-bottom:14pt; }
  .inst{ font-size:11pt; font-weight:700; color:var(--navy); letter-spacing:.04em; }
  .inst-sub{ font-size:7.6pt; color:var(--muted); letter-spacing:.22em; text-transform:uppercase; margin-top:2pt; }
  .rule{ width:64px; height:3px; background:var(--gold); border-radius:2px; margin:20pt auto 18pt; }
  .doc-kicker{ font-size:8pt; font-weight:800; letter-spacing:.26em; text-transform:uppercase;
    color:var(--gold); margin-bottom:9pt; }
  .doc-title{ font-size:26pt; line-height:1.12; color:var(--navy); letter-spacing:-.01em; max-width:430pt; }
  .doc-subtitle{ font-size:11pt; color:var(--muted); font-weight:500; margin-top:11pt; max-width:390pt; line-height:1.5; }
  .meta-grid{ display:grid; grid-template-columns:repeat(4,1fr); width:100%; max-width:470pt;
    margin-top:30pt; border:1px solid var(--line); border-radius:7px; overflow:hidden; }
  .meta-cell{ padding:9pt 11pt; border-right:1px solid var(--line); text-align:left; }
  .meta-cell:last-child{ border-right:none; }
  .meta-cell .k{ font-size:6.4pt; letter-spacing:.14em; text-transform:uppercase; color:var(--muted2); font-weight:700; }
  .meta-cell .v{ font-size:9pt; font-weight:700; color:var(--navy); margin-top:3pt; }
  .cover-foot{ background:var(--soft); border-top:1px solid var(--line); padding:8pt 14pt;
    font-size:7.2pt; color:var(--muted); text-align:center; }
  .cover-foot b{ color:var(--navy); }
  section{ padding:0 2pt; }
  .pb{ break-before:page; }
  h1.sec{ font-size:15pt; padding-bottom:6pt; margin:0 0 11pt; border-bottom:2px solid var(--gold);
    display:flex; align-items:baseline; gap:9pt; }
  h1.sec .n{ color:var(--gold); font-size:13pt; }
  .lead{ font-size:9.6pt; color:#3a4555; margin-bottom:10pt; }
  table.tbl{ width:100%; border-collapse:collapse; margin:6pt 0 11pt; font-size:8.5pt; }
  table.tbl th{ background:var(--navy); color:#fff; text-align:left; padding:5.5pt 7pt; font-weight:600;
    font-size:7.6pt; letter-spacing:.03em; border:1px solid var(--navy); }
  table.tbl td{ padding:5pt 7pt; border:1px solid var(--line); vertical-align:top; }
  table.tbl tr{ break-inside:avoid; }
  table.tbl tbody tr:nth-child(even) td{ background:#fbfcfe; }
  .chap{ font-weight:700; color:var(--navy); white-space:nowrap; }
  .rag{ display:inline-block; font-size:6.8pt; font-weight:800; letter-spacing:.05em; text-transform:uppercase;
    padding:2pt 7pt; border-radius:20px; white-space:nowrap; }
  .rag.g{ background:var(--greenbg); color:var(--green); border:1px solid var(--greenbd); }
  .rag.a{ background:var(--amberbg); color:var(--amber); border:1px solid var(--amberbd); }
  .rag.r{ background:var(--redbg); color:var(--red); border:1px solid var(--redbd); }
  .box{ border:1px solid var(--line); border-left:4px solid var(--gold); background:#fffdf8;
    border-radius:6px; padding:8pt 11pt; margin:8pt 0 11pt; font-size:8.8pt; break-inside:avoid; }
  .box.navy{ border-left-color:var(--navy); background:var(--soft); }
  .box .bt{ font-weight:800; color:var(--navy); font-size:8.6pt; margin-bottom:3pt; }
  ul{ margin:0 0 8pt; padding-left:16pt; } li{ margin-bottom:3.5pt; }
  ul.tight{ margin:0; padding-left:13pt; } ul.tight li{ margin-bottom:2pt; }
  .stat-row{ display:grid; grid-template-columns:repeat(4,1fr); gap:8pt; margin:4pt 0 14pt; }
  .stat{ border:1px solid var(--line); border-radius:7px; padding:9pt 11pt; background:var(--soft); }
  .stat .n{ font-size:19pt; font-weight:800; color:var(--navy); line-height:1.1; }
  .stat .l{ font-size:7pt; letter-spacing:.1em; text-transform:uppercase; color:var(--muted2); font-weight:700; margin-top:3pt; }
  .muted{ color:var(--muted); } .small{ font-size:8pt; }
`;

(async () => {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 20000 });
  const db = mongoose.connection.db;

  const chapters = await db.collection('chapters').find({}).sort({ name: 1 }).toArray();
  const rows = [];
  for (const c of chapters) {
    const ex = await db.collection('excos')
      .find({ scope: 'chapter', chapter: c._id }).sort({ order: 1 }).toArray();
    rows.push({
      name: c.name,
      published: !!c.about,
      total: ex.length,
      missing: ex.filter(e => !e.image).map(e => ({ title: e.title, name: e.name })),
    });
  }

  const nec = (await db.collection('excos').find({ scope: 'national' }).sort({ order: 1 }).toArray())
    .filter(e => !e.image).map(e => ({ title: e.title, name: e.name }));

  const totalImages = await db.collection('excos').countDocuments({ image: { $exists: true, $ne: '' } })
    + await db.collection('pastpresidents').countDocuments({ image: { $exists: true, $ne: '' } })
    + await db.collection('chapters').countDocuments({ image: { $exists: true, $ne: '' } })
    + await db.collection('presidents').countDocuments({ image: { $exists: true, $ne: '' } });

  const published = rows.filter(r => r.published);
  const pending = rows.filter(r => !r.published);
  const missingCount = rows.reduce((n, r) => n + r.missing.length, 0) + nec.length;

  const now = new Date();
  const dateStr = `${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;

  const officerList = (missing) => missing.length
    ? `<ul class="tight">${missing.map(m => `<li><b>${esc(m.title)}</b> — ${esc(m.name)}</li>`).join('')}</ul>`
    : '<span class="muted small">None — every officer on this page has a photograph.</span>';

  const pubRows = published.map(r => `
      <tr>
        <td class="chap">${esc(r.name)}</td>
        <td>${r.missing.length ? '<span class="rag a">' + r.missing.length + ' outstanding</span>'
    : '<span class="rag g">Complete</span>'}</td>
        <td>${officerList(r.missing)}</td>
      </tr>`).join('');

  const pendRows = pending.map(r => `
      <tr>
        <td class="chap">${esc(r.name)}</td>
        <td>${r.missing.length === 0 ? '<span class="rag a">Roster only</span>'
    : '<span class="rag r">' + r.missing.length + ' + roster</span>'}</td>
        <td>${r.missing.length
      ? officerList(r.missing)
      : '<span class="muted small">Chairman and deputy photographs held. The full executive list is still needed.</span>'}</td>
      </tr>`).join('');

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<title>NIQS Website — Outstanding Portraits</title>
<style>${CSS}</style></head>
<body>

<div class="cover">
  <div class="cover-band">
    <div class="l">ADLM<b>·</b>STUDIO</div>
    <div class="r">For NIQS Secretariat &amp; State Chapters</div>
  </div>
  <div class="cover-body">
    <img class="crest" src="__LOGO_DATA_URI__" alt="NIQS crest">
    <div class="inst">Nigerian Institute of Quantity Surveyors</div>
    <div class="inst-sub">Official Website</div>
    <div class="rule"></div>
    <div class="doc-kicker">Outstanding Portraits</div>
    <h1 class="doc-title">Photographs Still Needed for the Website</h1>
    <div class="doc-subtitle">
      Every officer currently published without a photograph, listed chapter by chapter —
      together with the photo standard that lets a portrait go on the site unaltered.
    </div>
    <div class="meta-grid">
      <div class="meta-cell"><div class="k">Prepared by</div><div class="v">ADLM Studio</div></div>
      <div class="meta-cell"><div class="k">Portraits live</div><div class="v">${totalImages}</div></div>
      <div class="meta-cell"><div class="k">Still needed</div><div class="v">${missingCount}</div></div>
      <div class="meta-cell"><div class="k">As at</div><div class="v">${dateStr}</div></div>
    </div>
  </div>
  <div class="cover-foot">
    <b>Send to:</b> the NIQS Portal &amp; Web Page Implementation team &nbsp;·&nbsp;
    <b>Site:</b> niqs.org.ng
  </div>
</div>

<section>
  <h1 class="sec"><span class="n">1</span> What to send</h1>
  <p class="lead">
    The website now carries ${totalImages} portraits, every one placed to the same standard so that a
    page of them reads as one set. ${missingCount} officers are still without a photograph and appear
    on the site as their initials.
  </p>

  <div class="stat-row">
    <div class="stat"><div class="n">${totalImages}</div><div class="l">Portraits published</div></div>
    <div class="stat"><div class="n">${missingCount}</div><div class="l">Still needed</div></div>
    <div class="stat"><div class="n">${published.length}</div><div class="l">Chapters fully published</div></div>
    <div class="stat"><div class="n">${pending.length}</div><div class="l">Chapters awaiting a pack</div></div>
  </div>

  <div class="box">
    <div class="bt">Photo standard</div>
    <ul class="tight">
      <li><b>Head and shoulders</b>, subject facing the camera, head roughly filling the upper third.</li>
      <li><b>A plain wall behind the subject</b> is ideal — any single flat colour.</li>
      <li>One person in the frame. A colleague standing behind gets cut out with them.</li>
      <li>Portrait orientation, as large a file as you have. Straight from the phone is fine.</li>
    </ul>
  </div>

  <div class="box warn" style="border-left-color:#b91c1c;background:#fbe9e9;">
    <div class="bt" style="color:#b91c1c;">What cannot be used</div>
    <p style="margin:0;">
      Full-length photographs, group shots, and screenshots or exports of a designed poster. These have
      to be cropped down to a head, which leaves too few pixels for the card and often cannot be
      separated from the background at all. Two chapters have already had to be redone for this reason,
      and a handful of portraits still cannot be brought fully into line.
    </p>
  </div>

  <p class="small muted">
    Names and offices below are exactly as each chapter supplied them. If any is wrong, please correct
    it in your reply — including whether a person is styled QS, and their post-nominals.
  </p>
</section>

<section class="pb">
  <h1 class="sec"><span class="n">2</span> Chapters with a full profile published</h1>
  <p class="lead">
    These ${published.length} chapters have their complete executive list, about text and portraits on
    the site. Only the officers named below are still without a photograph.
  </p>
  <table class="tbl">
    <thead><tr><th style="width:22%">Chapter</th><th style="width:18%">Status</th><th>Officers still without a photograph</th></tr></thead>
    <tbody>${pubRows}</tbody>
  </table>
</section>

<section class="pb">
  <h1 class="sec"><span class="n">3</span> Chapters not yet published</h1>
  <p class="lead">
    These ${pending.length} chapter pages currently show only a chairman and deputy, with no executive
    roster and no about text. For each we need the <b>full executive list</b> — name, office and
    post-nominals as the chapter styles them — <b>and a photograph of every officer</b>.
  </p>
  <table class="tbl">
    <thead><tr><th style="width:22%">Chapter</th><th style="width:18%">Status</th><th>Officers currently on the page without a photograph</th></tr></thead>
    <tbody>${pendRows}</tbody>
  </table>
</section>

<section class="pb">
  <h1 class="sec"><span class="n">4</span> Other outstanding items</h1>

  ${nec.length ? `
  <h2 style="font-size:11pt;margin:0 0 5pt;">National Executive Council</h2>
  <p class="lead">These NEC members have no photograph on file. Each resolves when the chapter concerned sends its pack.</p>
  <ul>${nec.map(n => `<li><b>${esc(n.title)}</b> — ${esc(n.name)}</li>`).join('')}</ul>` : ''}

  <h2 style="font-size:11pt;margin:14pt 0 5pt;">Questions awaiting an answer</h2>
  <p class="lead">None of these is a missing photograph, but each needs a reply before the page can be called finished.</p>
  <table class="tbl">
    <thead><tr><th style="width:22%">Who</th><th>Question</th></tr></thead>
    <tbody>${QUERIES.map(([who, q]) => `<tr><td class="chap">${esc(who)}</td><td>${esc(q)}</td></tr>`).join('')}</tbody>
  </table>

  <div class="box navy">
    <div class="bt">Where to send</div>
    <p style="margin:0;">
      Send packs to the NIQS Portal &amp; Web Page Implementation team. Please name each file with the
      officer's name and office — for example <i>QS Jane Doe, MNIQS - General Secretary.jpg</i>. That
      one habit removes most of the guesswork at our end, and it is how the chapters whose pages went
      up fastest sent theirs.
    </p>
  </div>
</section>

</body></html>`;

  fs.writeFileSync(OUT, html, 'utf8');
  console.log(`${totalImages} published, ${missingCount} outstanding across `
    + `${rows.filter(r => r.missing.length).length} chapters`);
  console.log(`→ ${OUT}`);
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
