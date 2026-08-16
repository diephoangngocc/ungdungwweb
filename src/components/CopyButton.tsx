'use client';

import { useState } from 'react';
import { useToast } from '@/components/Toast';

/**
 * Clipboard API chỉ khả dụng trong secure context (https/localhost).
 * Fallback execCommand giữ cho nút vẫn hoạt động trên http nội bộ / WebView cũ.
 */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* rơi xuống fallback */
  }

  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

type Props = {
  value: string;
  className?: string;
  label?: string;
};

export function CopyButton({ value, className = '', label = 'Copy Mã' }: Props) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    const ok = await copyText(value);
    if (ok) {
      setCopied(true);
      toast(`Đã copy mã ${value}`, 'success');
      setTimeout(() => setCopied(false), 1600);
    } else {
      toast('Trình duyệt chặn clipboard — hãy copy thủ công.', 'error');
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`${label} ${value}`}
      className={[
        'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2',
        'text-sm font-semibold transition-colors',
        copied
          ? 'bg-emerald-600 text-white'
          : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800',
        className,
      ].join(' ')}
    >
      <span aria-hidden="true">{copied ? '✓' : '⧉'}</span>
      {copied ? 'Đã copy' : label}
    </button>
  );
}
