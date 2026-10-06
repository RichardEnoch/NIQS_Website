import API from './axios';

/** NIQS Digital Library — thin wrappers over /api/library. */
export const libraryApi = {
  list:     (params) => API.get('/library', { params }).then((r) => r.data),
  facets:   () => API.get('/library/facets').then((r) => r.data),
  item:     (slug) => API.get(`/library/item/${encodeURIComponent(slug)}`).then((r) => r.data),
  open:     (id) => API.get(`/library/${id}/open`).then((r) => r.data),
  myShelf:  () => API.get('/library/me').then((r) => r.data),
  progress: (id, body) => API.put(`/library/${id}/progress`, body).then((r) => r.data),

  adminAll: () => API.get('/library/admin/all').then((r) => r.data),
  create:   (body) => API.post('/library', body).then((r) => r.data),
  update:   (id, body) => API.put(`/library/${id}`, body).then((r) => r.data),
  remove:   (id) => API.delete(`/library/${id}`).then((r) => r.data),
};

export const TYPE_LABEL = {
  book: 'Book', standard: 'Standard', guide: 'Practice Guide', paper: 'Paper', journal: 'Journal',
  course: 'Course', video: 'Video', template: 'Template', other: 'Resource',
};
export const TYPE_ICON = {
  book: 'book', standard: 'legal', guide: 'note', paper: 'file', journal: 'journal',
  course: 'education', video: 'video', template: 'template', other: 'folder',
};
export const LIBRARY_TYPES = Object.keys(TYPE_LABEL);

/* The categories the Institute's knowledge actually falls into. Admins can type
   others; these seed the admin picker and the public filter order. */
export const LIBRARY_CATEGORIES = [
  'Measurement & Estimating', 'Cost Management', 'Procurement & Contracts', 'Construction Law',
  'Professional Practice', 'Project Management', 'Sustainability', 'Digital Construction & BIM',
  'Research & Journals', 'Exam Preparation', 'General',
];

/** Where a signed-out reader goes to sign in, and comes back to. */
export const loginFor = (path) => `/login?next=${encodeURIComponent(path)}`;
