'use client';

import { useEffect, useState } from 'react';
import { Modal, Tag, Spin, Alert, Divider } from 'antd';
import { api, apiError } from '@/lib/api';
import type { AiNewsAnalysis, NewsItem } from '@/types';

const sentimentColor: Record<string, string> = {
  bullish: 'green',
  bearish: 'red',
  neutral: 'default',
};

export function AiAnalysisModal({
  article,
  open,
  onClose,
}: {
  article: NewsItem | null;
  open: boolean;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AiNewsAnalysis | null>(null);

  useEffect(() => {
    if (!open || !article) return;
    let active = true;
    setLoading(true);
    setError(null);
    setAnalysis(null);
    api
      // Local (non-Anthropic) AI providers can take much longer than the
      // default client timeout, especially on modest hardware.
      .post(`/ai/news/${article.id}`, undefined, { timeout: 120_000 })
      .then((r) => active && setAnalysis(r.data))
      .catch((e) => active && setError(apiError(e, 'AI analysis failed')))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [open, article]);

  return (
    <Modal
      title={<span className="text-gray-100">AI News Analysis</span>}
      open={open}
      onCancel={onClose}
      footer={null}
      width={640}
    >
      {article && <div className="mb-3 text-sm font-medium text-gray-200">{article.title}</div>}

      {loading && (
        <div className="flex items-center gap-3 py-8 text-gray-400">
          <Spin /> Analyzing…
        </div>
      )}

      {error && (
        <Alert
          type="warning"
          showIcon
          message="AI analysis unavailable"
          description={
            error.includes('ANTHROPIC')
              ? 'Set ANTHROPIC_API_KEY in your .env to enable AI analysis.'
              : error
          }
        />
      )}

      {analysis && (
        <div className="space-y-3 text-sm text-gray-300">
          <div className="flex flex-wrap items-center gap-2">
            <Tag color={sentimentColor[analysis.sentiment]} className="uppercase">
              {analysis.sentiment}
            </Tag>
            <span className="text-xs text-gray-500">
              score {analysis.sentimentScore.toFixed(2)} · {analysis.model}
              {analysis.cached ? ' · cached' : ''}
            </span>
          </div>

          <p className="leading-relaxed">{analysis.summary}</p>

          {analysis.keyEvents.length > 0 && (
            <div>
              <div className="mb-1 text-xs font-semibold uppercase text-gray-500">Key events</div>
              <ul className="list-disc pl-5">
                {analysis.keyEvents.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          {(analysis.affectedSectors.length > 0 || analysis.affectedAssets.length > 0) && (
            <div className="flex flex-wrap gap-1.5">
              {analysis.affectedSectors.map((s) => (
                <Tag key={`sec-${s}`} color="blue">
                  {s}
                </Tag>
              ))}
              {analysis.affectedAssets.map((a) => (
                <Tag key={`ast-${a}`} color="geekblue">
                  {a}
                </Tag>
              ))}
            </div>
          )}

          <Divider className="my-2" />
          <div>
            <div className="mb-1 text-xs font-semibold uppercase text-gray-500">
              Market implication
            </div>
            <p className="leading-relaxed">{analysis.marketImplication}</p>
          </div>
          <p className="text-[11px] text-gray-600">
            Educational analysis only — not financial advice.
          </p>
        </div>
      )}
    </Modal>
  );
}
