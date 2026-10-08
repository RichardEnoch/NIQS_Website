import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { canDelete } from '../../utils/roleHelpers';
import AdminHeader from '../../components/admin/AdminHeader';
import DataTable from '../../components/admin/DataTable';
import { NEWS_CATEGORIES } from '../../data/newsCategories';

const emptyForm = {
  title: '',
  content: '',
  category: 'general',
  image: '',
  tags: '',
  scope: 'national',
  chapter: '',
  isPublished: true,
  isFeatured: false,
};

const categories = NEWS_CATEGORIES.map((c) => c.value);

export default function ManageNews() {
  const { admin } = useAuth();
  const role = admin?.role || '';
  const isStateAdmin = role === 'state_admin';
  const [articles, setArticles] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    fetchNews();
    fetchChapters();
  }, []);

  const fetchNews = async () => {
    try {
      const { data } = await API.get('/news');
      setArticles(data.news || data || []);
    } catch (err) {
      toast.error('Failed to fetch news');
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
      content: row.content || '',
      category: row.category || 'general',
      image: row.image || '',
      tags: Array.isArray(row.tags) ? row.tags.join(', ') : row.tags || '',
      scope: row.scope || 'national',
      chapter: row.chapter?._id || row.chapter || '',
      isPublished: row.isPublished !== false,
      isFeatured: !!row.isFeatured,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        tags: form.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      };
      if (payload.scope !== 'chapter') delete payload.chapter;

      if (editing) {
        await API.put(`/news/${editing._id}`, payload);
        toast.success('News updated');
      } else {
        await API.post('/news', payload);
        toast.success('News created');
      }
      setShowModal(false);
      fetchNews();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await API.delete(`/news/${confirmDelete._id}`);
      toast.success('News deleted');
      setConfirmDelete(null);
      fetchNews();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const columns = [
    { key: 'title', label: 'Title' },
    {
      key: 'category',
      label: 'Category',
      render: (val) => (
        <span
          style={{
            padding: '2px 8px',
            borderRadius: 4,
            fontSize: 11,
            fontWeight: 600,
            background: '#e5e7eb',
            color: '#374151',
            textTransform: 'capitalize',
          }}
        >
          {val}
        </span>
      ),
    },
    { key: 'scope', label: 'Scope', render: (val) => (val === 'chapter' ? 'Chapter' : 'National') },
    {
      key: 'chapter',
      label: 'Chapter',
      render: (val) => (val && typeof val === 'object' ? val.name : val || '--'),
    },
    {
      key: 'createdAt',
      label: 'Date',
      render: (val) => (val ? new Date(val).toLocaleDateString() : '--'),
    },
    {
      key: 'isPublished',
      label: 'Published',
      render: (val) => (
        <span
          style={{
            color: val !== false ? '#059669' : '#dc2626',
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          {val !== false ? 'Yes' : 'No'}
        </span>
      ),
    },
  ];

  return (
    <div>
      <AdminHeader title="Manage News" breadcrumbs={['News']} />

      <div style={{ padding: '24px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h3 style={{ margin: 0, fontSize: 16, color: '#374151' }}>News Articles</h3>
          <button onClick={openAdd} style={addBtnStyle}>
            + Add News
          </button>
        </div>

        <DataTable
          columns={columns}
          data={articles}
          loading={loading}
          onEdit={openEdit}
          onDelete={(row) => setConfirmDelete(row)}
          canDeleteRows={canDelete(role)}
        />
      </div>

      {/* Form Modal */}
      {showModal && (
        <ModalOverlay onClose={() => setShowModal(false)}>
          <h3 style={{ margin: '0 0 20px', color: '#000066' }}>
            {editing ? 'Edit News' : 'Add News'}
          </h3>
          <form onSubmit={handleSubmit}>
            <FormField label="Title" required>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                style={inputStyle}
              />
            </FormField>
            <FormField label="Content" required>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                required
                rows={6}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </FormField>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <FormField label="Category">
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  style={inputStyle}
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {NEWS_CATEGORIES.find((x) => x.value === c).label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Scope">
                <select
                  value={form.scope}
                  onChange={(e) => setForm({ ...form, scope: e.target.value })}
                  disabled={isStateAdmin}
                  style={{ ...inputStyle, opacity: isStateAdmin ? 0.6 : 1 }}
                >
                  <option value="national">National</option>
                  <option value="chapter">Chapter</option>
                </select>
              </FormField>
            </div>
            {form.scope === 'chapter' && (
              <FormField label="Chapter" required>
                <select
                  value={form.chapter}
                  onChange={(e) => setForm({ ...form, chapter: e.target.value })}
                  required
                  disabled={isStateAdmin}
                  style={{ ...inputStyle, opacity: isStateAdmin ? 0.6 : 1 }}
                >
                  <option value="">-- Select Chapter --</option>
                  {chapters.map((ch) => (
                    <option key={ch._id} value={ch._id}>
                      {ch.name}
                    </option>
                  ))}
                </select>
              </FormField>
            )}
            <FormField label="Image URL">
              <input
                value={form.image}
                onChange={(e) => setForm({ ...form, image: e.target.value })}
                style={inputStyle}
                placeholder="https://..."
              />
            </FormField>
            <FormField label="Tags (comma-separated)">
              <input
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                style={inputStyle}
                placeholder="NIQS, Surveying, Conference"
              />
            </FormField>
            <FormField label="Published">
              <select
                value={form.isPublished ? 'yes' : 'no'}
                onChange={(e) => setForm({ ...form, isPublished: e.target.value === 'yes' })}
                style={inputStyle}
              >
                <option value="yes">Yes</option>
                <option value="no">No (Draft)</option>
              </select>
            </FormField>
            {/* The homepage spotlight holds three articles. The server refuses a
                fourth and says which to un-feature; that message shows as a toast. */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#374151', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} />
                Featured on the homepage (3 slots)
              </label>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button type="button" onClick={() => setShowModal(false)} style={{ ...btnStyle, background: '#e5e7eb', color: '#374151' }}>
                Cancel
              </button>
              <button type="submit" disabled={submitting} style={{ ...btnStyle, background: '#D9B650', color: '#fff', opacity: submitting ? 0.6 : 1 }}>
                {submitting ? 'Saving...' : editing ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </ModalOverlay>
      )}

      {/* Delete Confirm */}
      {confirmDelete && (
        <ModalOverlay onClose={() => setConfirmDelete(null)}>
          <h3 style={{ margin: '0 0 12px', color: '#dc2626' }}>Confirm Delete</h3>
          <p style={{ color: '#374151', fontSize: 14 }}>
            Delete <strong>{confirmDelete.title}</strong>? This cannot be undone.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button onClick={() => setConfirmDelete(null)} style={{ ...btnStyle, background: '#e5e7eb', color: '#374151' }}>
              Cancel
            </button>
            <button onClick={handleDelete} style={{ ...btnStyle, background: '#dc2626', color: '#fff' }}>
              Delete
            </button>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}

/* Shared helpers */
function ModalOverlay({ children, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20 }}
    >
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
