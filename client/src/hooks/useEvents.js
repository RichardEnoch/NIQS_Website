import { useEffect, useState } from 'react';
import API from '../api/axios';

/**
 * The one events list the public site reads.
 *
 * The home page, its ticker and the Events page used to fetch on their own —
 * `?upcoming=true&limit=3` on the home page, everything (newest first, 12) on
 * the calendar — with different filters and different notions of "upcoming",
 * so the three events on the home page could disagree with the calendar they
 * link to. NIQS asked at the October 2026 review for every snippet to match its
 * page. Everything now comes from here: one fetch, one filter, one order, and
 * the home page shows the first three of the same list.
 */

/* Display names for the Event model's `type` enum, on every page that lists events. */
export const TYPE_LABEL = {
  conference: 'Conference', seminar: 'Seminar', agm: 'AGM', workshop: 'Workshop',
  training: 'Training', webinar: 'Webinar', exam: 'Examination', meeting: 'Meeting',
  social: 'Social', ceremony: 'Ceremony', other: 'Event',
};

/* The homepage spotlight has three slots (see server/utils/spotlight.js). */
export const SPOTLIGHT_SLOTS = 3;

/**
 * The homepage spotlight: events the Secretariat marked Featured, then — while
 * fewer than three are featured — the next upcoming events, so the section is
 * never half empty when there are events to show. Drawn from the same
 * `upcoming` list as the Events page, so every spotlight item is on that page
 * too, in the same words.
 */
export function spotlightOf(list, slots = SPOTLIGHT_SLOTS) {
  const featured = list.filter(e => e.isFeatured);
  const rest = list.filter(e => !e.isFeatured);
  return [...featured, ...rest].slice(0, slots);
}

/**
 * Webinars are kept in their own collection (managed under Admin → Webinars),
 * but since the October 2026 review they no longer have a page of their own —
 * NIQS asked for them to be listed with every other event. They are mapped onto
 * the event shape here so the list, filters and registration button treat them
 * the same way.
 */
export function webinarAsEvent(w) {
  return {
    _id: `webinar-${w._id}`,
    title: w.title,
    description: w.description,
    date: w.date,
    location: 'Online',
    type: 'webinar',
    image: w.thumbnailUrl || null,
    registrationLink: w.registrationUrl || null,
    recordingUrl: w.recordingUrl || null,
    isWebinar: true,
  };
}

/**
 * Whether an event can still be registered for.
 *
 * Measured against the end of its last day, not its start: a two-day workshop is
 * still open on the morning of day two, and a same-day event should not vanish
 * from registration at one minute past midnight. endDate wins where it exists,
 * because `date` is only the first day.
 */
export function isUpcoming(e) {
  const last = new Date(e.endDate || e.date);
  if (Number.isNaN(last.getTime())) return false;
  last.setHours(23, 59, 59, 999);
  return last.getTime() >= Date.now();
}

const byDate = (a, b) => new Date(a.date) - new Date(b.date);

/* Shared across every caller on a page view, so the home page and its ticker
   make one request between them rather than one each. */
let pending = null;
function loadEvents() {
  if (!pending) {
    // Webinars are best-effort: if that request fails, events still show.
    pending = Promise.all([
      API.get('/events?limit=100'),
      API.get('/webinars').catch(() => ({ data: {} })),
    ]).then(([evRes, wbRes]) => {
      const data = evRes.data?.events || evRes.data?.data || evRes.data;
      const webinars = wbRes.data?.webinars || [];
      return [
        ...(Array.isArray(data) ? data : []),
        ...(Array.isArray(webinars) ? webinars.filter(w => w.date).map(webinarAsEvent) : []),
      ];
    }).finally(() => { setTimeout(() => { pending = null; }, 0); });
  }
  return pending;
}

/**
 * { events, upcoming, past, status }. `upcoming` is soonest first, `past` most
 * recent first; `status` is 'loading' | 'ready' | 'error'.
 */
export default function useEvents() {
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let live = true;
    loadEvents()
      .then(list => { if (live) { setEvents(list); setStatus('ready'); } })
      .catch(() => { if (live) { setEvents([]); setStatus('error'); } });
    return () => { live = false; };
  }, []);

  const upcoming = events.filter(isUpcoming).sort(byDate);
  return {
    events,
    upcoming,
    spotlight: spotlightOf(upcoming),
    past: events.filter(e => !isUpcoming(e)).sort((a, b) => byDate(b, a)),
    status,
  };
}
