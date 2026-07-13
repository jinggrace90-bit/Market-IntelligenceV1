export function formatNumber(value: number, opts: Intl.NumberFormatOptions = {}): string {
  if (!isFinite(value)) return '—';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...opts,
  }).format(value);
}

export function formatPrice(value: number): string {
  const decimals = Math.abs(value) >= 1000 ? 2 : Math.abs(value) >= 1 ? 2 : 4;
  return formatNumber(value, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatNumber(value)}%`;
}

export function formatSignedNumber(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatPrice(value)}`;
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export const isUp = (change: number) => change >= 0;
