/* One list of news categories for the admin form, the News page filters and
   the card tags. It mirrors the enum in server/models/News.js: the admin used
   to offer 'publication' and 'press-release', which the model rejects, and the
   public filters ('Conference', 'Legislation'...) matched no stored value, so
   every filter but All came back empty. Change both places together. */
export const NEWS_CATEGORIES = [
  { value: 'announcement', label: 'Announcements' },
  { value: 'update', label: 'Updates' },
  { value: 'press', label: 'Press Releases' },
  { value: 'chapter_news', label: 'Chapter News' },
  { value: 'event_recap', label: 'Event Recaps' },
  { value: 'general', label: 'General' },
];

export const newsCategoryLabel = (value) =>
  NEWS_CATEGORIES.find((c) => c.value === value)?.label || 'News';
