import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { canDelete } from '../../utils/roleHelpers';
import AdminHeader from '../../components/admin/AdminHeader';
import DataTable from '../../components/admin/DataTable';
import FileUpload from '../../components/common/FileUpload';

// 'ceremony' for inductions and investitures, 'exam' for examination dates (October 2026 review).
const eventTypes = ['conference', 'seminar', 'workshop', 'agm', 'training', 'webinar', 'meeting', 'ceremony', 'exam', 'other'];

const emptyForm = {
  title: '',
  description: '',
  date: '',
  endDate: '',
  location: '',
  venue: '',
  type: 'conference',
  scope: 'national',
  chapter: '',
  image: '',
  registrationLink: '',
  isFeatured: false,
};

export default function ManageEvents() {
  const { admin } = useAuth();
  const role = admin?.role || '';
  const isStateAdmin = role === 'state_admin';
  const [events, setEvents] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    fetchEvents();
    fetchChapters();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data } = await API.get('/events');
      setEvents(data.events || data || []);
    } catch (err) {
      toast.error('Failed to fetch events');
    } finally {
      setLoading(false);
    }
  };

  const fetchChapters = async () => {
    try {
      const { data } = await API.get('/chapters');
      setChapters(data.chapters || data || []);
    } catch {
      // silent
    }
  };

  const openAdd = () => {
    setEditing(null);
    const defaults = { ...emptyForm };
    if (isStateAdmin) {
      defaults.scope = 'chapter';
      defaults.chapter = admin?.chapter?._id || admin?.chapter || '';
    }
    setForm(defaults);
    setShowModal(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      title: row.title || '',
      description: row.description || '',
      date: row.date ? row.date.slice(0, 16) : '',
      endDate: row.endDate ? row.endDate.slice(0, 16) : '',
      location: row.location || '',
      venue: row.venue || '',
      type: row.type || 'conference',
      scope: row.scope || 'national',
      chapter: row.chapter?._id || row.chapter || '',
      image: row.image || '',
      registrationLink: row.registrationLink || '',
      isFeatured: row.isFeatured || false,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...form };
      if (payload.scope !== 'chapter') delete payload.chapter;

      if (editing) {
        await API.put(`/events/${editing._id}`, payload);
        toast.success('Event updated');
      } else {
        await API.post('/events', payload);
        toast.success('Event created');
      }
      setShowModal(false);
      fetchEvents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await API.delete(`/events/${confirmDelete._id}`);
      toast.success('Event deleted');
      setConfirmDelete(null);
      fetchEvents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const columns = [
    { key: 'title', label: 'Title' },
    {
      key: 'date',
      label: 'Date',
      render: (val) => (val ? new Date(val).toLocaleDateString() : '--'),
    },
    { key: 'location', label: 'Location', render: (val) => val || '--' },
    {
      key: 'type',
      label: 'Type',
      render: (val) => (
        <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: '#e5e7eb', color: '#374151', textTransform: 'capitalize' }}>
          {val}
        </span>
      ),
    },
    { key: 'scope', label: 'Scope', render: (val) => (val === 'chapter' ? 'Chapter' : 'National') },
  ];

  return (
    <div>
      <AdminHeader title="Manage Events" breadcrumbs={['Events']} />

      <div style={{ padding: '24px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h3 style={{ margin: 0, fontSize: 16, color: '#374151' }}>All Events</h3>
          <button onClick={openAdd} style={addBtnStyle}>+ Add Event</button>
        </div>

        <DataTable
          columns={columns}
          data={events}
          loading={loading}
          onEdit={openEdit}
          onDelete={(row) => setConfirmDelete(row)}
          canDeleteRows={canDelete(role)}
        />
      </div>

      {showModal && (
        <ModalOverlay onClose={() => setShowModal(false)}>
          <h3 style={{ margin: '0 0 20px', color: '#000066' }}>
            {editing ? 'Edit Event' : 'Add Event'}
          </h3>
          <form onSubmit={handleSubmit}>
            <FormField label="Title" required>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required style={inputStyle} />
            </FormField>
            <FormField label="Description" required>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
            </FormField>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <FormField label="Start Date" required>
                <input type="datetime-local" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required style={inputStyle} />
              </FormField>
              <FormField label="End Date">
                <input type="datetime-local" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} style={inputStyle} />
              </FormField>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <FormField label="Location">
                <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} style={inputStyle} placeholder="City, State" />
              </FormField>
              <FormField label="Venue">
                <input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} style={inputStyle} />
              </FormField>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <FormField label="Event Type">
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={inputStyle}>
                  {eventTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Scope">
                <select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} disabled={isStateAdmin} style={{ ...inputStyle, opacity: isStateAdmin ? 0.6 : 1 }}>
                  <option value="national">National</option>
                  <option value="chapter">Chapter</option>
                </select>
              </FormField>
            </div>
            {form.scope === 'chapter' && (
              <FormField label="Chapter" required>
                <select value={form.chapter} onChange={(e) => setForm({ ...form, chapter: e.target.value })} required disabled={isStateAdmin} style={{ ...inputStyle, opacity: isStateAdmin ? 0.6 : 1 }}>
                  <option value="">-- Select Chapter --</option>
                  {chapters.map((ch) => (
                    <option key={ch._id} value={ch._id}>{ch.name}</option>
                  ))}
                </select>
              </FormField>
            )}
            {/* The event's flyer or design, uploaded from the admin's computer. It
                was a pasted image URL, which meant hosting the design somewhere
                else first (October 2026 review). Same uploader and endpoint as
                Webinars and QS Connect; an event saved with a URL keeps it, and
                shows it here until it is replaced or removed. */}
            <FormField label="Event flyer / design">
              {form.image && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <img src={form.image} alt="Current flyer" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb' }} />
                  <button type="button" onClick={() => setForm(prev => ({ ...prev, image: '' }))}
                    style={{ fontSize: 12, color: '#b91c1c', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    Remove
                  </button>
                </div>
              )}
              <FileUpload
                key={editing?._id || 'new'}
                label={form.image ? 'Replace flyer (JPG or PNG)' : 'Upload flyer (JPG or PNG)'}
                accept="image/*"
                maxMB={10}
                onUpload={(url) => setForm(prev => ({ ...prev, image: url }))}
                onError={(msg) => toast.error(msg)}
              />
            </FormField>
            <FormField label="Registration Link">
              <input value={form.registrationLink} onChange={(e) => setForm({ ...form, registrationLink: e.target.value })} style={inputStyle} placeholder="https://..." />
            </FormField>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#374151', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} />
                Featured on the homepage (3 slots)
              </label>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button type="button" onClick={() => setShowModal(false)} style={{ ...btnStyle, background: '#e5e7eb', color: '#374151' }}>Cancel</button>
              <button type="submit" disabled={submitting} style={{ ...btnStyle, background: '#D9B650', color: '#fff', opacity: submitting ? 0.6 : 1 }}>
                {submitting ? 'Saving...' : editing ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </ModalOverlay>
      )}

      {confirmDelete && (
        <ModalOverlay onClose={() => setConfirmDelete(null)}>
          <h3 style={{ margin: '0 0 12px', color: '#dc2626' }}>Confirm Delete</h3>
          <p style={{ color: '#374151', fontSize: 14 }}>Delete <strong>{confirmDelete.title}</strong>?</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button onClick={() => setConfirmDelete(null)} style={{ ...btnStyle, background: '#e5e7eb', color: '#374151' }}>Cancel</button>
            <button onClick={handleDelete} style={{ ...btnStyle, background: '#dc2626', color: '#fff' }}>Delete</button>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}

function ModalOverlay({ children, onClose }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, padding: '24px 28px', width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        {children}
      </div>
    </div>
  );
}

function FormField({ label, required, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
        {label} {required && <span style={{ color: '#dc2626' }}>*</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, color: '#111827', outline: 'none', boxSizing: 'border-box' };
const btnStyle = { padding: '10px 22px', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 14, cursor: 'pointer' };
const addBtnStyle = { padding: '10px 20px', background: '#D9B650', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 14, cursor: 'pointer' };
