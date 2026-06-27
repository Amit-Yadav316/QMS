import React from 'react';
import './Button.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'danger' | 'success' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon,
  className = '',
  ...props
}, ref) => {
  const baseClass = 'qms-btn';
  const classes = [
    baseClass,
    `${baseClass}--${variant}`,
    `${baseClass}--${size}`,
    fullWidth ? `${baseClass}--full` : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <button ref={ref} className={classes} {...props}>
      {icon && <span className="qms-btn-icon">{icon}</span>}
      {children}
    </button>
  );
});
Button.displayName = 'Button';
