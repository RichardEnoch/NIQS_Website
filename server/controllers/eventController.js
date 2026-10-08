const Event = require('../models/Event');
const Registration = require('../models/Registration');
const { classifyConflicts, describeConflict, dayStartUTC, dayEndUTC } = require('../utils/eventConflicts');
const { spotlightRefusal } = require('../utils/spotlight');

// Only events still to come hold a homepage spotlight slot; the homepage never
// shows a past event, so a stale "featured" flag must not block a new one.
const upcomingFilter = () => {
  const today = dayStartUTC(new Date());
  return { $or: [{ endDate: { $gte: today } }, { endDate: null, date: { $gte: today } }] };
};

/* ── Helpers ───────────────────────────────────────────────────────────────── */

// Map a flyer category to the canonical Event.type enum. The precise flyer
// category is preserved on the `flyer` subdocument; this only drives the
// calendar/listing classification, so occasion flyers reuse existing enum values.
const FLYER_TYPE_BY_CATEGORY = {
  Training: 'training',
  Webinar: 'webinar',
  'Courtesy Visit': 'meeting',
  Appreciation: 'social',
  Congratulations: 'social',
  Condolence: 'other',
};

// When a flyer design is attached, derive/sync the canonical Event fields so the
// calendar + guardrail stay consistent and the required schema fields validate.
function applyFlyerToEvent(body) {
  const f = body.flyer;
  if (!f) return body;
  const mapped = { ...body, hasFlyer: true };

  if (f.title) mapped.title = f.title;
  if (f.dateStart) mapped.date = f.dateStart;
  mapped.endDate = f.dateEnd || f.dateStart || mapped.endDate || undefined;
  mapped.description = body.description || f.subtitle || f.title || 'NIQS event';
  mapped.location =
    body.location ||
    f.venueCity ||
    f.venuePhysical ||
    (f.venueType === 'Virtual' ? 'Online' : 'TBA');
  if (f.venuePhysical) mapped.venue = f.venuePhysical;
  if (f.registrationUrl) mapped.registrationLink = f.registrationUrl;
  if (f.category) mapped.type = FLYER_TYPE_BY_CATEGORY[f.category] || 'other';
  // Courtesy visits / appreciation flyers often have no physical venue — fall back
  // to the host (e.g. "NIQS Lagos State Chapter") so the required `location` validates.
  if (!body.location && !f.venueCity && !f.venuePhysical && f.host) mapped.location = f.host;
  return mapped;
}

function canOverrideConflicts(role) {
  return role === 'main_admin' || role === 'national_admin';
}

function conflictMessage(hard) {
  const first = hard[0];
  const d = describeConflict(first);
  const owner = first.scope === 'national' ? 'A National (HQ) event' : `A ${d.chapterName || 'chapter'} event`;
  const more = hard.length > 1 ? ` (and ${hard.length - 1} more)` : '';
  return `Date unavailable — ${owner} "${first.title}" already holds ${d.when}${more}. Pick another date.`;
}

/* ── Public reads ──────────────────────────────────────────────────────────── */

exports.getAllEvents = async (req, res) => {
  try {
    const { page = 1, limit = 12, type, scope, chapter, upcoming } = req.query;
    const filter = {};

    if (type) filter.type = type;
    if (scope) filter.scope = scope;
    if (chapter) filter.chapter = chapter;
    if (upcoming === 'true') filter.date = { $gte: new Date() };

    const events = await Event.find(filter)
      .populate('chapter', 'name')
      .populate('author', 'firstName lastName')
      .sort(upcoming === 'true' ? 'date' : '-date')
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Event.countDocuments(filter);

    res.json({ events, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('chapter', 'name')
      .populate('author', 'firstName lastName');
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json(event);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/* ── Calendar + guardrail ──────────────────────────────────────────────────── */

// Lightweight projection of all events overlapping an optional [from, to] window.
exports.getCalendarEvents = async (req, res) => {
  try {
    const { from, to } = req.query;
    const filter = {};
    if (from || to) {
      if (to) filter.date = { $lte: dayEndUTC(to) };
      if (from) filter.$expr = { $gte: [{ $ifNull: ['$endDate', '$date'] }, dayStartUTC(from)] };
    }

    const events = await Event.find(filter)
      .select('title date endDate scope chapter type hasFlyer')
      .populate('chapter', 'name')
      .sort('date')
      .lean();

    res.json({ events });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Live pre-save availability check for the Flyer Studio / Calendar forms.
exports.checkDate = async (req, res) => {
  try {
    const { start, end, excludeId } = req.query;
    let { scope, chapter } = req.query;

    // Resolve scope/chapter from the caller's role. Anyone who isn't HQ
    // (state_admin, waqsn_admin, yqsf_admin) is chapter-scoped and subordinate to HQ.
    if (!canOverrideConflicts(req.admin.role)) {
      scope = 'chapter';
      if (req.admin.assignedChapter) chapter = String(req.admin.assignedChapter);
    }
    scope = scope || 'national';

    const { hard, warnings } = await classifyConflicts({ start, end, scope, chapter, excludeId });

    res.json({
      ok: hard.length === 0,
      canOverride: canOverrideConflicts(req.admin.role),
      hard: hard.map(describeConflict),
      warnings: warnings.map(describeConflict),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/* ── Writes (guardrail-enforced) ───────────────────────────────────────────── */

exports.createEvent = async (req, res) => {
  try {
    // Only HQ (main/national) may publish national-scope events.
    if (!canOverrideConflicts(req.admin.role) && req.body.scope === 'national') {
      return res.status(403).json({ message: 'Only National/Main Admin can create national events' });
    }

    const body = applyFlyerToEvent(req.body);
    const scope = body.scope || (canOverrideConflicts(req.admin.role) ? 'national' : 'chapter');
    const chapter = scope === 'chapter' ? (body.chapter || req.admin.assignedChapter || null) : null;

    const { hard, warnings } = await classifyConflicts({ start: body.date, end: body.endDate, scope, chapter });

    if (hard.length && !(body.force && canOverrideConflicts(req.admin.role))) {
      return res.status(409).json({ message: conflictMessage(hard), conflicts: hard.map(describeConflict) });
    }

    const refusal = await spotlightRefusal(Event, {
      requested: body.isFeatured, slotFilter: upcomingFilter(), noun: 'event',
    });
    if (refusal) return res.status(400).json({ message: refusal, code: 'SPOTLIGHT_FULL' });

    const { force, ...clean } = body;
    const event = await Event.create({ ...clean, scope, chapter, author: req.admin._id });

    res.status(201).json({
      event,
      warnings: warnings.map(describeConflict),
      overridden: hard.length > 0,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    if (req.admin.role === 'state_admin') {
      if (!event.chapter || event.chapter.toString() !== req.admin.assignedChapter?.toString()) {
        return res.status(403).json({ message: 'You can only edit your chapter\'s events' });
      }
    }

    const body = applyFlyerToEvent(req.body);
    const scope = body.scope || event.scope;
    const chapter = scope === 'chapter'
      ? (body.chapter || event.chapter || req.admin.assignedChapter || null)
      : null;

    const { hard, warnings } = await classifyConflicts({
      start: body.date || event.date,
      end: body.endDate || event.endDate,
      scope,
      chapter,
      excludeId: event._id,
    });

    if (hard.length && !(body.force && canOverrideConflicts(req.admin.role))) {
      return res.status(409).json({ message: conflictMessage(hard), conflicts: hard.map(describeConflict) });
    }

    const refusal = await spotlightRefusal(Event, {
      requested: body.isFeatured, current: event.isFeatured,
      slotFilter: upcomingFilter(), excludeId: event._id, noun: 'event',
    });
    if (refusal) return res.status(400).json({ message: refusal, code: 'SPOTLIGHT_FULL' });

    const { force, ...clean } = body;
    Object.assign(event, clean, { scope, chapter });
    await event.save();

    res.json({ event, warnings: warnings.map(describeConflict), overridden: hard.length > 0 });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getAdminEvents = async (req, res) => {
  try {
    let filter = {};
    if (req.admin.role === 'state_admin' && req.admin.assignedChapter) {
      filter.chapter = req.admin.assignedChapter;
    } else if (req.admin.role === 'waqsn_admin' || req.admin.role === 'yqsf_admin') {
      filter.author = req.admin._id;
    }

    const events = await Event.find(filter)
      .populate('author', 'firstName lastName')
      .populate('chapter', 'name')
      .sort('-createdAt');

    // Attach registration + attendance counts in a single aggregation
    const ids = events.map((e) => e._id);
    const counts = await Registration.aggregate([
      { $match: { event: { $in: ids } } },
      { $group: { _id: '$event', total: { $sum: 1 }, attended: { $sum: { $cond: ['$attended', 1, 0] } } } },
    ]);
    const byEvent = {};
    counts.forEach((c) => { byEvent[String(c._id)] = c; });

    const withCounts = events.map((e) => {
      const o = e.toObject();
      const c = byEvent[String(e._id)];
      o.registrationCount = c ? c.total : 0;
      o.attendedCount = c ? c.attended : 0;
      return o;
    });

    res.json(withCounts);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
