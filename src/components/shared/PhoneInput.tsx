import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Phone } from 'lucide-react';

export const isValidPHPhone = (val: string) => /^09\d{9}$/.test(val.trim());

interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string;
  onChange: (val: string) => void;
  showIcon?: boolean;
  invalid?: boolean;
}

/**
 * Strict Philippine mobile phone input.
 * - Only digits allowed
 * - Forces leading "09"
 * - Caps at 11 chars total
 * - Renders a small phone icon prefix (optional)
 */
export const PhoneInput = React.memo(React.forwardRef<HTMLInputElement, PhoneInputProps>(function PhoneInput(
  { value, onChange, showIcon = true, className, invalid, placeholder = '09XXXXXXXXX', ...rest },
  ref,
) {
  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      let next = e.target.value.replace(/\D/g, '');
      // Force "09" prefix
      if (next.length >= 1 && next[0] !== '0') next = '0' + next;
      if (next.length >= 2 && next[1] !== '9') next = '09' + next.slice(2);
      next = next.slice(0, 11);
      onChange(next);
    },
    [onChange],
  );

  return (
    <div className={cn('relative', className)}>
      {showIcon && (
        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70 pointer-events-none" />
      )}
      <Input
        ref={ref}
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        maxLength={11}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        className={cn(showIcon && 'pl-9', invalid && 'border-destructive focus-visible:ring-destructive')}
        {...rest}
      />
    </div>
  );
}));

PhoneInput.displayName = 'PhoneInput';
