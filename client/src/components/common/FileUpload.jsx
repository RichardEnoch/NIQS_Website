/**
 * FileUpload — drag-and-drop / click-to-upload with real-time progress bar.
 * Uses XHR (not fetch) so we can read upload.onprogress events.
 * Auth is cookie-based so withCredentials: true passes the session.
 *
 * Props:
 *   onUpload(url, meta)  — called after successful upload
 *   onError(msg)         — called on failure
 *   accept               — MIME types or file extensions, e.g. ".pdf,image/*"
 *   maxMB                — soft size warning (default 500)
 *   label                — button / drop zone label
 *   currentUrl           — existing file URL (shows a preview / link)
 */

import { useState, useRef } from 'react';
import Icon from './Icon';

const STORAGE_BADGE = {
  cloudinary: { label: 'Cloudinary', color: '#2563eb' },
  r2:         { label: 'Cloudflare R2', color: '#ea580c' },
  local:      { label: 'Local', color: '#6b7280' },
};

export default function FileUpload({
  onUpload,
  onError,
  accept = '*',
  maxMB  = 500,
  label  = 'Choose file or drag & drop',
  currentUrl = '',
}) {
  const [progress,  setProgress]  = useState(0);
  const [uploading, setUploading] = useState(false);
  const [done,      setDone]      = useState(false);
  const [fileName,  setFileName]  = useState('');
  const [storedUrl, setStoredUrl] = useState(currentUrl);
  const [storage,   setStorage]   = useState('');
  const [sizeInfo,  setSizeInfo]  = useState('');
  const [dragging,  setDragging]  = useState(false);
  const inputRef = useRef();

  const formatSize = (bytes) => {
    if (bytes < 1024)        return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const upload = (file) => {
    if (!file) return;

    if (file.size > maxMB * 1024 * 1024) {
      onError?.(`File exceeds ${maxMB} MB limit`);
      return;
    }

    setFileName(file.name);
    setSizeInfo(formatSize(file.size));
    setUploading(true);
    setDone(false);
    setProgress(0);
    setStoredUrl('');
    setStorage('');

    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();

    /* ── Track client→server progress ── */
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      setUploading(false);
      if (xhr.status === 200 || xhr.status === 201) {
        try {
          const data = JSON.parse(xhr.responseText);
          setStoredUrl(data.url);
          setStorage(data.storage || 'local');
          setDone(true);
          setProgress(100);
          onUpload?.(data.url, data);
        } catch {
          onError?.('Invalid server response');
        }
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          onError?.(err.message || 'Upload failed');
        } catch {
          onError?.('Upload failed');
        }
        setProgress(0);
      }
    };

    xhr.onerror = () => {
      setUploading(false);
      setProgress(0);
      onError?.('Network error — upload failed');
    };

    /* Same base and credentials as the axios client. A bare '/api/upload' only
       ever worked on the dev server, where Vite proxies /api: in production the
       API lives on its own host, and Vercel's SPA rewrite answered the POST
       with index.html — a 200 that failed as "Invalid server response". The
       Bearer header matters for the same reason: the session cookie belongs to
       the API's domain and a browser blocking third-party cookies drops it. */
    xhr.open('POST', `${import.meta.env.VITE_API_URL || '/api'}/upload`);
    xhr.withCredentials = true; // send auth cookie
    try {
      const token = localStorage.getItem('token');
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    } catch { /* storage blocked: the cookie is all we have */ }
    xhr.send(formData);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  };

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);
  const handleChange = (e) => upload(e.target.files[0]);
  const reset = () => { setDone(false); setFileName(''); setStoredUrl(''); setProgress(0); setStorage(''); setSizeInfo(''); inputRef.current.value = ''; };

  const badge = STORAGE_BADGE[storage];

  return (
    <div>
      {/* Drop zone */}
      <div
        onClick={() => !uploading && inputRef.current.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{
          border: `2px dashed ${dragging ? '#000066' : '#d1d5db'}`,
          borderRadius: 10, padding: '1.4rem 1rem',
          background: dragging ? 'rgba(0, 0, 102,.04)' : '#f9fafb',
          textAlign: 'center', cursor: uploading ? 'not-allowed' : 'pointer',
          transition: 'border-color .2s, background .2s',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          style={{ display: 'none' }}
        />

        {uploading ? (
          <span style={{ fontSize: 13, color: '#6b7280' }}>Uploading {fileName}…</span>
        ) : done ? (
          <span style={{ fontSize: 13, color: '#059669', fontWeight: 600 }}><Icon name="check" size="sm" /> {fileName} uploaded</span>
        ) : (
          <>
            <div style={{ marginBottom: 4 }}><Icon name="folder" size="lg" /></div>
            <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 500 }}>{label}</div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
              {accept !== '*' ? `Accepted: ${accept} · ` : ''}Max {maxMB} MB
            </div>
          </>
        )}
      </div>

      {/* Progress bar */}
      {(uploading || done) && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 500, maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {fileName} {sizeInfo && `(${sizeInfo})`}
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: done ? '#059669' : '#000066' }}>
              {progress}%
            </span>
          </div>
          <div style={{ height: 6, background: '#e5e7eb', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 99, transition: 'width .3s ease',
              width: `${progress}%`,
              background: done
                ? 'linear-gradient(90deg, #059669, #10b981)'
                : 'linear-gradient(90deg, #000066, #D9B650)',
            }} />
          </div>
          {/* Storage badge + actions */}
          {done && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
              {badge && (
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 10, background: badge.color, color: '#fff' }}>
                  {badge.label}
                </span>
              )}
              <a href={storedUrl} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 11, color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
                Preview ↗
              </a>
              <button onClick={reset} style={{ fontSize: 11, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                Replace
              </button>
            </div>
          )}
        </div>
      )}

      {/* Show existing URL if no new upload */}
      {!done && currentUrl && (
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: '#6b7280' }}>Current:</span>
          <a href={currentUrl} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 11, color: '#2563eb', fontWeight: 600, textDecoration: 'none', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {currentUrl}
          </a>
        </div>
      )}
    </div>
  );
}
