import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { ChevronUp, Plus, Trash2 } from 'lucide-react';
import { suppliersApi } from '../api/suppliers';
import { getApiErrorMessage } from '../api/client';
import type { SupplierCreate } from '../types/master';
import './ProjectMasterForm.css';

// String-valued mirror of the fields this form collects. Converted to a
// SupplierCreate payload (with proper number/optional handling) on submit.
interface SupplierFormState {
  supplier_name: string;
  plant_name: string;
  gst_number: string;
  pan_number: string;
  plant_location: string;
  plant_distance_km: string;
  transit_time_mins: string;
  primary_contact_name: string;
  primary_contact_designation: string;
  contact_email: string;
  contact_phone: string;
  dispatch_manager_name: string;
  dispatch_mobile: string;
  plant_capacity_cum_hr: string;
  no_transit_mixers: string;
  no_concrete_pumps: string;
  qms_certification: string;
}

const INITIAL: SupplierFormState = {
  supplier_name: '',
  plant_name: '',
  gst_number: '',
  pan_number: '',
  plant_location: '',
  plant_distance_km: '',
  transit_time_mins: '',
  primary_contact_name: '',
  primary_contact_designation: '',
  contact_email: '',
  contact_phone: '',
  dispatch_manager_name: '',
  dispatch_mobile: '',
  plant_capacity_cum_hr: '',
  no_transit_mixers: '',
  no_concrete_pumps: '',
  qms_certification: 'ISO 9001',
};

// '' → undefined so optional fields are omitted from the JSON payload.
const str = (v: string): string | undefined => (v.trim() === '' ? undefined : v.trim());
const num = (v: string): number | undefined => {
  const t = v.trim();
  if (t === '') return undefined;
  const n = Number(t);
  return Number.isNaN(n) ? undefined : n;
};

export const RMCSupplierForm: React.FC = () => {
  const [form, setForm] = useState<SupplierFormState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const update =
    (field: keyof SupplierFormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    const payload: SupplierCreate = {
      supplier_name: form.supplier_name.trim(),
      plant_name: str(form.plant_name),
      gst_number: str(form.gst_number),
      pan_number: str(form.pan_number),
      plant_location: str(form.plant_location),
      plant_distance_km: num(form.plant_distance_km),
      transit_time_mins: num(form.transit_time_mins),
      contact_email: str(form.contact_email),
      contact_phone: str(form.contact_phone),
      primary_contact_name: str(form.primary_contact_name),
      primary_contact_designation: str(form.primary_contact_designation),
      dispatch_manager_name: str(form.dispatch_manager_name),
      dispatch_mobile: str(form.dispatch_mobile),
      plant_capacity_cum_hr: num(form.plant_capacity_cum_hr),
      no_transit_mixers: num(form.no_transit_mixers),
      no_concrete_pumps: num(form.no_concrete_pumps),
      qms_certification: str(form.qms_certification),
    };

    try {
      const created = await suppliersApi.create(payload);
      setSuccess(`Supplier "${created.supplier_name}" registered successfully.`);
      setForm(INITIAL);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to register supplier. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const alertStyle: React.CSSProperties = {
    padding: '12px 16px',
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 14,
  };

  return (
    <form className="qms-form-page" onSubmit={handleSubmit}>
      <div className="qms-page-header-block">
        <div>
          <h1 className="qms-page-title-main">RMC Supplier Registration</h1>
          <p className="qms-page-subtitle">Filled by: Project Manager | Purpose: Register Ready Mix Concrete suppliers and approved mix designs</p>
        </div>
        <div className="qms-page-actions">
          <Button type="button" variant="outline" disabled={submitting}>Save Draft</Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'Registering…' : 'Register Supplier'}
          </Button>
        </div>
      </div>

      {error && (
        <div style={{ ...alertStyle, background: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5' }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ ...alertStyle, background: '#DCFCE7', color: '#166534', border: '1px solid #86EFAC' }}>
          {success}
        </div>
      )}

      <div className="qms-auto-banner" style={{ marginBottom: 24, padding: 16 }}>
        <div className="qms-auto-field"><label>Project ID *</label><span>PRJ-2024-001</span></div>
        <div className="qms-auto-field"><label>Supplier ID *</label><span>Auto-generated</span></div>
        <div className="qms-auto-field"><label>Registration Date *</label><span>{new Date().toLocaleDateString()}</span></div>
      </div>

      <Card className="qms-form-section">
        <div className="qms-section-header-toggle">
          <h3 className="qms-section-heading-plain">B · SUPPLIER DETAILS</h3>
          <ChevronUp size={16} className="text-muted" />
        </div>
        <div className="qms-grid-2">
          <Input label="Supplier Company Name" required placeholder="e.g. UltraTech Cement Ltd" value={form.supplier_name} onChange={update('supplier_name')} />
          <Input label="Plant Name / Short Name" placeholder="e.g. Whitefield Plant" value={form.plant_name} onChange={update('plant_name')} />

          <Input label="GST Number" value={form.gst_number} onChange={update('gst_number')} />
          <Input label="PAN Number" value={form.pan_number} onChange={update('pan_number')} />

          <Input label="Plant Address" style={{ gridColumn: 'span 2' }} value={form.plant_location} onChange={update('plant_location')} />

          <Input label="Distance from Site (km)" type="number" value={form.plant_distance_km} onChange={update('plant_distance_km')} />
          <Input label="Est. Transit Time (mins)" type="number" value={form.transit_time_mins} onChange={update('transit_time_mins')} />
        </div>
      </Card>

      <Card className="qms-form-section">
        <div className="qms-section-header-toggle">
          <h3 className="qms-section-heading-plain">C · CONTACT DETAILS</h3>
          <ChevronUp size={16} className="text-muted" />
        </div>
        <div className="qms-grid-2">
          <Input label="Primary Contact Name" value={form.primary_contact_name} onChange={update('primary_contact_name')} />
          <Input label="Designation" value={form.primary_contact_designation} onChange={update('primary_contact_designation')} />

          <Input label="Email ID" type="email" value={form.contact_email} onChange={update('contact_email')} />
          <Input label="Mobile Number" type="tel" value={form.contact_phone} onChange={update('contact_phone')} />

          <Input label="Dispatch/Plant Manager Name" value={form.dispatch_manager_name} onChange={update('dispatch_manager_name')} />
          <Input label="Dispatch Mobile Number" type="tel" value={form.dispatch_mobile} onChange={update('dispatch_mobile')} />
        </div>
      </Card>

      <Card className="qms-form-section">
        <div className="qms-section-header-toggle">
          <h3 className="qms-section-heading-plain">D · PLANT CAPABILITY</h3>
          <ChevronUp size={16} className="text-muted" />
        </div>
        <div className="qms-grid-2">
          <Input label="Plant Capacity (m³/hr)" type="number" value={form.plant_capacity_cum_hr} onChange={update('plant_capacity_cum_hr')} />
          <Input label="No. of Transit Mixers" type="number" value={form.no_transit_mixers} onChange={update('no_transit_mixers')} />

          <Input label="No. of Concrete Pumps" type="number" value={form.no_concrete_pumps} onChange={update('no_concrete_pumps')} />
          <Select label="QMS Certification" value={form.qms_certification} onChange={update('qms_certification')} options={[
            { label: 'ISO 9001', value: 'ISO 9001' },
            { label: 'QCI Approved', value: 'QCI Approved' },
            { label: 'None', value: 'None' }
          ]} />
        </div>
      </Card>

      <Card className="qms-form-section" padding="none">
        <div className="qms-p-4 qms-border-b">
          <div className="qms-section-header-toggle" style={{ marginBottom: 4 }}>
            <h3 className="qms-section-heading-plain">E · APPROVED MIX DESIGNS</h3>
            <ChevronUp size={16} className="text-muted" />
          </div>
          <p className="qms-text-sm text-muted">Register the concrete mix designs approved for this project from this supplier. (Saved separately — coming soon.)</p>
        </div>
        <div className="qms-table-container">
          <table className="qms-table">
            <thead>
              <tr>
                <th>Mix Design ID *</th>
                <th>Concrete Grade *</th>
                <th>Type *</th>
                <th>Max Aggregate (mm)</th>
                <th>Cement Content (kg/m³)</th>
                <th>W/C Ratio *</th>
                <th>Target Slump (mm) *</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><Input /></td>
                <td><Select options={[{label:'M40',value:'M40'}, {label:'M30',value:'M30'}]} /></td>
                <td><Select options={[{label:'Pumpable',value:'Pumpable'}, {label:'SCC',value:'SCC'}]} /></td>
                <td><Input type="number" /></td>
                <td><Input type="number" /></td>
                <td><Input type="number" step="0.01" /></td>
                <td><Input type="number" /></td>
                <td><Button type="button" variant="ghost" icon={<Trash2 size={16} className="text-danger" />} /></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="qms-p-4">
          <Button type="button" variant="outline" className="qms-dashed-btn" icon={<Plus size={16} />}>Add Mix Design</Button>
        </div>
      </Card>

      <div className="qms-form-footer">
        <div className="text-muted qms-text-sm"><span className="text-danger">*</span> Mandatory field</div>
        <div className="qms-page-actions">
          <Button type="button" variant="outline" disabled={submitting}>Save Draft</Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'Registering…' : 'Register Supplier'}
          </Button>
        </div>
      </div>
    </form>
  );
};
