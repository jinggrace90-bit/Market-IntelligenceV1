import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { getArticleById } from './news';
import { AiNewsAnalysis } from '../types';
import { HttpError } from '../utils/http';
import { logger } from '../utils/logger';

export const aiConfigured = () => Boolean(env.anthropicApiKey);

const client = aiConfigured() ? new Anthropic({ apiKey: env.anthropicApiKey }) : null;

const analysisSchema = z.object({
  summary: z.string(),
  keyEvents: z.array(z.string()).default([]),
  sentiment: z.enum(['bullish', 'bearish', 'neutral']),
  sentimentScore: z.number().min(-1).max(1).default(0),
  affectedSectors: z.array(z.string()).default([]),
  affectedAssets: z.array(z.string()).default([]),
  marketImplication: z.string(),
});

const NEWS_TOOL: Anthropic.Tool = {
  name: 'record_analysis',
  description: 'Record the structured market analysis of a news article.',
  input_schema: {
    type: 'object',
    properties: {
      summary: { type: 'string', description: '2-3 sentence neutral summary' },
      keyEvents: { type: 'array', items: { type: 'string' }, description: 'Key facts/events' },
      sentiment: { type: 'string', enum: ['bullish', 'bearish', 'neutral'] },
      sentimentScore: { type: 'number', description: '-1 (very bearish) to 1 (very bullish)' },
      affectedSectors: { type: 'array', items: { type: 'string' } },
      affectedAssets: { type: 'array', items: { type: 'string' }, description: 'Tickers or asset names' },
      marketImplication: { type: 'string', description: 'Educational explanation of why this could move markets' },
    },
    required: ['summary', 'sentiment', 'marketImplication'],
  },
};

const SYSTEM_PROMPT = `You are a markets analyst who helps retail investors build financial literacy.
Analyze the news article neutrally. Do NOT give buy/sell recommendations or personalized financial advice.
Explain macro cause-and-effect so the reader learns how markets work. Call record_analysis with your result.`;

async function runAnalysis(title: string, summary: string): Promise<z.infer<typeof analysisSchema>> {
  if (!client) throw new HttpError(503, 'AI analysis unavailable: set ANTHROPIC_API_KEY');

  const message = await client.messages.create({
    model: env.anthropicModel,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    tools: [NEWS_TOOL],
    tool_choice: { type: 'tool', name: 'record_analysis' },
    messages: [
      {
        role: 'user',
        content: `Headline: ${title}\n\nSummary: ${summary || '(no summary provided)'}`,
      },
    ],
  });

  const toolUse = message.content.find((c): c is Anthropic.ToolUseBlock => c.type === 'tool_use');
  if (!toolUse) throw new HttpError(502, 'AI did not return structured analysis');
  return analysisSchema.parse(toolUse.input);
}

/** Analyze one persisted article, caching the result in Postgres. */
export async function analyzeArticle(articleId: string, force = false): Promise<AiNewsAnalysis> {
  const article = await getArticleById(articleId);
  if (!article) throw new HttpError(404, 'Article not found');

  if (!force) {
    const existing = await prisma.newsAnalysis.findUnique({ where: { articleId } });
    if (existing) {
      return { ...toDto(existing), cached: true };
    }
  }

  const parsed = await runAnalysis(article.title, article.summary ?? '');
  const saved = await prisma.newsAnalysis.upsert({
    where: { articleId },
    create: { articleId, model: env.anthropicModel, ...parsed },
    update: { model: env.anthropicModel, ...parsed },
  });
  logger.info(`AI analysis cached for article ${articleId}`);
  return { ...toDto(saved), cached: false };
}

function toDto(a: {
  summary: string; keyEvents: string[]; sentiment: string; sentimentScore: number;
  affectedSectors: string[]; affectedAssets: string[]; marketImplication: string; model: string;
}): Omit<AiNewsAnalysis, 'cached'> {
  return {
    summary: a.summary,
    keyEvents: a.keyEvents,
    sentiment: a.sentiment as AiNewsAnalysis['sentiment'],
    sentimentScore: a.sentimentScore,
    affectedSectors: a.affectedSectors,
    affectedAssets: a.affectedAssets,
    marketImplication: a.marketImplication,
    model: a.model,
  };
}

const MACRO_TOOL: Anthropic.Tool = {
  name: 'record_macro_chain',
  description: 'Record a macro cause-and-effect chain.',
  input_schema: {
    type: 'object',
    properties: {
      thesis: { type: 'string' },
      chain: {
        type: 'array',
        description: 'Ordered cause -> effect nodes',
        items: {
          type: 'object',
          properties: {
            label: { type: 'string' },
            detail: { type: 'string' },
            direction: { type: 'string', enum: ['up', 'down', 'neutral'] },
          },
          required: ['label', 'detail'],
        },
      },
    },
    required: ['thesis', 'chain'],
  },
};

export interface MacroChain {
  thesis: string;
  chain: { label: string; detail: string; direction?: 'up' | 'down' | 'neutral' }[];
}

/** Generate a macro cause-and-effect chain for a scenario/headline. */
export async function analyzeMacro(scenario: string): Promise<MacroChain> {
  if (!client) throw new HttpError(503, 'AI analysis unavailable: set ANTHROPIC_API_KEY');
  const message = await client.messages.create({
    model: env.anthropicModel,
    max_tokens: 1024,
    system:
      'You explain macroeconomic cause-and-effect for learners. Given a scenario, produce a chain of 3-6 linked effects across asset classes (rates, USD, gold, equities, bonds, crypto). Educational, not advice.',
    tools: [MACRO_TOOL],
    tool_choice: { type: 'tool', name: 'record_macro_chain' },
    messages: [{ role: 'user', content: `Scenario: ${scenario}` }],
  });
  const toolUse = message.content.find((c): c is Anthropic.ToolUseBlock => c.type === 'tool_use');
  if (!toolUse) throw new HttpError(502, 'AI did not return a macro chain');
  return toolUse.input as MacroChain;
}
