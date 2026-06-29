import React, { useId } from 'react';
import './Select.css';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
  options: { label: string; value: string | number }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, fullWidth = true, options, className = '', id, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;
    const errorId = error ? `${selectId}-error` : undefined;
    const wrapperClass = `qms-select-wrapper ${fullWidth ? 'qms-select--full' : ''} ${className}`;

    return (
      <div className={wrapperClass}>
        {label && (
          <label className="qms-select-label" htmlFor={selectId}>
            {label} {props.required && <span className="qms-req">*</span>}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={`qms-select ${error ? 'qms-select--error' : ''}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <span id={errorId} className="qms-select-error-text">{error}</span>}
      </div>
    );
  }
);
Select.displayName = 'Select';
