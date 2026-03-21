import type { ReactNode, ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  /** Visual style variant (called "type" in the design spec) */
  type?: ButtonVariant;
  /** Size preset */
  size?: ButtonSize;
  /** Optional icon element or string rendered left of the label */
  icon?: ReactNode;
  /** Button contents (optional for icon-only buttons) */
  children?: ReactNode;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'btn--primary',
  secondary: 'btn--secondary',
  danger: 'btn--danger',
  ghost: 'btn--ghost',
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  small: 'btn--small',
  medium: 'btn--medium',
  large: 'btn--large',
};

export function Button({
  type = 'primary',
  size = 'medium',
  icon,
  children,
  className = '',
  disabled,
  ...rest
}: ButtonProps) {
  const classes = [
    'btn',
    VARIANT_CLASS[type],
    SIZE_CLASS[size],
    disabled ? 'btn--disabled' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={classes} type="button" disabled={disabled} {...rest}>
      {icon != null && <span className="btn__icon" aria-hidden="true">{icon}</span>}
      {children != null && <span className="btn__label">{children}</span>}
    </button>
  );
}
