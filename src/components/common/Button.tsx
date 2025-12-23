import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  leftIcon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  leftIcon,
  variant = 'primary',
  size = 'md',
  className = '',
  ...rest
}) => {
  return (
    <button className={`btn btn-${variant} btn-${size} ${className}`.trim()} {...rest}>
      {leftIcon && <span className="btn-icon">{leftIcon}</span>}
      <span>{children}</span>
    </button>
  );
};

export default Button;
