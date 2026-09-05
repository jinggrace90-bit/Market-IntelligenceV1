'use client';

import { useQuery } from '@tanstack/react-query';
import { Table, Tag, Select, Empty } from 'antd';
import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Panel } from './Panel';
import { api } from '@/lib/api';
import type { EconomicEvent } from '@/types';

const impColor: Record<string, string> = { high: 'red', medium: 'orange', low: 'default' };

export function EconomicCalendarPanel() {
  const [importance, setImportance] = useState<string>('');
  const { data = [], isLoading } = useQuery<EconomicEvent[]>({
    queryKey: ['calendar'],
    refetchInterval: 60 * 60 * 1000,
    queryFn: async () => (await api.get('/calendar')).data.data,
  });

  const rows = useMemo(
    () => (importance ? data.filter((e) => e.importance === importance) : data).slice(0, 60),
    [data, importance],
  );

  return (
    <Panel
      title="Economic Calendar"
      subtitle="Upcoming macro releases"
      action={
        <Select
          size="small"
          value={importance}
          style={{ width: 120 }}
          onChange={setImportance}
          options={[
            { value: '', label: 'All impact' },
            { value: 'high', label: 'High' },
            { value: 'medium', label: 'Medium' },
            { value: 'low', label: 'Low' },
          ]}
        />
      }
    >
      {!isLoading && rows.length === 0 ? (
        <Empty description="No calendar events available" />
      ) : (
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <Table<EconomicEvent>
            loading={isLoading}
            dataSource={rows}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 8, size: 'small' }}
            scroll={{ x: 600 }}
            columns={[
              {
                title: 'Date',
                dataIndex: 'date',
                width: 100,
                fixed: 'left' as const,
                render: (d: string) => (
                  <span className="whitespace-nowrap text-[12px] text-secondary">
                    {dayjs(d).isValid() ? dayjs(d).format('MMM D, HH:mm') : d}
                  </span>
                ),
              },
              { title: 'Event', dataIndex: 'event', width: 160, ellipsis: true },
              { title: 'Country', dataIndex: 'country', width: 80 },
              {
                title: 'Impact',
                dataIndex: 'importance',
                width: 75,
                render: (i: string) => <Tag color={impColor[i]}>{i}</Tag>,
              },
              { title: 'Prev', dataIndex: 'previous', width: 70, render: (v: string) => v ?? '—' },
              { title: 'Fcst', dataIndex: 'forecast', width: 70, render: (v: string) => v ?? '—' },
              { title: 'Actual', dataIndex: 'actual', width: 70, render: (v: string) => v ?? '—' },
            ]}
          />
        </div>
      )}
    </Panel>
  );
}
