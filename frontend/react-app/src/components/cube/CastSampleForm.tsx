import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { ErrorBox } from '../ui/ErrorBox';
import { getApiErrorMessage } from '../../api/client';
import type { LabResponse, PourResponse } from '../../types/master';
import { useCastSample } from './queries';

interface CastSampleFormProps {
  pid: number;
  pours: PourResponse[];
  labs: LabResponse[];
  onClose: () => void;
}

export const CastSampleForm: React.FC<CastSampleFormProps> = ({ pid, pours, labs, onClose }) => {
  const cast = useCastSample(pid);
  const [error, setError] = useState<string | null>(null);

  const [pourId, setPourId] = useState('');
  const [castDate, setCastDate] = useState('');
  const [noOfCubes, setNoOfCubes] = useState('3');
  const [castLabId, setCastLabId] = useState('');
  const [sampleRef, setSampleRef] = useState('');

  const canCast = pourId !== '' && castDate !== '' && Number(noOfCubes) > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await cast.mutateAsync({
        pourId: Number(pourId),
        data: {
          sample_reference: sampleRef.trim() || null,
          cast_date: castDate,
          no_of_cubes: Number(noOfCubes),
          lab_id: castLabId ? Number(castLabId) : null,
        },
      });
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to cast cube sample.'));
    }
  };

  return (
    <Card className="qms-form-section">
      <form onSubmit={handleSubmit}>
        <h3 className="qms-section-heading">Cast a cube sample</h3>
        {error && <ErrorBox>{error}</ErrorBox>}
        <div className="qms-grid-3">
          <Select
            label="Pour"
            required
            value={pourId}
            onChange={(e) => setPourId(e.target.value)}
            options={[
              { label: pours.length ? 'Select pour…' : 'No pours yet — raise one first', value: '' },
              ...pours.map((p) => ({
                label: `${p.pour_reference ?? `PC-${p.pour_id}`} · ${p.grade_name ?? '—'} · ${[p.tower_name, p.floor_label].filter(Boolean).join(' ')}`,
                value: p.pour_id,
              })),
            ]}
          />
          <Input
            label="Sample reference"
            value={sampleRef}
            onChange={(e) => setSampleRef(e.target.value)}
            placeholder="e.g. CS-001"
          />
          <Input
            label="Cast date"
            type="date"
            required
            value={castDate}
            onChange={(e) => setCastDate(e.target.value)}
          />
          <Input
            label="No. of cubes"
            type="number"
            min="1"
            required
            value={noOfCubes}
            onChange={(e) => setNoOfCubes(e.target.value)}
          />
          <Select
            label="Lab (optional)"
            value={castLabId}
            onChange={(e) => setCastLabId(e.target.value)}
            options={[
              { label: 'Not assigned yet', value: '' },
              ...labs.map((l) => ({ label: l.lab_name, value: l.lab_id })),
            ]}
          />
        </div>
        <div className="qms-form-actions qms-cube-actions">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={cast.isPending || !canCast}>
            {cast.isPending ? 'Saving…' : 'Cast sample'}
          </Button>
        </div>
      </form>
    </Card>
  );
};
