import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, Download, Trash2, FileText, Search } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useProject } from '../../components/layout/ProjectLayout';
import { documentsApi } from '../../api/documents';
import { getApiErrorMessage } from '../../api/client';
import type { DocumentResponse } from '../../types/master';

const CATEGORY_OPTIONS = [
  { label: 'No category', value: '' },
  { label: 'Mix design', value: 'MIX_DESIGN' },
  { label: 'RMC detail', value: 'RMC_DETAIL' },
  { label: 'Pour record', value: 'POUR_RECORD' },
  { label: 'Grade detail', value: 'GRADE_DETAIL' },
  { label: 'Cube test register', value: 'CUBE_TEST_REGISTER' },
  { label: 'Other', value: 'OTHER' },
];

const fmtSize = (b: number): string =>
  b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;

const catLabel = (c: string | null): string =>
  c ? c.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase()) : '—';

const fmtDate = (iso: string): string => new Date(iso).toLocaleDateString();

export const ProjectDocuments: React.FC = () => {
  const { project } = useProject();
  const pid = project.project_id;
  const canManage =
    project.access.can_manage_client_side || project.access.can_manage_contractor_side;

  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<DocumentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [fileName, setFileName] = useState('');
  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await documentsApi.list(pid));
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to load documents.'));
    } finally {
      setLoading(false);
    }
  }, [pid]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setError(null);
    setSuccess(null);
    setUploading(true);
    try {
      const doc = await documentsApi.upload(pid, file, {
        documentType: category || undefined,
        title: title.trim() || undefined,
      });
      setSuccess(`Uploaded “${doc.original_filename}”.`);
      setCategory('');
      setTitle('');
      setFileName('');
      if (fileRef.current) fileRef.current.value = '';
      void load();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to upload the file.'));
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: DocumentResponse) => {
    setError(null);
    setBusyId(doc.document_id);
    try {
      await documentsApi.download(pid, doc);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to download the file.'));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (doc: DocumentResponse) => {
    if (!window.confirm(`Delete “${doc.original_filename}”? This cannot be undone.`)) return;
    setError(null);
    setSuccess(null);
    setBusyId(doc.document_id);
    try {
      await documentsApi.remove(pid, doc.document_id);
      setRows((prev) => prev.filter((d) => d.document_id !== doc.document_id));
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to delete the file.'));
    } finally {
      setBusyId(null);
    }
  };

  const alert: React.CSSProperties = { padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14 };
  const q = search.trim().toLowerCase();
  const filtered = q
    ? rows.filter(
        (d) =>
          d.original_filename.toLowerCase().includes(q) ||
          (d.title ?? '').toLowerCase().includes(q),
      )
    : rows;

  return (
    <div>
      {error && <div style={{ ...alert, background: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5' }}>{error}</div>}
      {success && <div style={{ ...alert, background: '#DCFCE7', color: '#166534', border: '1px solid #86EFAC' }}>{success}</div>}

      <Card className="qms-form-section">
        <h3 className="qms-section-heading-plain" style={{ marginBottom: 12 }}>Upload a document</h3>
        <form onSubmit={handleUpload} className="qms-grid-2">
          <div>
            <label className="qms-field-label" style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500 }}>
              File
            </label>
            <input
              ref={fileRef}
              type="file"
              onChange={(e) => setFileName(e.target.value)}
              accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.csv,.xls,.xlsx,.doc,.docx,.txt"
            />
          </div>
          <Select
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={CATEGORY_OPTIONS}
          />
          <Input
            label="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Approved M30 mix certificate"
          />
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <Button type="submit" variant="primary" disabled={uploading || !fileName} icon={<Upload size={16} />}>
              {uploading ? 'Uploading…' : 'Upload'}
            </Button>
          </div>
        </form>
        <p className="text-muted" style={{ fontSize: 12, marginBottom: 0, marginTop: 8 }}>
          PDF, images, spreadsheets and documents up to 25 MB.
        </p>
      </Card>

      <Card className="qms-form-section" padding="none">
        <div className="qms-p-4 qms-border-b" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <h3 className="qms-section-heading-plain">Documents</h3>
          <div className="qms-search-box" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Search size={15} className="qms-search-icon" />
            <input
              type="text"
              placeholder="Search by file or title…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="qms-table-container">
          <table className="qms-table">
            <thead>
              <tr>
                <th>Document</th>
                <th>Category</th>
                <th>Size</th>
                <th>Uploaded by</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-muted">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-muted">{rows.length === 0 ? 'No documents yet.' : 'No matches.'}</td></tr>
              ) : (
                filtered.map((d) => (
                  <tr key={d.document_id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FileText size={16} className="text-gray-500" />
                        <div>
                          <div className="font-medium">{d.title || d.original_filename}</div>
                          {d.title && <div className="qms-doc-id text-muted" style={{ fontSize: 12 }}>{d.original_filename}</div>}
                        </div>
                      </div>
                    </td>
                    <td>{d.document_type ? <Badge variant="default">{catLabel(d.document_type)}</Badge> : '—'}</td>
                    <td>{fmtSize(d.size_bytes)}</td>
                    <td>{d.uploaded_by_name ?? '—'}</td>
                    <td>{fmtDate(d.uploaded_at)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="qms-icon-btn"
                          title="Download"
                          disabled={busyId === d.document_id}
                          onClick={() => void handleDownload(d)}
                        >
                          <Download size={16} />
                        </button>
                        {canManage && (
                          <button
                            className="qms-icon-btn"
                            title="Delete"
                            disabled={busyId === d.document_id}
                            onClick={() => void handleDelete(d)}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
