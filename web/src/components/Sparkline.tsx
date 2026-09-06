'use client';

import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts';
import type { SparklinePoint } from '@/types';

export function Sparkline({ data, up }: { data: SparklinePoint[]; up: boolean }) {
  if (!data || data.length < 2) {
    return <div className="h-10 w-full" />;
  }
  const color = up ? 'var(--color-up)' : 'var(--color-down)';
  const id = `spark-${up ? 'up' : 'down'}`;
  const values = data.map((d) => d.c);
  const min = Math.min(...values);
  const max = Math.max(...values);

  return (
    <ResponsiveContainer width="100%" height={42}>
      <AreaChart data={data} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <YAxis hide domain={[min, max]} />
        <Area
          type="linear"
          dataKey="c"
          stroke={color}
          strokeWidth={1.3}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={`url(#${id})`}
          isAnimationActive={false}
          dot={false}
          activeDot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
