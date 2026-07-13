import type { ButtonHTMLAttributes } from 'react'

interface BigButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'accent' | 'soft' | 'ghost'
}

export function BigButton({ variant = 'default', className = '', ...rest }: BigButtonProps) {
  const variantClass = variant === 'default' ? '' : `big-button--${variant}`
  return <button className={`big-button ${variantClass} ${className}`.trim()} {...rest} />
}
