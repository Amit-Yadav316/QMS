import React, { useId } from 'react';
import './Input.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, fullWidth = true, className = '', id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = error ? `${inputId}-error` : undefined;
    const wrapperClass = `qms-input-wrapper ${fullWidth ? 'qms-input--full' : ''} ${className}`;

    return (
      <div className={wrapperClass}>
        {label && (
          <label className="qms-input-label" htmlFor={inputId}>
            {label} {props.required && <span className="qms-req">*</span>}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={`qms-input ${error ? 'qms-input--error' : ''}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          {...props}
        />
        {error && <span id={errorId} className="qms-input-error-text">{error}</span>}
      </div>
    );
  }
);
Input.displayName = 'Input';
