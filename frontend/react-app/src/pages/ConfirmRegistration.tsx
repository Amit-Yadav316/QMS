// Public, passwordless confirmation page for suppliers & labs.
//
// Reached from the email link {FRONTEND_URL}/external/confirm/{kind}?token=...
// (kind = "supplier" | "lab"). The external party reviews the details the
// contractor entered, optionally corrects their contact info, then confirms or
// declines. No login required — the token is the credential.

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Layers } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { confirmationsApi } from '../api/confirmations';
import { getApiErrorMessage } from '../api/client';
import type {
  ConfirmationResult,
  LabConfirmationView,
  SupplierConfirmationView,
} from '../types/master';
import './LoginPage.css';

// All fields optional — DECLINE submits with whatever the party has (or hasn't)
// entered, and CONFIRM never required corrections either.
const schema = z.object({
  contact_email: z.string(),
  contact_phone: z.string(),
  primary_contact_name: z.string(), // supplier
  plant_location: z.string(), // supplier
  lab_manager_name: z.string(), // lab
  nabl_certificate_no: z.string(), // lab
});
type FormValues = z.infer<typeof schema>;

export const ConfirmRegistration: React.FC = () => {
  const { kind } = useParams<{ kind: string }>();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const isLab = kind === 'lab';

  const [loading, setLoading] = useState(true);
  const [supplier, setSupplier] = useState<SupplierConfirmationView | null>(null);
  const [lab, setLab] = useState<LabConfirmationView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConfirmationResult | null>(null);

  const {
    register, handleSubmit, reset, formState: { isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      contact_email: '', contact_phone: '', primary_contact_name: '',
      plant_location: '', lab_manager_name: '', nabl_certificate_no: '',
    },
  });

  useEffect(() => {
    if (!token || (kind !== 'supplier' && kind !== 'lab')) {
      setError('This confirmation link is invalid.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        if (isLab) {
          const v = await confirmationsApi.viewLab(token);
          if (cancelled) return;
          setLab(v);
          reset({
            contact_email: v.contact_email ?? '',
            contact_phone: v.contact_phone ?? '',
            lab_manager_name: v.lab_manager_name ?? '',
            primary_contact_name: '', plant_location: '', nabl_certificate_no: '',
          });
        } else {
          const v = await confirmationsApi.viewSupplier(token);
          if (cancelled) return;
          setSupplier(v);
          reset({
            contact_email: v.contact_email ?? '',
            contact_phone: v.contact_phone ?? '',
            primary_contact_name: v.primary_contact_name ?? '',
            plant_location: v.plant_location ?? '',
            lab_manager_name: '', nabl_certificate_no: '',
          });
        }
      } catch (err) {
        if (!cancelled) setError(getApiErrorMessage(err, 'This confirmation link is invalid or has expired.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token, kind, isLab, reset]);

  const submit = (action: 'CONFIRM' | 'DECLINE') => async (v: FormValues) => {
    setError(null);
    try {
      const res = isLab
        ? await confirmationsApi.submitLab(token, {
            action,
            contact_email: v.contact_email || null,
            contact_phone: v.contact_phone || null,
            lab_manager_name: v.lab_manager_name || null,
            nabl_certificate_no: v.nabl_certificate_no || null,
          })
        : await confirmationsApi.submitSupplier(token, {
            action,
            contact_email: v.contact_email || null,
            contact_phone: v.contact_phone || null,
            primary_contact_name: v.primary_contact_name || null,
            plant_location: v.plant_location || null,
          });
      setResult(res);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not record your response. Please try again.'));
    }
  };

  const view = isLab ? lab : supplier;
  const name = isLab ? lab?.lab_name : supplier?.supplier_name;
  const roleLabel = isLab ? 'testing lab' : 'RMC plant';
  const alreadyResponded = view && view.status !== 'PENDING';

  return (
    <div className="qms-auth-page">
      <div className="qms-auth-card" style={{ maxWidth: 460 }}>
        <div className="qms-auth-brand">
          <div className="qms-auth-mark" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={22} />
          </div>
          <h1 className="qms-auth-title">Confirm your details</h1>
        </div>

        {loading ? (
          <p className="text-muted" style={{ textAlign: 'center' }}>Loading…</p>
        ) : result ? (
          <div
            className="qms-auth-error"
            style={
              result.status === 'CONFIRMED'
                ? { background: '#DCFCE7', color: '#166534', borderColor: '#86EFAC' }
                : { background: '#FEF3C7', color: '#92400E', borderColor: '#FDE68A' }
            }
          >
            {result.message}
          </div>
        ) : error && !view ? (
          <div className="qms-auth-error">{error}</div>
        ) : view ? (
          <>
            <p className="qms-auth-sub" style={{ marginBottom: 16 }}>
              <strong>{view.registered_by ?? 'A contractor'}</strong> registered your {roleLabel}{' '}
              <strong>{name}</strong>
              {view.project_name ? <> for project <strong>{view.project_name}</strong></> : null} on Strata.
              Please review and confirm.
            </p>

            {alreadyResponded && (
              <div className="qms-auth-error" style={{ background: '#EFF6FF', color: '#1E40AF', borderColor: '#BFDBFE' }}>
                This registration was already marked <strong>{view.status}</strong>. You can update your response below.
              </div>
            )}
            {error && <div className="qms-auth-error">{error}</div>}

            <form className="qms-auth-form" onSubmit={handleSubmit(submit('CONFIRM'))} noValidate>
              <Input label="Contact email" type="email" {...register('contact_email')} />
              <Input label="Contact phone" type="tel" {...register('contact_phone')} />
              {isLab ? (
                <>
                  <Input label="Lab manager name" {...register('lab_manager_name')} />
                  <Input label="NABL certificate no." {...register('nabl_certificate_no')} />
                </>
              ) : (
                <>
                  <Input label="Primary contact name" {...register('primary_contact_name')} />
                  <Input label="Plant location" {...register('plant_location')} />
                </>
              )}

              <Button type="submit" variant="primary" fullWidth disabled={isSubmitting}>
                {isSubmitting ? 'Submitting…' : 'Confirm my details'}
              </Button>
              <Button type="button" variant="outline" fullWidth disabled={isSubmitting} onClick={handleSubmit(submit('DECLINE'))}>
                This isn't us — decline
              </Button>
            </form>
          </>
        ) : (
          <div className="qms-auth-error">{error ?? 'This confirmation link is invalid.'}</div>
        )}
      </div>
    </div>
  );
};
