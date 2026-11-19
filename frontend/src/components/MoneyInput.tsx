import type { InputHTMLAttributes } from 'react';

type MoneyInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type'
> & {
  value: number | '';
  onChange: (value: number | '') => void;
};

const formato = new Intl.NumberFormat('es-CO', {
  maximumFractionDigits: 0,
});

export function MoneyInput({ value, onChange, className = 'input', ...props }: MoneyInputProps) {
  return (
    <input
      {...props}
      type="text"
      inputMode="numeric"
      className={className}
      value={value === '' ? '' : formato.format(value)}
      onChange={(event) => {
        const digitos = event.target.value.replace(/\D/g, '');
        onChange(digitos === '' ? '' : Number(digitos));
      }}
      placeholder={props.placeholder ?? '0'}
    />
  );
}
