import { CheckCircle } from 'lucide-react';

export const Toast = ({ message }: { message: string }) => (
  <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-lg border border-emerald-400/30 bg-emerald-500/15 px-4 py-3 text-sm font-medium text-emerald-100 shadow-glow backdrop-blur">
    <CheckCircle size={18} />
    {message}
  </div>
);
