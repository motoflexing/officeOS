import { CheckCircle } from 'lucide-react';

export const Toast = ({ message }: { message: string }) => (
  <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-lg border border-[color:var(--color-success-line-30)] bg-[var(--color-success-fill-15)] px-4 py-3 text-sm font-medium text-[color:var(--color-success-text-100)] shadow-glow backdrop-blur">
    <CheckCircle size={18} />
    {message}
  </div>
);
