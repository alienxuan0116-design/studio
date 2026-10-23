import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  onBack: () => void;
  children?: ReactNode;
}

export default function PageShell({ title, subtitle, onBack, children }: Props) {
  return (
    <>
      <div className="aurora-bg">
        <div className="aurora-blob blue" />
        <div className="aurora-blob violet" />
        <div className="aurora-blob magenta" />
      </div>
      <div className="relative z-10 min-h-screen flex justify-center">
        <main className="w-full max-w-2xl px-4 sm:px-7 py-6 sm:py-12 safe-bottom-pad">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-white/55 hover:text-white/90 transition-colors mb-5 sm:mb-6"
          >
            <ArrowLeft size={18} strokeWidth={1.8} />
            <span className="text-sm">Back to home</span>
          </button>
          <div className="glass glass-glow rounded-3xl p-4 sm:p-9">
            <h1 className="text-2xl font-light tracking-tight text-white/90 mb-2">{title}</h1>
            {subtitle && (
              <p className="text-[13px] text-white/40 leading-relaxed mb-6">{subtitle}</p>
            )}
            {children}
          </div>
        </main>
      </div>
    </>
  );
}
