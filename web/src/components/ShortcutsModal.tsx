'use client';

import { Modal } from 'antd';

const shortcuts: { key: string; label: string }[] = [
  { key: '/', label: 'Focus search' },
  { key: 'j', label: 'Next news item' },
  { key: 'k', label: 'Previous news item' },
  { key: 'Enter', label: 'Open selected article' },
  { key: 'a', label: 'AI analysis on selected' },
  { key: 'Esc', label: 'Clear selection / close' },
  { key: '?', label: 'Show this help' },
];

export function ShortcutsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title="Keyboard shortcuts"
      width={420}
      destroyOnHidden
    >
      <ul className="m-0 flex flex-col gap-1 p-0">
        {shortcuts.map((s) => (
          <li
            key={s.key}
            className="flex items-center justify-between rounded-md px-2 py-2 text-[13px] text-secondary hover:bg-panel2"
          >
            <span>{s.label}</span>
            <kbd className="rounded border border-border bg-panel2 px-2 py-0.5 font-mono text-[11px] text-primary">
              {s.key}
            </kbd>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
