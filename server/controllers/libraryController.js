const LibraryItem = require('../models/LibraryItem');
const LibraryProgress = require('../models/LibraryProgress');

const EDITABLE = ['title', 'slug', 'subtitle', 'authors', 'description', 'type', 'category', 'tags',
  'publisher', 'year', 'pages', 'isbn', 'coverImage', 'fileUrl', 'fileSize', 'storage', 'access',
  'cpdHours', 'isFeatured', 'isPublished', 'sortOrder'];

const pick = (body) => Object.fromEntries(Object.entries(body || {}).filter(([k]) => EDITABLE.includes(k)));

const slugify = (s) => String(s || '').toLowerCase().trim()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);

const uniqueSlug = async (base, ignoreId) => {
  const root = slugify(base) || 'item';
  let slug = root, n = 2;
  // eslint-disable-next-line no-await-in-loop
  while (await LibraryItem.exists({ slug, ...(ignoreId ? { _id: { $ne: ignoreId } } : {}) })) slug = `${root}-${n++}`;
  return slug;
};

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* Members-only files are never in the public payload; /open hands them out. */
const toPublic = (item, isMember) => {
  const obj = item.toObject ? item.toObject() : { ...item };
  obj.locked = obj.access === 'members' && !isMember;
  if (obj.access === 'members') delete obj.fileUrl;
  delete obj.createdBy;
  return obj;
};

const SORTS = {
  newest:  { createdAt: -1 },
  title:   { title: 1 },
  year:    { year: -1, createdAt: -1 },
  popular: { openCount: -1, createdAt: -1 },
  curated: { sortOrder: 1, createdAt: -1 },
};

// GET /api/library?q=&category=&type=&access=&sort=&page=&limit=
exports.list = async (req, res) => {
  try {
    const { q, category, type, access, sort = 'curated' } = req.query;
    const page  = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(60, Math.max(1, parseInt(req.query.limit, 10) || 24));

    const filter = { isPublished: true };
    if (category) filter.category = category;
    if (type)     filter.type = type;
    if (access === 'public' || access === 'members') filter.access = access;
    if (q && q.trim()) {
      const rx = new RegExp(escapeRegex(q.trim()), 'i');
      filter.$or = [{ title: rx }, { subtitle: rx }, { authors: rx }, { tags: rx }, { description: rx }];
    }

    const [items, total] = await Promise.all([
      LibraryItem.find(filter).sort(SORTS[sort] || SORTS.curated).skip((page - 1) * limit).limit(limit),
      LibraryItem.countDocuments(filter),
    ]);
    const isMember = Boolean(req.user || req.admin);
    res.json({ items: items.map((i) => toPublic(i, isMember)), total, page, pages: Math.ceil(total / limit) || 1 });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// GET /api/library/facets — categories and types with counts, plus featured shelf
exports.facets = async (req, res) => {
  try {
    const [categories, types, featured, total, free] = await Promise.all([
      LibraryItem.aggregate([{ $match: { isPublished: true } }, { $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      LibraryItem.aggregate([{ $match: { isPublished: true } }, { $group: { _id: '$type', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      LibraryItem.find({ isPublished: true, isFeatured: true }).sort({ sortOrder: 1, createdAt: -1 }).limit(8),
      LibraryItem.countDocuments({ isPublished: true }),
      LibraryItem.countDocuments({ isPublished: true, access: 'public' }),
    ]);
    const isMember = Boolean(req.user || req.admin);
    res.json({
      total,
      free,
      categories: categories.map((c) => ({ name: c._id, count: c.count })),
      types: types.map((t) => ({ name: t._id, count: t.count })),
      featured: featured.map((i) => toPublic(i, isMember)),
    });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// GET /api/library/item/:slug
exports.getOne = async (req, res) => {
  try {
    const item = await LibraryItem.findOne({ slug: req.params.slug, isPublished: true });
    if (!item) return res.status(404).json({ message: 'Not found' });
    const isMember = Boolean(req.user || req.admin);
    const related = await LibraryItem.find({ isPublished: true, category: item.category, _id: { $ne: item._id } })
      .sort({ openCount: -1 }).limit(4);
    let progress = null;
    if (req.user) progress = await LibraryProgress.findOne({ user: req.user._id, item: item._id });
    res.json({ item: toPublic(item, isMember), related: related.map((r) => toPublic(r, isMember)), progress });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// GET /api/library/:id/open — returns the file URL and records the open (members for gated items)
exports.open = async (req, res) => {
  try {
    const item = await LibraryItem.findOne({ _id: req.params.id, isPublished: true });
    if (!item) return res.status(404).json({ message: 'Not found' });
    if (item.access === 'members' && !req.user && !req.admin) {
      return res.status(401).json({ message: 'Sign in as a member to open this item' });
    }
    if (!item.fileUrl) return res.status(404).json({ message: 'This item has no file yet' });

    await LibraryItem.updateOne({ _id: item._id }, { $inc: { openCount: 1 } });
    if (req.user) {
      await LibraryProgress.updateOne(
        { user: req.user._id, item: item._id },
        { $set: { openedAt: new Date() }, $setOnInsert: { status: 'in_progress', percent: 0 } },
        { upsert: true },
      );
    }
    res.json({ url: item.fileUrl, type: item.type });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

/* ── Member progress ── */

// GET /api/library/me — the member's shelf: in progress, saved, completed
exports.myShelf = async (req, res) => {
  try {
    const rows = await LibraryProgress.find({ user: req.user._id })
      .populate({ path: 'item', match: { isPublished: true } })
      .sort({ updatedAt: -1 });
    const shelf = rows.filter((r) => r.item).map((r) => ({
      item: toPublic(r.item, true),
      percent: r.percent, lastPage: r.lastPage, status: r.status, saved: r.saved,
      openedAt: r.openedAt, completedAt: r.completedAt, updatedAt: r.updatedAt,
    }));
    const cpdHours = shelf.filter((s) => s.status === 'completed').reduce((t, s) => t + (s.item.cpdHours || 0), 0);
    res.json({ shelf, summary: {
      inProgress: shelf.filter((s) => s.status === 'in_progress').length,
      completed:  shelf.filter((s) => s.status === 'completed').length,
      saved:      shelf.filter((s) => s.saved).length,
      cpdHours,
    } });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// PUT /api/library/:id/progress  { percent?, lastPage?, saved?, completed? }
exports.updateProgress = async (req, res) => {
  try {
    const item = await LibraryItem.exists({ _id: req.params.id, isPublished: true });
    if (!item) return res.status(404).json({ message: 'Not found' });

    const { percent, lastPage, saved, completed } = req.body || {};
    const set = {};
    if (percent !== undefined) set.percent = Math.min(100, Math.max(0, Number(percent) || 0));
    if (lastPage !== undefined) set.lastPage = Math.max(0, parseInt(lastPage, 10) || 0);
    if (saved !== undefined) set.saved = Boolean(saved);
    if (completed === true || set.percent === 100) {
      set.status = 'completed'; set.percent = 100; set.completedAt = new Date();
    } else if (completed === false || (set.percent !== undefined && set.percent < 100)) {
      set.status = 'in_progress'; set.completedAt = null;
    }

    const existing = await LibraryProgress.findOne({ user: req.user._id, item: req.params.id });
    if (!existing && set.status === undefined) set.status = set.saved && set.percent === undefined ? 'saved' : 'in_progress';

    const progress = await LibraryProgress.findOneAndUpdate(
      { user: req.user._id, item: req.params.id },
      { $set: set },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );
    res.json(progress);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

/* ── Admin ── */

exports.getAllAdmin = async (req, res) => {
  try {
    const items = await LibraryItem.find().populate('createdBy', 'firstName lastName').sort({ sortOrder: 1, createdAt: -1 });
    const readers = await LibraryProgress.aggregate([
      { $group: { _id: '$item', readers: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } } } },
    ]);
    const byItem = Object.fromEntries(readers.map((r) => [String(r._id), r]));
    res.json({ items: items.map((i) => ({
      ...i.toObject(),
      readers: byItem[String(i._id)]?.readers || 0,
      completions: byItem[String(i._id)]?.completed || 0,
    })) });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.create = async (req, res) => {
  try {
    const body = pick(req.body);
    if (!body.title) return res.status(400).json({ message: 'Title is required' });
    body.slug = await uniqueSlug(body.slug || body.title);
    const item = await LibraryItem.create({ ...body, createdBy: req.admin._id });
    res.status(201).json(item);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.update = async (req, res) => {
  try {
    const body = pick(req.body);
    if (body.slug !== undefined) body.slug = await uniqueSlug(body.slug || body.title, req.params.id);
    const item = await LibraryItem.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.remove = async (req, res) => {
  try {
    const item = await LibraryItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    await LibraryProgress.deleteMany({ item: item._id });
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
};
