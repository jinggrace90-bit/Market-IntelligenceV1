'use client';

import { useState } from 'react';
import { Button, Input, Alert, Tag } from 'antd';
import { ArrowDownOutlined, RiseOutlined, FallOutlined, MinusOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import { Panel } from './Panel';
import { api, apiError } from '@/lib/api';
import type { MacroChain } from '@/types';

const PRESETS = [
  'The Federal Reserve delays rate cuts',
  'Oil prices spike due to Middle East conflict',
  'US inflation comes in hotter than expected',
];

function DirectionIcon({ direction }: { direction?: string }) {
  if (direction === 'up') return <RiseOutlined className="text-up" />;
  if (direction === 'down') return <FallOutlined className="text-down" />;
  return <MinusOutlined className="text-muted" />;
}

export function MacroAnalysis({ enabled }: { enabled: boolean }) {
  const [scenario, setScenario] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chain, setChain] = useState<MacroChain | null>(null);

  const run = async (text: string) => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setChain(null);
    try {
      const { data } = await api.post(
        '/ai/macro',
        { scenario: text.trim() },
        { timeout: 120_000 },
      );
      setChain(data);
    } catch (e) {
      setError(apiError(e, 'Macro analysis failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Panel title="AI Macro Analysis" subtitle="See how a macro event ripples across asset classes" variant="analysis">
      {!enabled ? (
        <Alert type="info" showIcon message="Sign in to generate macro cause-and-effect chains." />
      ) : (
        <>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              onPressEnter={() => run(scenario)}
              placeholder="Describe a macro scenario…"
            />
            <Button type="primary" loading={loading} onClick={() => run(scenario)}>
              Analyze
            </Button>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <Tag
                key={p}
                className="cursor-pointer"
                onClick={() => {
                  setScenario(p);
                  run(p);
                }}
              >
                {p}
              </Tag>
            ))}
          </div>

          {error && (
            <Alert
              className="mt-3"
              type="warning"
              showIcon
              message={error.includes('ANTHROPIC') ? 'Set ANTHROPIC_API_KEY to enable this.' : error}
            />
          )}

          {chain && (
            <div className="mt-4">
              <div className="mb-3 text-sm text-secondary">{chain.thesis}</div>
              <div className="space-y-1">
                {chain.chain.map((node, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                  >
                    <div className="flex items-start gap-3 rounded-lg border border-border bg-panel2 p-3">
                      <DirectionIcon direction={node.direction} />
                      <div>
                        <div className="text-[13px] font-semibold text-primary">{node.label}</div>
                        <div className="text-[12px] text-secondary">{node.detail}</div>
                      </div>
                    </div>
                    {i < chain.chain.length - 1 && (
                      <div className="flex justify-center py-0.5 text-faint">
                        <ArrowDownOutlined />
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-faint">
                Educational illustration of macro linkages — not financial advice.
              </p>
            </div>
          )}
        </>
      )}
    </Panel>
  );
}
