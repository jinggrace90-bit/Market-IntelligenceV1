'use client';

import { motion } from 'framer-motion';
import { Skeleton, Tooltip } from 'antd';
import { Sparkline } from './Sparkline';
import { Panel } from './Panel';
import { formatPercent, formatSignedNumber, isUp } from '@/lib/format';
import type { MarketCard } from '@/types';

function splitDecimals(value: number): { whole: string; decimal: string } {
  const formatted = value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: value >= 1000 ? 2 : 4,
  });
  const [whole, decimal] = formatted.split('.');
  return { whole, decimal: decimal ?? '' };
}

function Card({ card, index }: { card: MarketCard; index: number }) {
  const up = isUp(card.change);
  const { whole, decimal } = splitDecimals(card.price);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.3) }}
      onMouseMove={onMove}
      className="glass card-glow rounded-2xl p-4 transition-[transform,border-color] duration-300 hover:-translate-y-[2px] hover:border-hi"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Tooltip title={card.symbol}>
            <div className="truncate text-[13px] font-semibold text-primary">{card.name}</div>
          </Tooltip>
          <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
            {card.group}
          </div>
        </div>
        <span
          className={`shrink-0 font-mono text-[11px] font-medium tabular-nums ${
            up ? 'text-up' : 'text-down'
          }`}
        >
          {formatPercent(card.changePercent)}
        </span>
      </div>

      <div className="mt-3 font-serif text-[34px] leading-none tracking-tight text-primary tabular-nums">
        {whole}
        {decimal && <span className="text-muted">.{decimal}</span>}
      </div>
      <div className={`mt-1 font-mono text-[11px] tabular-nums ${up ? 'text-up' : 'text-down'}`}>
        {formatSignedNumber(card.change)}
      </div>

      <div className="mt-3">
        <Sparkline data={card.spark} up={up} />
      </div>
    </motion.div>
  );
}

export function MarketOverview({ cards }: { cards: MarketCard[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {cards.length === 0
        ? Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="glass rounded-2xl p-4">
              <Skeleton active paragraph={{ rows: 2 }} title={false} />
            </div>
          ))
        : cards.map((c, i) => <Card key={c.symbol} card={c} index={i} />)}
    </div>
  );
}
