import React from 'react';
import './ErrorBox.css';

// Reusable inline error notice (token-based). Shared across features.
export const ErrorBox: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="qms-errorbox" role="alert">{children}</div>
);
