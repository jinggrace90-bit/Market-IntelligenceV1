'use client';

import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts';
import type { SparklinePoint } from '@/types';

export function Sparkline({ data, up }: { data: SparklinePoint[]; up: boolean }) {
  if (!data || data.length < 2) {
    return <div className="h-10 w-full" />;
  }
  const color = up ? '#16c784' : '#ea3943';
  const id = `spark-${up ? 'up' : 'down'}`;
  const values = data.map((d) => d.c);
  const min = Math.min(...values);
  const max = Math.max(...values);

  return (
    <ResponsiveContainer width="100%" height={40}>
      <AreaChart data={data} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <YAxis hide domain={[min, max]} />
        <Area
          type="monotone"
          dataKey="c"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#${id})`}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
