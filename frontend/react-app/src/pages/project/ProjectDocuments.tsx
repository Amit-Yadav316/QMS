import React, { useRef, useState } from 'react';
import { Upload, Download, Trash2, FileText, Search } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ErrorBox } from '../../components/ui/ErrorBox';
import { useProject } from '../../components/layout/ProjectLayout';
import { getApiErrorMessage } from '../../api/client';
import { toast } from '../../lib/toast';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import {
  useDeleteDocument,
  useDocuments,
  useDownloadDocument,
  useUploadDocument,
} from '../../queries/documents';
import type { DocumentResponse } from '../../types/master';
import './ProjectDocuments.css';

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

  const { data: rows = [], isPending, error: loadError } = useDocuments(pid);
  const upload = useUploadDocument(pid);
  const download = useDownloadDocument(pid);
  const remove = useDeleteDocument(pid);
  const confirm = useConfirm();

  const fileRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [fileName, setFileName] = useState('');
  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    try {
      const doc = await upload.mutateAsync({
        file,
        documentType: category || undefined,
        title: title.trim() || undefined,
      });
      toast.success(`Uploaded “${doc.original_filename}”.`);
      setCategory('');
      setTitle('');
      setFileName('');
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Unable to upload the file.'));
    }
  };

  const handleDownload = async (doc: DocumentResponse) => {
    try {
      await download.mutateAsync(doc);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Unable to download the file.'));
    }
  };

  const handleDelete = async (doc: DocumentResponse) => {
    if (!(await confirm({
      title: 'Delete file?',
      description: `“${doc.original_filename}” will be permanently removed. This cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    }))) return;
    try {
      await remove.mutateAsync(doc.document_id);
      toast.success(`Deleted “${doc.original_filename}”.`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Unable to delete the file.'));
    }
  };

  const busy = (id: number) =>
    (download.isPending && download.variables?.document_id === id) ||
    (remove.isPending && remove.variables === id);

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
      {loadError && <ErrorBox>{getApiErrorMessage(loadError, 'Unable to load documents.')}</ErrorBox>}

      <Card className="qms-form-section">
        <h3 className="qms-section-heading-plain qms-mb-12">Upload a document</h3>
        <form onSubmit={handleUpload} className="qms-grid-2">
          <div>
            <label htmlFor="doc-file" className="qms-input-label">File</label>
            <input
              id="doc-file"
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
          <div className="qms-field-end">
            <Button type="submit" variant="primary" disabled={upload.isPending || !fileName} icon={<Upload size={16} />}>
              {upload.isPending ? 'Uploading…' : 'Upload'}
            </Button>
          </div>
        </form>
        <p className="text-muted qms-doc-hint">
          PDF, images, spreadsheets and documents up to 25 MB.
        </p>
      </Card>

      <Card className="qms-form-section" padding="none">
        <div className="qms-card-header">
          <h3 className="qms-section-heading-plain">Documents</h3>
          <div className="qms-search-box">
            <Search size={15} className="qms-search-icon" />
            <input
              type="text"
              aria-label="Search documents by file or title"
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
              {isPending ? (
                <tr><td colSpan={6} className="text-muted">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-muted">{rows.length === 0 ? 'No documents yet.' : 'No matches.'}</td></tr>
              ) : (
                filtered.map((d) => (
                  <tr key={d.document_id}>
                    <td>
                      <div className="qms-doc-name">
                        <FileText size={16} className="text-muted" />
                        <div>
                          <div className="font-medium">{d.title || d.original_filename}</div>
                          {d.title && <div className="qms-doc-id text-muted">{d.original_filename}</div>}
                        </div>
                      </div>
                    </td>
                    <td>{d.document_type ? <Badge variant="default">{catLabel(d.document_type)}</Badge> : '—'}</td>
                    <td>{fmtSize(d.size_bytes)}</td>
                    <td>{d.uploaded_by_name ?? '—'}</td>
                    <td>{fmtDate(d.uploaded_at)}</td>
                    <td>
                      <div className="qms-cell-actions">
                        <button
                          type="button"
                          className="qms-icon-btn"
                          aria-label={`Download ${d.original_filename}`}
                          title="Download"
                          disabled={busy(d.document_id)}
                          onClick={() => handleDownload(d)}
                        >
                          <Download size={16} />
                        </button>
                        {canManage && (
                          <button
                            type="button"
                            className="qms-icon-btn"
                            aria-label={`Delete ${d.original_filename}`}
                            title="Delete"
                            disabled={busy(d.document_id)}
                            onClick={() => handleDelete(d)}
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
