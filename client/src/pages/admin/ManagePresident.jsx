import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import API from '../../api/axios';
import AdminHeader from '../../components/admin/AdminHeader';

const DEFAULTS = {
  name: 'Arc. Dr. [President Name]',
  title: 'President, NIQS',
  tenure: 'Elected 2023 – Present',
  linkedIn: '',
  photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80&fit=crop&crop=face',
  backgroundImage: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=1400&q=80&fit=crop',
  paragraph1: 'It is my honour to serve as President of the Nigerian Institute of Quantity Surveyors at this critical juncture. The construction industry is undergoing significant transformation, and NIQS is well-positioned to lead that change.',
  paragraph2: 'Our focus rests on three pillars: strengthening professional standards, expanding access to quality education and examination, and deepening international partnerships that give our members global relevance.',
  quote: '"Together, we will build a stronger, more impactful NIQS for the benefit of our members and Nigerian society."',
  speechTitle: '',
  speechSubtitle: '',
  speechBody: '',
  speeches: [],
};

const EMPTY_SPEECH = { title: '', platform: '', date: '', excerpt: '', body: '', pdfUrl: '', videoUrl: '' };

export default function ManagePresident() {
  const [form, setForm] = useState({ ...DEFAULTS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    API.get('/president')
      .then(res => {
        if (res.data?._id) {
          const d = res.data;
          setForm({
            name: d.name || DEFAULTS.name,
            title: d.title || DEFAULTS.title,
            tenure: d.tenure || DEFAULTS.tenure,
            linkedIn: d.linkedIn || '',
            photo: d.photo || DEFAULTS.photo,
            backgroundImage: d.backgroundImage || DEFAULTS.backgroundImage,
            paragraph1: d.paragraph1 || DEFAULTS.paragraph1,
            paragraph2: d.paragraph2 || DEFAULTS.paragraph2,
            quote: d.quote || DEFAULTS.quote,
            speechTitle: d.speechTitle || '',
            speechSubtitle: d.speechSubtitle || '',
            speechBody: d.speechBody || '',
            /* <input type="date"> wants yyyy-mm-dd, the API sends a full ISO string. */
            speeches: (d.speeches || []).map(s => ({ ...EMPTY_SPEECH, ...s, date: s.date ? s.date.slice(0, 10) : '' })),
          });
          setLastUpdated(d.updatedAt);
        }
      })
      .catch(() => toast.error('Could not load president data'))
      .finally(() => setLoading(false));
  }, []);

  const f = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const setSpeech = (i, k, v) => setForm(prev => ({
    ...prev,
    speeches: prev.speeches.map((s, j) => (j === i ? { ...s, [k]: v } : s)),
  }));
  const addSpeech = () => setForm(prev => ({ ...prev, speeches: [{ ...EMPTY_SPEECH }, ...prev.speeches] }));
  const removeSpeech = (i) => setForm(prev => ({ ...prev, speeches: prev.speeches.filter((_, j) => j !== i) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await API.put('/president', form);
      setLastUpdated(res.data.updatedAt);
      toast.success('President profile updated successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <AdminHeader title="President Profile" breadcrumbs={['President']} />
        <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <AdminHeader title="President Profile" breadcrumbs={['President']} />

      <div style={{ padding: '24px 28px', maxWidth: 860 }}>

        {/* Info banner */}
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '12px 16px', marginBottom: 24, fontSize: 13, color: '#1e40af' }}>
          <strong>Note:</strong> The President photo is automatically used as both the portrait on the page <em>and</em> the hero background image (darkened). You may also set a separate background image URL below.
          {lastUpdated && <span style={{ float: 'right', color: '#6b7280' }}>Last saved: {new Date(lastUpdated).toLocaleString()}</span>}
        </div>

        <form onSubmit={handleSubmit}>
          {/* ── IDENTITY ── */}
          <SectionTitle>Identity</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <Field label="Full Name / Title" required>
              <input value={form.name} onChange={e => f('name', e.target.value)} style={inputStyle} required placeholder="Arc. Dr. [Name], FNIQS" />
            </Field>
            <Field label="Official Title">
              <input value={form.title} onChange={e => f('title', e.target.value)} style={inputStyle} placeholder="President, NIQS" />
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <Field label="Tenure Period">
              <input value={form.tenure} onChange={e => f('tenure', e.target.value)} style={inputStyle} placeholder="Elected 2023 – Present" />
            </Field>
            <Field label="LinkedIn Profile URL">
              <input value={form.linkedIn} onChange={e => f('linkedIn', e.target.value)} style={inputStyle} placeholder="https://linkedin.com/in/..." />
            </Field>
          </div>

          {/* ── PHOTOS ── */}
          <SectionTitle>Photos</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <Field label="President Portrait URL (also used as hero background)" required>
              <input value={form.photo} onChange={e => f('photo', e.target.value)} style={inputStyle} required placeholder="https://..." />
            </Field>
            <Field label="Override Hero Background URL (optional — uses portrait by default)">
              <input value={form.backgroundImage} onChange={e => f('backgroundImage', e.target.value)} style={inputStyle} placeholder="https://... (leave blank to auto-use portrait)" />
            </Field>
          </div>

          {/* Photo preview */}
          {form.photo && (
            <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 6 }}>Portrait Preview</p>
                <img src={form.photo} alt="Portrait preview" style={{ width: 120, height: 150, objectFit: 'cover', objectPosition: 'top', borderRadius: 10, border: '2px solid #e5e7eb' }} />
              </div>
              {form.backgroundImage && (
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 6 }}>Hero Background Preview</p>
                  <img src={form.backgroundImage} alt="Background preview" style={{ width: 200, height: 150, objectFit: 'cover', borderRadius: 10, border: '2px solid #e5e7eb', filter: 'brightness(0.35)' }} />
                </div>
              )}
            </div>
          )}

          {/* ── MESSAGE ── */}
          <SectionTitle>Presidential Message</SectionTitle>
          <Field label="Paragraph 1" required>
            <textarea value={form.paragraph1} onChange={e => f('paragraph1', e.target.value)} required rows={4} style={{ ...inputStyle, resize: 'vertical', marginBottom: 14 }} />
          </Field>
          <Field label="Paragraph 2">
            <textarea value={form.paragraph2} onChange={e => f('paragraph2', e.target.value)} rows={4} style={{ ...inputStyle, resize: 'vertical', marginBottom: 14 }} />
          </Field>
          <Field label="Featured Quote (displayed in gold-bordered block)">
            <textarea value={form.quote} onChange={e => f('quote', e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder='"Quote text here."' />
          </Field>

          {/* ── INAUGURAL SPEECH ── */}
          <SectionTitle>Inaugural Speech / Address</SectionTitle>
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12.5, color: '#92400e' }}>
            Shown on the public President page below the message. Leave the speech text empty to hide the section.
            Separate paragraphs with a blank line. A paragraph starting with <strong>1.</strong>, <strong>2.</strong> … renders as a numbered programme card — put the heading on the first line and the description on the following lines.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <Field label="Speech Title">
              <input value={form.speechTitle} onChange={e => f('speechTitle', e.target.value)} style={inputStyle} placeholder="Acceptance Speech & Proposed Programmes…" />
            </Field>
            <Field label="Speech Subtitle (speaker / date line)">
              <input value={form.speechSubtitle} onChange={e => f('speechSubtitle', e.target.value)} style={inputStyle} placeholder="Delivered by … · November 22, 2025" />
            </Field>
          </div>
          <Field label="Speech Text">
            <textarea value={form.speechBody} onChange={e => f('speechBody', e.target.value)} rows={18} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace', fontSize: 13 }} placeholder={'Opening paragraph…\n\n1. FIRST PROGRAMME HEADING\nDescription of the programme…\n\n2. SECOND PROGRAMME HEADING\nDescription…'} />
          </Field>

          {/* ── OTHER SPEECHES ── */}
          <SectionTitle>Speeches &amp; Addresses (other platforms)</SectionTitle>
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12.5, color: '#92400e' }}>
            Keynotes, addresses and interviews given elsewhere. The public page lists them newest first, after the inaugural speech,
            and only shows the section once at least one is added. Give each a title; add the full text, a PDF link, a video link, or any mix.
          </div>
          <button type="button" onClick={addSpeech} style={{ padding: '8px 16px', background: '#000066', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: 'pointer', marginBottom: 14 }}>
            + Add speech
          </button>
          {form.speeches.map((s, i) => (
            <div key={s._id || i} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginBottom: 14, background: '#fafafa' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.4fr 1fr', gap: 14, marginBottom: 14 }}>
                <Field label="Title" required>
                  <input value={s.title} onChange={e => setSpeech(i, 'title', e.target.value)} style={inputStyle} required placeholder="Keynote: Cost Management in Public Procurement" />
                </Field>
                <Field label="Event / Platform">
                  <input value={s.platform} onChange={e => setSpeech(i, 'platform', e.target.value)} style={inputStyle} placeholder="Channels TV — Business Morning" />
                </Field>
                <Field label="Date">
                  <input type="date" value={s.date} onChange={e => setSpeech(i, 'date', e.target.value)} style={inputStyle} />
                </Field>
              </div>
              <Field label="Excerpt (one or two sentences shown on the card)">
                <textarea value={s.excerpt} onChange={e => setSpeech(i, 'excerpt', e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical', marginBottom: 14 }} />
              </Field>
              <Field label="Full Text (optional — same format as the inaugural speech)">
                <textarea value={s.body} onChange={e => setSpeech(i, 'body', e.target.value)} rows={6} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace', fontSize: 13, marginBottom: 14 }} />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="PDF URL (optional)">
                  <input value={s.pdfUrl} onChange={e => setSpeech(i, 'pdfUrl', e.target.value)} style={inputStyle} placeholder="https://..." />
                </Field>
                <Field label="Video URL (optional)">
                  <input value={s.videoUrl} onChange={e => setSpeech(i, 'videoUrl', e.target.value)} style={inputStyle} placeholder="https://youtube.com/..." />
                </Field>
              </div>
              <button type="button" onClick={() => removeSpeech(i)} style={{ marginTop: 12, padding: '6px 12px', background: '#fff', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                Remove
              </button>
            </div>
          ))}

          {/* ── ACTIONS ── */}
          <div style={{ display: 'flex', gap: 12, marginTop: 24, paddingTop: 20, borderTop: '1px solid #f3f4f6' }}>
            <button type="submit" disabled={saving} style={{ padding: '12px 28px', background: '#D9B650', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 14, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving...' : 'Save President Profile'}
            </button>
            <a href="/president" target="_blank" rel="noreferrer" style={{ padding: '12px 20px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 14, cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              Preview Page ↗
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <h4 style={{ margin: '20px 0 12px', fontSize: 13, fontWeight: 700, color: '#000066', textTransform: 'uppercase', letterSpacing: '.06em', borderBottom: '1px solid #f3f4f6', paddingBottom: 8 }}>
      {children}
    </h4>
  );
}

function Field({ label, required, children }) {
  return (
    <div style={{ marginBottom: 0 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 5 }}>
        {label} {required && <span style={{ color: '#dc2626' }}>*</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '9px 12px', border: '1px solid #d1d5db',
  borderRadius: 6, fontSize: 14, color: '#111827', outline: 'none',
  boxSizing: 'border-box', fontFamily: 'inherit',
};
