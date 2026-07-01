// Reusable block / unblock control for RMC suppliers + testing labs. Blocking
// captures a reason inline; unblock is a single click. Shown only to roles that
// may block (QE / PM / contractor).

import React, { useState } from 'react';
import { Button } from './ui/Button';
import { Ban, Undo2 } from 'lucide-react';

export const BlockControl: React.FC<{
  blocked: boolean;
  busy?: boolean;
  onBlock: (reason: string) => void;
  onUnblock: () => void;
}> = ({ blocked, busy, onBlock, onUnblock }) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');

  if (blocked) {
    return (
      <Button size="sm" variant="outline" icon={<Undo2 size={13} />} disabled={busy} onClick={onUnblock}>
        Unblock
      </Button>
    );
  }
  if (!open) {
    return (
      <Button size="sm" variant="ghost" icon={<Ban size={13} />} disabled={busy} onClick={() => setOpen(true)}>
        Block
      </Button>
    );
  }
  return (
    <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
      <input
        className="qms-mix-link-input"
        style={{ width: 170 }}
        placeholder="Reason for blocking…"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <Button
        size="sm"
        variant="primary"
        disabled={busy || !reason.trim()}
        onClick={() => { onBlock(reason.trim()); setOpen(false); setReason(''); }}
      >
        Confirm
      </Button>
      <Button size="sm" variant="ghost" onClick={() => { setOpen(false); setReason(''); }}>
        Cancel
      </Button>
    </span>
  );
};
