import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { canDelete, canManageNational } from '../../utils/roleHelpers';
import AdminHeader from '../../components/admin/AdminHeader';
import DataTable from '../../components/admin/DataTable';
import Icon from '../../components/common/Icon';

const ZONES = ['South West','South East','South South','North West','North East','North Central'];

const emptyForm = {
  name:        '',
  state:       '',
  zone:        '',
  chairperson: '',
  secretary:   '',
  address:     '',
  email:       '',
  phone:       '',
  website:     '',
  pinLat:      '',
  pinLng:      '',
  pinLabel:    '',
  about:       '',
  image:       '',
  memberCount: 0,
  firmCount:   0,
  isActive:    true,
};

export default function ManageChapters() {
  const { admin } = useAuth();
  const role        = admin?.role || '';
  const isStateAdmin = role === 'state_admin';
  const myChapterId  = admin?.chapter?._id || admin?.chapter || admin?.assignedChapter || '';

  const [chapters, setChapters]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showModal, setShowModal]     = useState(false);
  const [editing, setEditing]         = useState(null);
  const [form, setForm]               = useState({ ...emptyForm });
  const [submitting, setSubmitting]   = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => { fetchChapters(); }, []);

  const fetchChapters = async () => {
    try {
      const { data } = await API.get('/chapters');
      setChapters(data.chapters || data || []);
    } catch { toast.error('Failed to fetch chapters'); }
    finally { setLoading(false); }
  };

  const canEditChapter = (row) => {
    if (canManageNational(role)) return true;
    if (isStateAdmin && myChapterId && row._id === myChapterId) return true;
    return false;
  };

  const openAdd = () => {
    if (isStateAdmin) { toast.error('State admins cannot create chapters'); return; }
    setEditing(null);
    setForm({ ...emptyForm });
    setShowModal(true);
  };

  const openEdit = (row) => {
    if (!canEditChapter(row)) { toast.error('You can only edit your own chapter'); return; }
    setEditing(row);
    setForm({
      name:        row.name        || '',
      state:       row.state       || '',
      zone:        row.zone        || '',
      chairperson: row.chairperson || '',
      secretary:   row.secretary   || '',
      address:     row.address     || '',
      email:       row.email       || '',
      phone:       row.phone       || '',
      website:     row.website     || '',
      pinLat:      row.pinLat ?? '',
      pinLng:      row.pinLng ?? '',
      pinLabel:    row.pinLabel    || '',
      about:       row.about       || '',
      image:       row.image       || '',
      memberCount: row.memberCount ?? 0,
      firmCount:   row.firmCount   ?? 0,
      isActive:    row.isActive !== false,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        memberCount: Number(form.memberCount) || 0,
        firmCount:   Number(form.firmCount)   || 0,
        // Blank clears the pin (back to the state capital), so send null, not "".
        pinLat:      form.pinLat === '' ? null : Number(form.pinLat),
        pinLng:      form.pinLng === '' ? null : Number(form.pinLng),
      };
      if (editing) {
        await API.put(`/chapters/${editing._id}`, payload);
        toast.success('Chapter updated');
      } else {
        await API.post('/chapters', payload);
        toast.success('Chapter created');
      }
      setShowModal(false);
      fetchChapters();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await API.delete(`/chapters/${confirmDelete._id}`);
      toast.success('Chapter deleted');
      setConfirmDelete(null);
      fetchChapters();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to delete'); }
  };

  /* For state_admin: only show their chapter */
  const displayChapters = isStateAdmin && myChapterId
    ? chapters.filter(c => c._id === myChapterId)
    : chapters;

  const columns = [
    { key: 'name', label: 'Chapter Name' },
    { key: 'zone', label: 'Zone', render: (v) => v || '--' },
    { key: 'chairperson', label: 'Chair', render: (v) => v || '--' },
    { key: 'memberCount', label: 'Members', render: (v) => v || '--' },
    { key: 'firmCount', label: 'Firms', render: (v) => v || '--' },
    { key: 'isActive', label: 'Active',
      render: (v) => <span style={{ color: v !== false ? '#059669' : '#dc2626', fontWeight: 600, fontSize: 13 }}>{v !== false ? 'Yes' : 'No'}</span>
    },
  ];

  return (
    <div>
      <AdminHeader title={isStateAdmin ? 'My Chapter' : 'Manage Chapters'} breadcrumbs={['Chapters']} />

      <div style={{ padding: '24px 28px' }}>
        {/* Info banner for state admin */}
        {isStateAdmin && (
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 16px', marginBottom: 18, fontSize: 13, color: '#1e40af' }}>
            As a State Chapter Admin, you can update your chapter's details below. To manage chapter leaders, use <strong>Exco Members</strong> in the sidebar.
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h3 style={{ margin: 0, fontSize: 16, color: '#374151' }}>
            {isStateAdmin ? 'Your Chapter' : `All Chapters (${chapters.length})`}
          </h3>
          {canManageNational(role) && (
            <button onClick={openAdd} style={addBtnStyle}>+ Add Chapter</button>
          )}
        </div>

        <DataTable
          columns={columns}
          data={displayChapters}
          loading={loading}
          onEdit={openEdit}
          onDelete={canDelete(role) ? (row) => setConfirmDelete(row) : null}
          canDeleteRows={canDelete(role)}
        />
      </div>

      {/* ── ADD / EDIT MODAL ── */}
      {showModal && (
        <ModalOverlay onClose={() => setShowModal(false)}>
          <h3 style={{ margin: '0 0 6px', color: '#000066' }}>{editing ? 'Edit Chapter' : 'Add Chapter'}</h3>
          <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 20 }}>
            {editing ? `Editing: ${editing.name}` : 'Create a new NIQS state chapter'}
          </p>
          <form onSubmit={handleSubmit}>

            {/* IDENTITY */}
            <SectionLabel>Chapter Identity</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <FormField label="Chapter Name" required>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required style={inputStyle} placeholder="e.g. Lagos Chapter" disabled={isStateAdmin} />
              </FormField>
              <FormField label="State" required>
                <input value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} required style={inputStyle} placeholder="e.g. Lagos" disabled={isStateAdmin} />
              </FormField>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <FormField label="Geopolitical Zone">
                <select value={form.zone} onChange={e => setForm({ ...form, zone: e.target.value })} style={inputStyle} disabled={isStateAdmin}>
                  <option value="">-- Select Zone --</option>
                  {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
                </select>
              </FormField>
              <FormField label="Registered QS">
                <input type="number" value={form.memberCount} onChange={e => setForm({ ...form, memberCount: e.target.value })} style={inputStyle} min="0" placeholder="0" />
              </FormField>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <FormField label="QS Firms">
                <input type="number" value={form.firmCount} onChange={e => setForm({ ...form, firmCount: e.target.value })} style={inputStyle} min="0" placeholder="0" />
              </FormField>
              <div />
            </div>
            <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 14, marginTop: -6 }}>
              <Icon name="idea" size="sm" /> Leave a count at 0 and that statistic is simply hidden on the public chapter page — no placeholder dash is shown.
            </p>

            {/* CONTACT */}
            <SectionLabel>Contact Details</SectionLabel>
            <FormField label="Address">
              <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} style={inputStyle} placeholder="Secretariat address" />
            </FormField>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <FormField label="Email">
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={inputStyle} placeholder="chapter@niqs.org.ng" />
              </FormField>
              <FormField label="Phone">
                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={inputStyle} />
              </FormField>
            </div>
            <FormField label="Website URL">
              <input value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} style={inputStyle} placeholder="https://..." />
            </FormField>

            {/* MAP PIN — empty means the state capital, which is where most
                chapter secretariats are. Coordinates come from Google Maps:
                right-click the office, and the first menu line is "lat, lng". */}
            <SectionLabel>Map Pin (Chapter Secretariat)</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.4fr', gap: 14 }}>
              <FormField label="Latitude">
                <input type="number" step="0.0001" value={form.pinLat} onChange={e => setForm({ ...form, pinLat: e.target.value })} style={inputStyle} placeholder="e.g. 7.6211" />
              </FormField>
              <FormField label="Longitude">
                <input type="number" step="0.0001" value={form.pinLng} onChange={e => setForm({ ...form, pinLng: e.target.value })} style={inputStyle} placeholder="e.g. 5.2214" />
              </FormField>
              <FormField label="Place name">
                <input value={form.pinLabel} onChange={e => setForm({ ...form, pinLabel: e.target.value })} style={inputStyle} placeholder="e.g. Ado-Ekiti" />
              </FormField>
            </div>
            <p style={{ fontSize: '.78rem', color: 'var(--color-txt-3)', margin: '-4px 0 8px' }}>
              Leave blank to pin the state capital.
            </p>

            {/* LEADERSHIP (text fields — full portrait management is in Exco Members) */}
            <SectionLabel>Leadership (Quick Entry)</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <FormField label="Chairperson Name">
                <input value={form.chairperson} onChange={e => setForm({ ...form, chairperson: e.target.value })} style={inputStyle} placeholder="Surv. [Name], MNIQS" />
              </FormField>
              <FormField label="Secretary Name">
                <input value={form.secretary} onChange={e => setForm({ ...form, secretary: e.target.value })} style={inputStyle} placeholder="Surv. [Name], MNIQS" />
              </FormField>
            </div>
            <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 14, marginTop: -6 }}>
              <Icon name="idea" size="sm" /> For full leadership profiles with photos, use <strong>Exco Members</strong> → scope: Chapter Exco.
            </p>

            {/* ABOUT + IMAGE */}
            <SectionLabel>About &amp; Media</SectionLabel>
            <FormField label="About This Chapter">
              <textarea value={form.about} onChange={e => setForm({ ...form, about: e.target.value })} rows={4} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Describe the chapter's activities and focus…" />
            </FormField>
            <FormField label="Chapter Photo URL">
              <input value={form.image} onChange={e => setForm({ ...form, image: e.target.value })} style={inputStyle} placeholder="https://..." />
            </FormField>
            {form.image && (
              <div style={{ marginBottom: 14 }}>
                <img src={form.image} alt="preview" style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb' }} />
              </div>
            )}

            {!isStateAdmin && (
              <FormField label="Active">
                <select value={form.isActive ? 'yes' : 'no'} onChange={e => setForm({ ...form, isActive: e.target.value === 'yes' })} style={inputStyle}>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </FormField>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20, paddingTop: 16, borderTop: '1px solid #f3f4f6' }}>
              <button type="button" onClick={() => setShowModal(false)} style={{ ...btnStyle, background: '#e5e7eb', color: '#374151' }}>Cancel</button>
              <button type="submit" disabled={submitting} style={{ ...btnStyle, background: '#D9B650', color: '#fff', opacity: submitting ? 0.6 : 1 }}>
                {submitting ? 'Saving…' : editing ? 'Save Changes' : 'Create Chapter'}
              </button>
            </div>
          </form>
        </ModalOverlay>
      )}

      {confirmDelete && (
        <ModalOverlay onClose={() => setConfirmDelete(null)}>
          <h3 style={{ margin: '0 0 12px', color: '#dc2626' }}>Confirm Delete</h3>
          <p style={{ color: '#374151', fontSize: 14 }}>Delete chapter <strong>{confirmDelete.name}</strong>? This cannot be undone.</p>
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
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, padding: '24px 28px', width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        {children}
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <h4 style={{ margin: '18px 0 10px', fontSize: 11, fontWeight: 700, color: '#000066', textTransform: 'uppercase', letterSpacing: '.08em', borderBottom: '1px solid #f3f4f6', paddingBottom: 6 }}>
      {children}
    </h4>
  );
}

function FormField({ label, required, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
        {label}{required && <span style={{ color: '#dc2626' }}> *</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle  = { width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, color: '#111827', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };
const btnStyle    = { padding: '10px 22px', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 14, cursor: 'pointer' };
const addBtnStyle = { padding: '10px 20px', background: '#D9B650', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 14, cursor: 'pointer' };
