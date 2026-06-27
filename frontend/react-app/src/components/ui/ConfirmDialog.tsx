import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { Button } from './Button';
import './dialog.css';

interface ConfirmOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Style the confirm button as destructive (red). */
  danger?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

// Imperative confirm: `const confirm = useConfirm(); if (await confirm({...})) …`.
// Drop-in replacement for window.confirm with an accessible, styled AlertDialog.
// eslint-disable-next-line react-refresh/only-export-components
export const useConfirm = (): ConfirmFn => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within <ConfirmProvider>');
  return ctx;
};

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);
  const result = useRef(false);

  const confirm = useCallback<ConfirmFn>((o) => {
    result.current = false;
    setOpts(o);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  // Single resolve point: the chosen action sets `result` before Radix closes,
  // and dismiss (Esc / scrim) leaves it false.
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resolver.current?.(result.current);
      resolver.current = null;
      setOpts(null);
    }
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog.Root open={opts !== null} onOpenChange={handleOpenChange}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="qms-dialog-overlay" />
          <AlertDialog.Content className="qms-dialog-content">
            <AlertDialog.Title className="qms-dialog-title">{opts?.title}</AlertDialog.Title>
            <AlertDialog.Description className="qms-dialog-desc">{opts?.description}</AlertDialog.Description>
            <div className="qms-dialog-actions">
              <AlertDialog.Cancel asChild>
                <Button variant="ghost">{opts?.cancelLabel ?? 'Cancel'}</Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button
                  variant={opts?.danger ? 'danger' : 'primary'}
                  onClick={() => { result.current = true; }}
                >
                  {opts?.confirmLabel ?? 'Confirm'}
                </Button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </ConfirmContext.Provider>
  );
};
