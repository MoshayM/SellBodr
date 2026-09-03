'use client';
import { useState, useRef, useEffect } from 'react';
import { exportData, type ExportFormat } from '@/lib/exportUtils';

const FORMATS: { id: ExportFormat; label: string; icon: string; ext: string }[] = [
  { id: 'csv',  label: 'CSV',   icon: '📄', ext: '.csv'  },
  { id: 'xlsx', label: 'Excel', icon: '📊', ext: '.xlsx' },
  { id: 'pdf',  label: 'PDF',   icon: '📋', ext: '.pdf'  },
  { id: 'doc',  label: 'Word',  icon: '📝', ext: '.doc'  },
];

interface Props {
  getData: () => any[];
  label?: string;
  disabled?: boolean;
  className?: string;
  align?: 'left' | 'right';
}

export function ExportMenu({ getData, label = 'opportunities', disabled, className, align = 'right' }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<ExportFormat | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  async function handleExport(fmt: ExportFormat) {
    setOpen(false);
    setBusy(fmt);
    try {
      await exportData(fmt, getData(), label);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div ref={ref} className={`relative inline-block ${className ?? ''}`}>
      <button
        onClick={() => !busy && setOpen(o => !o)}
        disabled={disabled || !!busy}
        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-white/10 text-white/60 hover:bg-white/5 hover:text-white hover:border-violet-500/40 transition-all disabled:opacity-40 select-none">
        {busy
          ? <><span className="inline-block animate-spin leading-none">↻</span> Exporting…</>
          : <><span className="text-[11px]">⬇</span> Export <span className="text-white/30 text-[10px]">▾</span></>
        }
      </button>

      {open && (
        <div
          className={`absolute mt-1.5 w-44 rounded-xl border border-white/10 bg-[#0d1526] shadow-2xl shadow-black/60 overflow-hidden z-50 py-1 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}>
          <div className="px-3 py-1.5 text-[9px] font-bold text-white/30 uppercase tracking-widest border-b border-white/8 mb-1">
            Download as
          </div>
          {FORMATS.map(f => (
            <button
              key={f.id}
              onClick={() => handleExport(f.id)}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-white/70 hover:bg-white/5 hover:text-white transition-colors text-left">
              <span className="text-base leading-none">{f.icon}</span>
              <span className="font-medium flex-1">{f.label}</span>
              <span className="text-white/25 font-mono text-[10px]">{f.ext}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
