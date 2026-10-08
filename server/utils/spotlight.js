/**
 * The homepage spotlight has exactly three slots for events and three for news
 * (agreed with the Secretariat, Oct 2026). Marking a fourth item "Featured"
 * is refused with a message telling the admin to un-feature one first, rather
 * than silently bumping the oldest: the Secretariat chooses what leaves the
 * homepage, not the server.
 *
 * Only items that can actually appear in the spotlight hold a slot. A featured
 * event that has already ended is off the homepage (the homepage shows upcoming
 * events only), so it does not block a new one; unpublished news likewise.
 */
const SPOTLIGHT_SLOTS = 3;

function truthy(v) {
  return v === true || v === 'true' || v === 1 || v === '1';
}

/**
 * @param {mongoose.Model} Model
 * @param {object} opts
 * @param {*} opts.requested   the isFeatured value in the request body (undefined = not being changed)
 * @param {boolean} opts.current  the record's isFeatured before this write
 * @param {object} opts.slotFilter  which other records occupy a slot
 * @param {*} [opts.excludeId]  the record being edited
 * @param {string} opts.noun  'event' | 'news item'
 * @returns {Promise<string|null>} a refusal message, or null when the write may go ahead
 */
async function spotlightRefusal(Model, { requested, current = false, slotFilter, excludeId, noun }) {
  if (requested === undefined || !truthy(requested) || current) return null;
  const filter = { ...slotFilter, isFeatured: true };
  if (excludeId) filter._id = { $ne: excludeId };
  const taken = await Model.countDocuments(filter);
  if (taken < SPOTLIGHT_SLOTS) return null;
  return `The homepage spotlight already has ${SPOTLIGHT_SLOTS} featured ${noun === 'event' ? 'events' : 'news items'}. `
    + `Un-feature one of them first, then feature this ${noun}.`;
}

module.exports = { SPOTLIGHT_SLOTS, spotlightRefusal };
