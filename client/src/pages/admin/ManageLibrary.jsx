import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { canDelete } from '../../utils/roleHelpers';
import AdminHeader from '../../components/admin/AdminHeader';
import DataTable from '../../components/admin/DataTable';
import FileUpload from '../../components/common/FileUpload';
import Icon from '../../components/common/Icon';
import { libraryApi, TYPE_LABEL, LIBRARY_TYPES, LIBRARY_CATEGORIES } from '../../api/libraryApi';

const emptyForm = {
  title: '', subtitle: '', authors: '', description: '', type: 'book', category: 'General', tags: '',
  publisher: 'NIQS', year: new Date().getFullYear(), pages: '', isbn: '', coverImage: '', fileUrl: '',
  fileSize: 0, storage: 'local', access: 'members', cpdHours: 0, isFeatured: false, isPublished: true, sortOrder: 0,
};

const list = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean);

export default function ManageLibrary() {
  const { admin } = useAuth();
  const role = admin?.role || '';
  const [items, setItems]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [editing, setEditing]       = useState(null);
  const [form, setForm]             = useState({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    try { const d = await libraryApi.adminAll(); setItems(d.items || []); }
    catch { toast.error('Failed to load the library'); }
    finally { setLoading(false); }
  };

  const openAdd = () => { setEditing(null); setForm({ ...emptyForm }); setShowModal(true); };
  const openEdit = (row) => {
    setEditing(row);
    setForm({
      ...emptyForm,
      ...Object.fromEntries(Object.keys(emptyForm).map((k) => [k, row[k] ?? emptyForm[k]])),
      authors: (row.authors || []).join(', '),
      tags: (row.tags || []).join(', '),
    });
    setShowModal(true);
  };

  const f = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true);
    const body = {
      ...form,
      authors: list(form.authors),
      tags: list(form.tags),
      year: form.year ? Number(form.year) : undefined,
      pages: Number(form.pages) || 0,
      cpdHours: Number(form.cpdHours) || 0,
      sortOrder: Number(form.sortOrder) || 0,
    };
    try {
      if (editing) { await libraryApi.update(editing._id, body); toast.success('Title updated'); }
      else         { await libraryApi.create(body);              toast.success('Title added to the library'); }
      setShowModal(false); fetchItems();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const togglePublished = async (row) => {
    try { await libraryApi.update(row._id, { isPublished: !row.isPublished }); fetchItems(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try { await libraryApi.remove(confirmDelete._id); toast.success('Deleted'); setConfirmDelete(null); fetchItems(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const totals = {
    titles: items.length,
    published: items.filter((i) => i.isPublished).length,
    readers: items.reduce((t, i) => t + (i.readers || 0), 0),
    opens: items.reduce((t, i) => t + (i.openCount || 0), 0),
  };

  const columns = [
    {
      key: 'coverImage', label: 'Cover',
      render: (val, row) => val
        ? <img src={val} alt={row.title} style={{ width: 40, height: 54, objectFit: 'cover', borderRadius: 3, border: '1px solid #e5e7eb' }} />
        : <div style={{ width: 40, height: 54, borderRadius: 3, background: '#000066', color: '#D9B650', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="book" size="sm" /></div>,
    },
    {
      key: 'title', label: 'Title',
      render: (v, row) => (
        <div>
          <strong style={{ color: '#000066', fontSize: 13 }}>{v}</strong>
          {row.isFeatured && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: '#8a6a12', background: 'rgba(217,182,80,.18)', padding: '1px 6px', borderRadius: 8 }}>Featured</span>}
          <div style={{ fontSize: 11, color: '#6b7280' }}>{row.category}</div>
        </div>
      ),
    },
    { key: 'type', label: 'Format', render: (v) => TYPE_LABEL[v] || v },
    { key: 'access', label: 'Access', render: (v) => v === 'public'
      ? <span style={{ color: '#8a6a12', fontWeight: 600, fontSize: 12 }}>Free</span>
      : <span style={{ color: '#000066', fontWeight: 600, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 3 }}><Icon name="lock" size={12} /> Members</span> },
    { key: 'openCount', label: 'Opens', render: (v) => v || 0 },
    { key: 'readers', label: 'Readers', render: (v, row) => `${v || 0}${row.completions ? ` · ${row.completions} done` : ''}` },
    { key: 'fileUrl', label: 'File', render: (v) => v ? <a href={v} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', fontSize: 12 }}>View ↗</a> : <span style={{ color: '#dc2626', fontSize: 12 }}>Missing</span> },
    {
      key: 'isPublished', label: 'Status',
      render: (v, row) => (
        <button type="button" onClick={() => togglePublished(row)} title="Click to toggle"
          style={{ border: 'none', background: 'none', cursor: 'pointer', color: v ? '#059669' : '#9ca3af', fontWeight: 600, fontSize: 12, padding: 0 }}>
          {v ? 'Published' : 'Draft'}
        </button>
      ),
    },
  ];

  return (
    <div>
      <AdminHeader title="Digital Library" subtitle="Books, standards, guides and courses for members. Members-only files are handed out only to signed-in members." breadcrumbs={['Digital Library']} />
      <div style={{ padding: '24px 28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 22 }}>
          {[['Titles', totals.titles], ['Published', totals.published], ['Members reading', totals.readers], ['Times opened', totals.opens]].map(([l, v]) => (
            <div key={l} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 600 }}>{l}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#000066', marginTop: 4 }}>{v}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, gap: 12, flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0, fontSize: 16, color: '#374151' }}>All Titles <span style={{ color: '#9ca3af', fontWeight: 400 }}>({items.length})</span></h3>
          <div style={{ display: 'flex', gap: 10 }}>
            <a href="/library" target="_blank" rel="noopener noreferrer" style={{ ...addBtn, background: '#fff', color: '#000066', border: '1px solid #d1d5db', textDecoration: 'none' }}>View library ↗</a>
            <button onClick={openAdd} style={addBtn}>+ Add Title</button>
          </div>
        </div>
        <DataTable columns={columns} data={items} loading={loading} onEdit={openEdit} onDelete={(row) => setConfirmDelete(row)} canDeleteRows={canDelete(role)} />
      </div>

      {showModal && (
        <Modal onClose={() => setShowModal(false)} title={editing ? 'Edit Title' : 'Add Title to the Library'}>
          <form onSubmit={handleSubmit}>
            <FF label="Title" required><input value={form.title} required style={inp} onChange={(e) => f('title', e.target.value)} placeholder="e.g. Standard Method of Measurement for Building Works" /></FF>
            <FF label="Subtitle"><input value={form.subtitle} style={inp} onChange={(e) => f('subtitle', e.target.value)} /></FF>
            <FF label="Authors" hint="Separate with commas"><input value={form.authors} style={inp} onChange={(e) => f('authors', e.target.value)} placeholder="NIQS Technical Committee" /></FF>

            <div style={grid2}>
              <FF label="Format">
                <select value={form.type} style={inp} onChange={(e) => f('type', e.target.value)}>
                  {LIBRARY_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
                </select>
              </FF>
              <FF label="Subject">
                <input list="lib-categories" value={form.category} style={inp} onChange={(e) => f('category', e.target.value)} />
                <datalist id="lib-categories">{LIBRARY_CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>
              </FF>
            </div>

            <FF label="Description"><textarea value={form.description} rows={4} style={{ ...inp, resize: 'vertical' }} onChange={(e) => f('description', e.target.value)} /></FF>
            <FF label="Tags" hint="Separate with commas; used by search"><input value={form.tags} style={inp} onChange={(e) => f('tags', e.target.value)} placeholder="smm, measurement, building" /></FF>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <FF label="Publisher"><input value={form.publisher} style={inp} onChange={(e) => f('publisher', e.target.value)} /></FF>
              <FF label="Year"><input type="number" value={form.year} style={inp} min={1900} max={2100} onChange={(e) => f('year', e.target.value)} /></FF>
              <FF label="Pages"><input type="number" value={form.pages} style={inp} min={0} onChange={(e) => f('pages', e.target.value)} /></FF>
            </div>
            <div style={grid2}>
              <FF label="ISBN"><input value={form.isbn} style={inp} onChange={(e) => f('isbn', e.target.value)} /></FF>
              <FF label="CPD hours on completion"><input type="number" value={form.cpdHours} style={inp} min={0} step={0.5} onChange={(e) => f('cpdHours', e.target.value)} /></FF>
            </div>

            <FF label="Cover Image" hint="Portrait, 3:4. Leave empty for a navy-and-gold cover drawn from the title.">
              <FileUpload label="Upload cover image" accept="image/*" currentUrl={form.coverImage}
                onUpload={(url) => f('coverImage', url)} onError={(msg) => toast.error(msg)} />
              <input value={form.coverImage} style={{ ...inp, marginTop: 6 }} placeholder="…or paste image URL" onChange={(e) => f('coverImage', e.target.value)} />
            </FF>

            <FF label="File" hint="PDF, slides or video. Or paste a link to a course or video page.">
              <FileUpload label="Upload file" accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.mp4,application/pdf,video/*" maxMB={500} currentUrl={form.fileUrl}
                onUpload={(url, meta) => setForm((p) => ({ ...p, fileUrl: url, fileSize: meta?.size || 0, storage: meta?.storage || 'local' }))}
                onError={(msg) => toast.error(msg)} />
              <input value={form.fileUrl} style={{ ...inp, marginTop: 6 }} placeholder="…or paste a URL"
                onChange={(e) => setForm((p) => ({ ...p, fileUrl: e.target.value, storage: 'external', fileSize: 0 }))} />
            </FF>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <FF label="Who can open it">
                <select value={form.access} style={inp} onChange={(e) => f('access', e.target.value)}>
                  <option value="members">Members only</option>
                  <option value="public">Everyone (free)</option>
                </select>
              </FF>
              <FF label="Status">
                <select value={form.isPublished ? 'yes' : 'no'} style={inp} onChange={(e) => f('isPublished', e.target.value === 'yes')}>
                  <option value="yes">Published</option><option value="no">Draft</option>
                </select>
              </FF>
              <FF label="Sort Order"><input type="number" value={form.sortOrder} style={inp} onChange={(e) => f('sortOrder', e.target.value)} /></FF>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#374151', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.isFeatured} onChange={(e) => f('isFeatured', e.target.checked)} />
              Feature on the library's front shelf
            </label>
            <Btns onCancel={() => setShowModal(false)} submitting={submitting} editing={!!editing} />
          </form>
        </Modal>
      )}

      {confirmDelete && (
        <Modal onClose={() => setConfirmDelete(null)} title="Confirm Delete">
          <p style={{ color: '#374151', fontSize: 14 }}>
            Delete <strong>{confirmDelete.title}</strong>? Members' reading progress on it is removed too.
            To hide it without losing that, set it to Draft instead.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button onClick={() => setConfirmDelete(null)} style={{ ...btn, background: '#e5e7eb', color: '#374151' }}>Cancel</button>
            <button onClick={handleDelete} style={{ ...btn, background: '#dc2626', color: '#fff' }}>Delete</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, onClose, title }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, padding: '24px 28px', width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <h3 style={{ margin: '0 0 20px', color: '#000066' }}>{title}</h3>
        {children}
      </div>
    </div>
  );
}
function FF({ label, required, hint, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
        {label} {required && <span style={{ color: '#dc2626' }}>*</span>}
        {hint && <span style={{ fontWeight: 400, color: '#9ca3af', fontSize: 12, marginLeft: 6 }}>{hint}</span>}
      </label>
      {children}
    </div>
  );
}
function Btns({ onCancel, submitting, editing }) {
  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
      <button type="button" onClick={onCancel} style={{ ...btn, background: '#e5e7eb', color: '#374151' }}>Cancel</button>
      <button type="submit" disabled={submitting} style={{ ...btn, background: '#D9B650', color: '#fff', opacity: submitting ? .6 : 1 }}>
        {submitting ? 'Saving…' : editing ? 'Update' : 'Add Title'}
      </button>
    </div>
  );
}
const inp    = { width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, color: '#111827', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };
const btn    = { padding: '10px 22px', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 14, cursor: 'pointer' };
const addBtn = { padding: '10px 20px', background: '#D9B650', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 14, cursor: 'pointer' };
const grid2  = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 };
