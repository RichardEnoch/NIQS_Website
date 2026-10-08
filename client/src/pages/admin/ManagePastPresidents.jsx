import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { canDelete, canManageNational } from '../../utils/roleHelpers';
import AdminHeader from '../../components/admin/AdminHeader';
import DataTable from '../../components/admin/DataTable';
import Icon from '../../components/common/Icon';
import { shortName } from '../../utils/names';

const emptyForm = {
  name:     '',
  shortName:     '',
  term:     '',
  info:     '',
  image:    '',
  linkedIn: '',
  order:    0,
  isActive: true,
};

export default function ManagePastPresidents() {
  const { admin } = useAuth();
  const role = admin?.role || '';
  const [list, setList]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState(null);
  const [form, setForm]           = useState({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => { fetchList(); }, []);

  const fetchList = async () => {
    try {
      const { data } = await API.get('/past-presidents/admin');
      setList(Array.isArray(data) ? data : []);
    } catch {
      // fall back to public endpoint
      try {
        const { data } = await API.get('/past-presidents');
        setList(Array.isArray(data) ? data : []);
      } catch {
        toast.error('Failed to load past presidents');
      }
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setShowModal(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      shortName:     row.shortName || '',
      term:     row.term || '',
      info:     row.info || '',
      image:    row.image || '',
      linkedIn: row.linkedIn || '',
      order:    row.order ?? 0,
      isActive: row.isActive !== false,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...form, order: Number(form.order) };
      if (editing) {
        await API.put(`/past-presidents/${editing._id}`, payload);
        toast.success('Updated successfully');
      } else {
        await API.post('/past-presidents', payload);
        toast.success('Past president added');
      }
      setShowModal(false);
      fetchList();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await API.delete(`/past-presidents/${confirmDelete._id}`);
      toast.success('Deleted successfully');
      setConfirmDelete(null);
      fetchList();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const columns = [
    {
      key: 'image',
      label: '',
      render: (val) => val ? (
        <img src={val} alt="" style={{ width: 36, height: 36, objectFit: 'cover', objectPosition: 'top', borderRadius: '50%', border: '2px solid #e5e7eb', display: 'block' }} />
      ) : (
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}><Icon name="user" size="sm" /></div>
      ),
    },
    { key: 'name', label: 'Name' },
    { key: 'term', label: 'Term' },
    { key: 'info', label: 'Note', render: (val) => val || '--' },
    {
      key: 'linkedIn',
      label: 'LinkedIn',
      render: (val) => val ? (
        <a href={val} target="_blank" rel="noopener noreferrer" style={{ color: '#0077b5', fontSize: 12, fontWeight: 600 }}>in ↗</a>
      ) : <span style={{ color: '#d1d5db', fontSize: 12 }}>—</span>,
    },
    { key: 'order', label: 'Order' },
    {
      key: 'isActive',
      label: 'Visible',
      render: (val) => (
        <span style={{ color: val !== false ? '#059669' : '#dc2626', fontWeight: 600, fontSize: 13 }}>
          {val !== false ? 'Yes' : 'No'}
        </span>
      ),
    },
  ];

  return (
    <div>
      <AdminHeader title="Past Presidents" breadcrumbs={['Past Presidents']} />

      <div style={{ padding: '24px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h3 style={{ margin: 0, fontSize: 16, color: '#374151' }}>Past Presidents</h3>
          {canManageNational(role) && (
            <button onClick={openAdd} style={addBtnStyle}>+ Add Past President</button>
          )}
        </div>

        <DataTable
          columns={columns}
          data={list}
          loading={loading}
          onEdit={canManageNational(role) ? openEdit : null}
          onDelete={(row) => setConfirmDelete(row)}
          canDeleteRows={canDelete(role)}
        />
      </div>

      {/* ── ADD / EDIT MODAL ── */}
      {showModal && (
        <ModalOverlay onClose={() => setShowModal(false)}>
          <h3 style={{ margin: '0 0 20px', color: '#000066' }}>
            {editing ? 'Edit Past President' : 'Add Past President'}
          </h3>
          <form onSubmit={handleSubmit}>
            <FormField label="Full Name" required>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required style={inputStyle} placeholder="Arc. Dr. [Name], FNIQS" />
            </FormField>
            <FormField label="Short name (optional — overrides the automatic initials)">
                <input value={form.shortName} onChange={e => setForm({ ...form, shortName: e.target.value })} style={inputStyle} placeholder={shortName(form.name) || 'e.g. QS K. C. Nzekwe, FNIQS'} />
              </FormField>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <FormField label="Term of Office" required>
                <input value={form.term} onChange={e => setForm({ ...form, term: e.target.value })} required style={inputStyle} placeholder="e.g. 2020 – 2024" />
              </FormField>
              <FormField label="Note / Info">
                <input value={form.info} onChange={e => setForm({ ...form, info: e.target.value })} style={inputStyle} placeholder="e.g. Immediate Past President" />
              </FormField>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <FormField label="Portrait Photo URL">
                <input value={form.image} onChange={e => setForm({ ...form, image: e.target.value })} style={inputStyle} placeholder="https://..." />
              </FormField>
              <FormField label="LinkedIn Profile URL">
                <input value={form.linkedIn} onChange={e => setForm({ ...form, linkedIn: e.target.value })} style={inputStyle} placeholder="https://linkedin.com/in/..." />
              </FormField>
            </div>
            {form.image && (
              <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                <img src={form.image} alt="Preview" style={{ width: 52, height: 52, objectFit: 'cover', objectPosition: 'top', borderRadius: '50%', border: '2px solid #e5e7eb' }} />
                <span style={{ fontSize: 12, color: '#9ca3af' }}>Portrait preview</span>
                {form.linkedIn && (
                  <a href={form.linkedIn} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#0077b5', textDecoration: 'underline' }}>Test LinkedIn ↗</a>
                )}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <FormField label="Display Order">
                <input type="number" value={form.order} onChange={e => setForm({ ...form, order: e.target.value })} style={inputStyle} min="0" placeholder="0 = first" />
              </FormField>
              <FormField label="Visible on Website">
                <select value={form.isActive ? 'yes' : 'no'} onChange={e => setForm({ ...form, isActive: e.target.value === 'yes' })} style={inputStyle}>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </FormField>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button type="button" onClick={() => setShowModal(false)} style={{ ...btnStyle, background: '#e5e7eb', color: '#374151' }}>Cancel</button>
              <button type="submit" disabled={submitting} style={{ ...btnStyle, background: '#D9B650', color: '#fff', opacity: submitting ? 0.6 : 1 }}>
                {submitting ? 'Saving...' : editing ? 'Update' : 'Add'}
              </button>
            </div>
          </form>
        </ModalOverlay>
      )}

      {/* ── DELETE CONFIRM ── */}
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
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, padding: '24px 28px', width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
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

const inputStyle  = { width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, color: '#111827', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };
const btnStyle    = { padding: '10px 22px', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 14, cursor: 'pointer' };
const addBtnStyle = { padding: '10px 20px', background: '#D9B650', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 14, cursor: 'pointer' };
