import { cx } from '@/lib/utils';

export function Card({ children }: { children: React.ReactNode }){
  return <div className="rounded-2xl border bg-white shadow-sm">{children}</div>;
}
export function CardHeader({ title, hint }: { title: string; hint?: string }){
  return (
    <div className="px-4 pt-4 pb-3 border-b">
      <div className="font-extrabold">{title}</div>
      {hint && <div className="text-xs text-gray-500 mt-1">{hint}</div>}
    </div>
  );
}
export function CardBody({ children }: { children: React.ReactNode }){
  return <div className="p-4">{children}</div>;
}

export function Badge({ type, text }: { type: 'ok'|'warn'|'bad'; text: string }){
  const cls = type==='ok' ? 'bg-green-50 text-green-700 border-green-200'
    : type==='warn' ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-red-50 text-red-700 border-red-200';
  return <span className={cx('inline-flex items-center px-2 py-1 rounded-full text-xs font-bold border', cls)}>{text}</span>;
}

export function Button({ children, variant='primary', ...props }:
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary'|'ghost'|'danger' }){
  const cls = variant==='primary' ? 'bg-gray-900 text-white hover:bg-gray-800'
    : variant==='danger' ? 'bg-red-600 text-white hover:bg-red-500'
    : 'bg-transparent hover:bg-gray-100';
  return (
    <button {...props}
      className={cx('px-3 py-2 rounded-xl text-sm font-extrabold transition border border-transparent', cls, props.className)}>
      {children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>){
  return (
    <input {...props}
      className={cx('w-full px-3 py-2 rounded-xl border bg-white text-sm outline-none',
        'focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400', props.className)} />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>){
  return (
    <select {...props}
      className={cx('w-full px-3 py-2 rounded-xl border bg-white text-sm outline-none',
        'focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400', props.className)} />
  );
}
