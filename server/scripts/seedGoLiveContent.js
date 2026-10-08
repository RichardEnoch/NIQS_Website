/**
 * Go-live content seed — populates President, NEC (Exco scope:national),
 * Past Presidents, Chapters, and official-document download cards from the
 * committee's approved content package (July 2026).
 *
 * Reads MONGO_URI + Cloudinary/R2 creds from server/.env, uploads portraits
 * and PDFs through utils/storage (same tiering as /api/upload), then upserts
 * records by natural keys so re-runs are safe.
 *
 * Usage (from the server folder):
 *   node scripts/seedGoLiveContent.js <dataset.json> <photosDir> <pdfDir>
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { storeBuffer } = require('../utils/storage');

const President = require('../models/President');
const Exco = require('../models/Exco');
const PastPresident = require('../models/PastPresident');
const Chapter = require('../models/Chapter');
const BrandMaterial = require('../models/BrandMaterial');

const [datasetPath, photosDir, pdfDir] = process.argv.slice(2);
if (!datasetPath || !photosDir || !pdfDir) {
  console.error('Usage: node scripts/seedGoLiveContent.js <dataset.json> <photosDir> <pdfDir>');
  process.exit(2);
}
const data = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));

const ZONES = {
  Abia: 'South East', Adamawa: 'North East', 'Akwa Ibom': 'South South',
  Anambra: 'South East', Bauchi: 'North East', Bayelsa: 'South South',
  Benue: 'North Central', Borno: 'North East', 'Cross River': 'South South',
  Delta: 'South South', Ebonyi: 'South East', Edo: 'South South',
  Ekiti: 'South West', Enugu: 'South East', FCT: 'North Central',
  Gombe: 'North East', Imo: 'South East', Jigawa: 'North West',
  Kaduna: 'North West', Kano: 'North West', Katsina: 'North West',
  Kogi: 'North Central', Kwara: 'North Central', Lagos: 'South West',
  Nasarawa: 'North Central', Niger: 'North Central', Ogun: 'South West',
  Ondo: 'South West', Osun: 'South West', Oyo: 'South West',
  Plateau: 'North Central', Rivers: 'South South', Sokoto: 'North West',
  Yobe: 'North East', Zamfara: 'North West',
};

const uploaded = {}; // local filename -> hosted URL
async function uploadFile(fullPath, mimetype) {
  const key = path.basename(fullPath);
  if (uploaded[key]) return uploaded[key];
  const buffer = fs.readFileSync(fullPath);
  const res = await storeBuffer({
    buffer, originalname: key, mimetype, size: buffer.length,
  });
  uploaded[key] = res.url;
  console.log(`  uploaded ${key} -> ${res.storage}`);
  return res.url;
}
const photoUrl = async (name) =>
  name ? uploadFile(path.join(photosDir, name), 'image/jpeg') : '';

(async () => {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 20000 });
  console.log('Connected to MongoDB.\n');

  /* ── President singleton ── */
  console.log('President…');
  const presPhoto = await photoUrl(data.president.photo);
  const bioParas = data.president.bio.split('\n\n');
  await President.findOneAndUpdate(
    { _singleton: 'president' },
    {
      name: data.president.name,
      title: 'President, NIQS',
      tenure: '2025 – 2027',
      photo: presPhoto,
      backgroundImage: presPhoto,
      paragraph1: `${data.president.fullTitle} was elected President of the Nigerian Institute of Quantity Surveyors for the 2025–2027 tenure. A Fellow of the Institute since 2015, he trained at Ahmadu Bello University, Zaria, where he earned his BSc, MSc and PhD, and rose to Managing Partner of Mobat Quants Consultants, delivering landmark projects across Nigeria.`,
      paragraph2: `His service to the Institute spans two decades — General Secretary, Deputy Chairman and Chairman of the Kano State Chapter (2007–2017), Secretary International Affairs (2017–2019), Secretary General (2019–2021) and Deputy President (2023–2025). He is also an Associate Professor of Quantity Surveying at Bayero University, Kano.`,
    },
    { upsert: true, new: true }
  );
  console.log('  ok\n');

  /* ── NEC (Exco scope: national) ── */
  console.log('NEC members…');
  for (const m of data.nec) {
    const image = await photoUrl(m.photo);
    const update = {
      title: m.title,
      order: m.order,
      scope: 'national',
      isActive: true,
      ...(image ? { image } : {}),
    };
    if (m.name === data.president.name) update.bio = data.president.bio;
    await Exco.findOneAndUpdate({ name: m.name, scope: 'national' }, update, { upsert: true });
  }
  console.log(`  ok (${data.nec.length})\n`);

  /* ── Past Presidents ── */
  console.log('Past presidents…');
  for (const p of data.pastPresidents) {
    await PastPresident.findOneAndUpdate(
      { name: p.name },
      {
        term: p.tenure,
        // Was 'PPNIQS' on every record; the review (Oct 2026) dropped that line
        // from the page, so a re-seed must not put it back.
        info: '',
        // most recent first on the public page
        order: data.pastPresidents.length - p.order,
        isActive: true,
      },
      { upsert: true }
    );
  }
  console.log(`  ok (${data.pastPresidents.length})\n`);

  /* ── Chapters ── */
  console.log('Chapters…');
  for (const c of data.chapters) {
    const image = await photoUrl(c.photo);
    const name = `${c.state} Chapter`;
    const doc = await Chapter.findOne({ name });
    const fields = {
      state: c.state === 'FCT' ? 'FCT' : `${c.state} State`,
      zone: ZONES[c.state] || '',
      chairperson: c.chairman,
      secretary: c.deputy || '',
      email: c.email || '',
      phone: c.phone || '',
      isActive: true,
      ...(image ? { image } : {}),
    };
    if (doc) {
      Object.assign(doc, fields);
      await doc.save();
    } else {
      await Chapter.create({ name, ...fields }); // pre-save hook builds slug
    }
  }
  console.log(`  ok (${data.chapters.length})\n`);

  /* ── Official documents as download cards ── */
  console.log('Documents…');
  const docCards = [
    {
      title: 'NIQS Constitution',
      description: 'The constitution of the Nigerian Institute of Quantity Surveyors — governance, organs and rules of the Institute.',
      file: 'NIQS CONSTITUTION.pdf',
      order: 1,
    },
    {
      title: 'Code of Ethics & Professional Conduct',
      description: 'The professional and ethical standards binding on all members of the Institute.',
      file: 'CODE OF ETHICS AND PROFESSIONAL CONDUCT.pdf',
      order: 2,
    },
    {
      title: 'NIQS Membership Guidelines',
      description: 'Membership grades, requirements and routes to membership — from Probationer to Fellow.',
      file: 'NIQS Membership Guidelines.pdf',
      order: 3,
    },
    {
      title: 'NIQS Brand Design Reference',
      description: 'Official brand design reference — logo usage, colours and typography.',
      file: 'NIQS BRAND DESIGN REFERENCE.pdf',
      order: 4,
    },
  ];
  for (const d of docCards) {
    const fileUrl = await uploadFile(path.join(pdfDir, d.file), 'application/pdf');
    await BrandMaterial.findOneAndUpdate(
      { title: d.title },
      {
        description: d.description,
        buttonLabel: 'Download PDF',
        fileUrl,
        previewType: 'gradient',
        previewBackground: 'linear-gradient(135deg,#0B1F4B 50%,#C9974A 100%)',
        order: d.order,
        isPublished: true,
      },
      { upsert: true }
    );
  }
  console.log(`  ok (${docCards.length})\n`);

  const counts = {
    exco_national: await Exco.countDocuments({ scope: 'national' }),
    pastPresidents: await PastPresident.countDocuments(),
    chapters: await Chapter.countDocuments(),
    brandMaterials: await BrandMaterial.countDocuments(),
  };
  console.log('Final counts:', counts);
  await mongoose.disconnect();
  console.log('Done.');
})().catch((err) => { console.error(err); process.exit(1); });
