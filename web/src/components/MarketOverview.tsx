'use client';

import { motion } from 'framer-motion';
import { Skeleton, Tooltip } from 'antd';
import { Sparkline } from './Sparkline';
import { Panel } from './Panel';
import { formatPrice, formatPercent, formatSignedNumber, isUp } from '@/lib/format';
import type { MarketCard } from '@/types';

function Card({ card, index }: { card: MarketCard; index: number }) {
  const up = isUp(card.change);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.3) }}
      className="rounded-lg border border-border bg-panel2 p-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Tooltip title={card.symbol}>
            <div className="truncate text-[13px] font-semibold text-gray-100">{card.name}</div>
          </Tooltip>
          <div className="text-[11px] uppercase tracking-wide text-gray-500">{card.group}</div>
        </div>
        <span
          className={`rounded px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
            up ? 'bg-up/10 text-up' : 'bg-down/10 text-down'
          }`}
        >
          {formatPercent(card.changePercent)}
        </span>
      </div>

      <div className="mt-1 font-mono text-lg font-semibold tabular-nums text-gray-50">
        {formatPrice(card.price)}
      </div>
      <div className={`text-[12px] tabular-nums ${up ? 'text-up' : 'text-down'}`}>
        {formatSignedNumber(card.change)}
      </div>

      <div className="mt-2">
        <Sparkline data={card.spark} up={up} />
      </div>
    </motion.div>
  );
}

export function MarketOverview({ cards }: { cards: MarketCard[] }) {
  return (
    <Panel title="Market Overview" subtitle="Live · updates every 15s">
      {cards.length === 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-panel2 p-3">
              <Skeleton active paragraph={{ rows: 2 }} title={false} />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {cards.map((c, i) => (
            <Card key={c.symbol} card={c} index={i} />
          ))}
        </div>
      )}
    </Panel>
  );
}
