import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { canDelete } from '../../utils/roleHelpers';
import AdminHeader from '../../components/admin/AdminHeader';
import DataTable from '../../components/admin/DataTable';
import Icon from '../../components/common/Icon';
import { shortName } from '../../utils/names';

const emptyForm = {
  name: '',
  shortName: '',
  title: '',
  state: '',
  linkedIn: '',
  image: '',
  bio: '',
  email: '',
  phone: '',
  scope: 'national',
  chapter: '',
  order: 0,
  isActive: true,
};

export default function ManageExco() {
  const { admin } = useAuth();
  const role = admin?.role || '';
  const isStateAdmin = role === 'state_admin';
  const [excos, setExcos] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    fetchExco();
    fetchChapters();
  }, []);

  const fetchExco = async () => {
    try {
      const { data } = await API.get('/exco');
      setExcos(data.exco || data || []);
    } catch (err) {
      toast.error('Failed to fetch exco members');
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
      shortName: row.shortName || '',
      title: row.title || '',
      state: row.state || '',
      linkedIn: row.linkedIn || '',
      image: row.image || '',
      bio: row.bio || '',
      email: row.email || '',
      phone: row.phone || '',
      scope: row.scope || 'national',
      chapter: row.chapter?._id || row.chapter || '',
      order: row.order ?? 0,
      isActive: row.isActive !== false,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...form, order: Number(form.order) };
      if (payload.scope !== 'chapter') delete payload.chapter;

      if (editing) {
        await API.put(`/exco/${editing._id}`, payload);
        toast.success('Exco member updated');
      } else {
        await API.post('/exco', payload);
        toast.success('Exco member created');
      }
      setShowModal(false);
      fetchExco();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await API.delete(`/exco/${confirmDelete._id}`);
      toast.success('Exco member deleted');
      setConfirmDelete(null);
      fetchExco();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const columns = [
    {
      key: 'image',
      label: '',
      render: (val) => val ? (
        <img src={val} alt="" style={{ width: 36, height: 44, objectFit: 'cover', objectPosition: 'top', borderRadius: 6, border: '1px solid #e5e7eb', display: 'block' }} />
      ) : (
        <div style={{ width: 36, height: 44, borderRadius: 6, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}><Icon name="user" size="sm" /></div>
      ),
    },
    { key: 'name', label: 'Name' },
    { key: 'title', label: 'Title / Position' },
    { key: 'state', label: 'State', render: (val) => val || '--' },
    {
      key: 'scope',
      label: 'Scope',
      render: (val) => {
        const map = { national: 'NEC (National)', npc: 'NPC Committee', 'body-heads': 'Body Chairmen', bot: 'Board of Trustees', chapter: 'Chapter' };
        const bg = { npc: '#fef3c7', 'body-heads': '#d1fae5', bot: '#ffe4e6', chapter: '#ede9fe' };
        const fg = { npc: '#92400e', 'body-heads': '#065f46', bot: '#9f1239', chapter: '#5b21b6' };
        return (
          <span style={{
            padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
            background: bg[val] || '#dbeafe',
            color: fg[val] || '#1e40af',
          }}>
            {map[val] || val}
          </span>
        );
      },
    },
    {
      key: 'chapter',
      label: 'Chapter',
      render: (val) => (val && typeof val === 'object' ? val.name : val || '--'),
    },
    { key: 'order', label: 'Order' },
    {
      key: 'isActive',
      label: 'Active',
      render: (val) => (
        <span style={{ color: val !== false ? '#059669' : '#dc2626', fontWeight: 600, fontSize: 13 }}>
          {val !== false ? 'Yes' : 'No'}
        </span>
      ),
    },
  ];

  return (
    <div>
      <AdminHeader title="Manage Exco Members (NEC, NPC, Bodies &amp; BOT)" breadcrumbs={['Exco Members']} />

      <div style={{ padding: '24px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h3 style={{ margin: 0, fontSize: 16, color: '#374151' }}>Exco Members</h3>
          <button onClick={openAdd} style={addBtnStyle}>+ Add Exco Member</button>
        </div>

        <DataTable
          columns={columns}
          data={excos}
          loading={loading}
          onEdit={openEdit}
          onDelete={(row) => setConfirmDelete(row)}
          canDeleteRows={canDelete(role)}
        />
      </div>

      {showModal && (
        <ModalOverlay onClose={() => setShowModal(false)}>
          <h3 style={{ margin: '0 0 20px', color: '#000066' }}>
            {editing ? 'Edit Exco Member' : 'Add Exco Member'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <FormField label="Full Name" required>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required style={inputStyle} />
              </FormField>
              <FormField label="Title / Position" required>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required style={inputStyle} placeholder="e.g. President" />
              </FormField>
            </div>
            <FormField label="Short name (optional — overrides the automatic initials)">
              <input value={form.shortName} onChange={(e) => setForm({ ...form, shortName: e.target.value })} style={inputStyle} placeholder={shortName(form.name) || 'e.g. QS K. C. Nzekwe, FNIQS'} />
            </FormField>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <FormField label="State">
                <input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} style={inputStyle} placeholder="e.g. Lagos State" />
              </FormField>
              <FormField label="LinkedIn Profile URL">
                <input value={form.linkedIn} onChange={(e) => setForm({ ...form, linkedIn: e.target.value })} style={inputStyle} placeholder="https://linkedin.com/in/..." />
              </FormField>
            </div>
            <FormField label="Photo URL">
              <input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} style={inputStyle} placeholder="https://..." />
            </FormField>
            {form.image && (
              <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                <img src={form.image} alt="Preview" style={{ width: 60, height: 74, objectFit: 'cover', objectPosition: 'top', borderRadius: 8, border: '1px solid #e5e7eb' }} />
                <span style={{ fontSize: 12, color: '#9ca3af' }}>Photo preview</span>
              </div>
            )}
            <FormField label="Bio">
              <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            </FormField>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <FormField label="Email">
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inputStyle} />
              </FormField>
              <FormField label="Phone">
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} style={inputStyle} />
              </FormField>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <FormField label="Scope / Committee">
                <select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} disabled={isStateAdmin} style={{ ...inputStyle, opacity: isStateAdmin ? 0.6 : 1 }}>
                  <option value="national">NEC — National Executive Council</option>
                  <option value="npc">NPC — National Policy Committee</option>
                  <option value="body-heads">National Body Chairmen</option>
                  <option value="bot">Incorporated Board of Trustees</option>
                  <option value="chapter">Chapter Exco</option>
                </select>
              </FormField>
              <FormField label="Display Order">
                <input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} style={inputStyle} min="0" />
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
            <FormField label="Active">
              <select value={form.isActive ? 'yes' : 'no'} onChange={(e) => setForm({ ...form, isActive: e.target.value === 'yes' })} style={inputStyle}>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </FormField>
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
          <p style={{ color: '#374151', fontSize: 14 }}>Delete <strong>{confirmDelete.name}</strong>?</p>
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
