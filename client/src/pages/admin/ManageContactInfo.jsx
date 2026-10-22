import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import AdminHeader from '../../components/admin/AdminHeader';

/* Which body each role owns */
const ROLE_BODY = {
  main_admin:     null,       // can edit all — shown as tabs
  national_admin: 'national',
  waqsn_admin:    'waqsn',
  yqsf_admin:     'yqsf',
};

const BODY_LABELS = {
  national: 'NIQS National Secretariat',
  waqsn:    'WAQSN — Women Association of Quantity Surveyors in Nigeria',
  yqsf:     'YQSF — Young Quantity Surveyors Forum',
};

const TABS = [
  { key: 'national', label: 'NIQS National' },
  { key: 'waqsn',    label: 'WAQSN'         },
  { key: 'yqsf',     label: 'YQSF'          },
];

const EMPTY = {
  label: '', phone1: '', phone2: '', email1: '', email2: '',
  address: '', officeHours: '', websiteUrl: '',
  twitterUrl: '', facebookUrl: '', linkedinUrl: '', instagramUrl: '',
};

function Field({ label, name, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', fontSize: '.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--color-txt-3)', marginBottom: '.4rem' }}>
        {label}
      </label>
      <input
        type={type} name={name} value={value} onChange={onChange} placeholder={placeholder}
        style={{ width: '100%', padding: '10px 12px', fontSize: '.84rem', borderRadius: 8, border: '1.5px solid var(--color-bdr)', background: 'var(--color-off)', fontFamily: 'var(--font-body)', color: 'var(--color-txt)' }}
        onFocus={e => { e.target.style.borderColor = 'var(--color-navy)'; e.target.style.background = '#fff'; }}
        onBlur={e => { e.target.style.borderColor = 'var(--color-bdr)'; e.target.style.background = 'var(--color-off)'; }}
      />
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '.7rem', textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--color-txt-3)', borderBottom: '1px solid var(--color-bdr)', paddingBottom: '.5rem', marginBottom: '1.2rem', marginTop: '2rem' }}>
      {children}
    </div>
  );
}

function BodyForm({ bodyKey, onSaved }) {
  const [form, setForm]     = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    API.get(`/contact-info/${bodyKey}`)
      .then(res => setForm(prev => ({ ...prev, ...res.data })))
      .catch(() => {});
  }, [bodyKey]);

  const handleChange = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await API.put(`/contact-info/${bodyKey}`, form);
      toast.success(`${BODY_LABELS[bodyKey]} contact info saved`);
      if (onSaved) onSaved();
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ background: '#fff', border: '1px solid var(--color-bdr)', borderRadius: 14, padding: '2.5rem' }}>
      <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1rem', color: 'var(--color-navy)', marginBottom: '1.8rem', letterSpacing: '-.02em' }}>
        {BODY_LABELS[bodyKey]}
      </div>

      <div className="fg">
        <label style={{ display: 'block', fontSize: '.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--color-txt-3)', marginBottom: '.4rem' }}>
          Display Name / Title
        </label>
        <input name="label" value={form.label} onChange={handleChange}
          placeholder={BODY_LABELS[bodyKey]}
          style={{ width: '100%', padding: '10px 12px', fontSize: '.84rem', borderRadius: 8, border: '1.5px solid var(--color-bdr)', background: 'var(--color-off)', fontFamily: 'var(--font-body)', marginBottom: '1rem' }}
        />
      </div>

      <SectionLabel>Contact Details</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.5rem' }}>
        <Field label="Primary Phone"   name="phone1"  value={form.phone1}  onChange={handleChange} placeholder="+234 901 234 5678" />
        <Field label="Secondary Phone" name="phone2"  value={form.phone2}  onChange={handleChange} placeholder="+234 801 234 5678" />
        <Field label="Primary Email"   name="email1"  value={form.email1}  onChange={handleChange} type="email" placeholder="info@niqs.org.ng" />
        <Field label="Secondary Email" name="email2"  value={form.email2}  onChange={handleChange} type="email" placeholder="contact@niqs.org.ng" />
        <Field label="Website URL"     name="websiteUrl" value={form.websiteUrl} onChange={handleChange} placeholder="https://niqs.org.ng" />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', fontSize: '.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--color-txt-3)', marginBottom: '.4rem' }}>
          Office Address
        </label>
        <textarea name="address" value={form.address} onChange={handleChange} rows={3}
          placeholder="Full postal address"
          style={{ width: '100%', padding: '10px 12px', fontSize: '.84rem', borderRadius: 8, border: '1.5px solid var(--color-bdr)', background: 'var(--color-off)', fontFamily: 'var(--font-body)', resize: 'vertical' }}
          onFocus={e => { e.target.style.borderColor = 'var(--color-navy)'; e.target.style.background = '#fff'; }}
          onBlur={e => { e.target.style.borderColor = 'var(--color-bdr)'; e.target.style.background = 'var(--color-off)'; }}
        />
      </div>
      <Field label="Office Hours" name="officeHours" value={form.officeHours} onChange={handleChange} placeholder="Monday — Friday: 8:00 AM — 5:00 PM" />

      <SectionLabel>Social Media</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.5rem' }}>
        <Field label="Twitter / X URL"  name="twitterUrl"   value={form.twitterUrl}   onChange={handleChange} placeholder="https://twitter.com/niqs_ng" />
        <Field label="Facebook URL"     name="facebookUrl"  value={form.facebookUrl}  onChange={handleChange} placeholder="https://facebook.com/niqsng" />
        <Field label="LinkedIn URL"     name="linkedinUrl"  value={form.linkedinUrl}  onChange={handleChange} placeholder="https://linkedin.com/company/niqs" />
        <Field label="Instagram URL"    name="instagramUrl" value={form.instagramUrl} onChange={handleChange} placeholder="https://instagram.com/niqs_ng" />
      </div>

      <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-bdr)', display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={handleSave} disabled={saving}
          style={{ padding: '10px 28px', fontSize: '.82rem', fontWeight: 700, borderRadius: 8, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', background: 'var(--color-navy)', color: '#fff', fontFamily: 'var(--font-body)', opacity: saving ? .6 : 1 }}>
          {saving ? 'Saving…' : 'Save Contact Info'}
        </button>
      </div>
    </div>
  );
}

export default function ManageContactInfo() {
  const { admin } = useAuth();
  const role = admin?.role || '';
  const ownBody = ROLE_BODY[role]; // null = main_admin (sees all tabs)
  const [activeTab, setActiveTab] = useState(ownBody || 'national');

  const visibleTabs = ownBody ? TABS.filter(t => t.key === ownBody) : TABS;

  return (
    <div>
      <AdminHeader
        title="Contact Information"
        subtitle={
          ownBody
            ? `Manage ${BODY_LABELS[ownBody]} contact details shown on the public Contact page`
            : 'Manage contact details for NIQS National, WAQSN, and YQSF shown on the public Contact page'
        }
      />

      {/* Tabs — only shown if main_admin (all bodies) */}
      {!ownBody && (
        <div className="filter-bar" style={{ marginBottom: '2rem' }}>
          {TABS.map(t => (
            <button key={t.key} className={`fbtn${activeTab === t.key ? ' on' : ''}`} onClick={() => setActiveTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      <BodyForm key={activeTab} bodyKey={activeTab} />
    </div>
  );
}
