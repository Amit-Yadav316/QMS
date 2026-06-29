import React from 'react';
import * as RDialog from '@radix-ui/react-dialog';
import './dialog.css';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  icon?: React.ReactNode;
  /** Action buttons, rendered right-aligned in the footer. */
  footer?: React.ReactNode;
  children: React.ReactNode;
}

// Accessible modal built on Radix Dialog (focus trap, Esc to close, scrim click,
// aria wiring). Styled with the shared dialog.css. Controlled via open/onOpenChange.
export const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, title, icon, footer, children }) => (
  <RDialog.Root open={open} onOpenChange={onOpenChange}>
    <RDialog.Portal>
      <RDialog.Overlay className="qms-dialog-overlay" />
      <RDialog.Content className="qms-dialog-content" aria-describedby={undefined}>
        <div className="qms-dialog-head">
          {icon}
          <RDialog.Title className="qms-dialog-title">{title}</RDialog.Title>
        </div>
        {children}
        {footer && <div className="qms-dialog-actions">{footer}</div>}
      </RDialog.Content>
    </RDialog.Portal>
  </RDialog.Root>
);
