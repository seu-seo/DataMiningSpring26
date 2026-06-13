import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import path from 'path';
import type { Creator, Brand, Campaign } from '@/lib/types';

function load<T>(name: string): T {
  return JSON.parse(readFileSync(path.join(process.cwd(), 'data', name), 'utf-8')) as T;
}

export async function GET() {
  const creators  = load<Creator[]>('creators.json');
  const brands    = load<Brand[]>('brands.json');
  const campaigns = load<Campaign[]>('campaigns.json');

  const brandMap   = Object.fromEntries(brands.map(b => [b.Brand_ID, b]));
  const creatorMap = Object.fromEntries(creators.map(c => [c.Creator_ID, c]));

  const totalCollabs = campaigns.length;
  const successCnt   = campaigns.filter(c => c.is_success === 'Y').length;
  const successRate  = (successCnt / totalCollabs) * 100;
  const avgCTR       = campaigns.reduce((s, c) => s + c.CTR, 0) / totalCollabs;
  const avgCVR       = campaigns.reduce((s, c) => s + c.CVR, 0) / totalCollabs;

  // Industry success rate
  const indStats: Record<string, { total: number; success: number }> = {};
  for (const camp of campaigns) {
    const ind = brandMap[camp.Brand_ID]?.Industry;
    if (!ind) continue;
    if (!indStats[ind]) indStats[ind] = { total: 0, success: 0 };
    indStats[ind].total++;
    if (camp.is_success === 'Y') indStats[ind].success++;
  }
  const industrySuccessRate = Object.entries(indStats)
    .map(([업종, s]) => ({ 업종, '성공률(%)': Math.round((s.success / s.total) * 1000) / 10 }))
    .sort((a, b) => a['성공률(%)'] - b['성공률(%)']);

  // Category avg CTR
  const catStats: Record<string, { total: number; ctr: number }> = {};
  for (const camp of campaigns) {
    const cat = creatorMap[camp.Creator_ID]?.Category;
    if (!cat) continue;
    if (!catStats[cat]) catStats[cat] = { total: 0, ctr: 0 };
    catStats[cat].total++;
    catStats[cat].ctr += camp.CTR;
  }
  const catAvgCTR = Object.entries(catStats)
    .map(([카테고리, s]) => ({ 카테고리, '평균CTR(%)': Math.round((s.ctr / s.total) * 100) / 100 }))
    .sort((a, b) => a['평균CTR(%)'] - b['평균CTR(%)']);

  // Top 10 creators
  const successCntMap: Record<string, number> = {};
  for (const camp of campaigns) {
    if (camp.is_success === 'Y') successCntMap[camp.Creator_ID] = (successCntMap[camp.Creator_ID] ?? 0) + 1;
  }
  const top10Creators = Object.entries(successCntMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([id, cnt]) => ({ 크리에이터: creatorMap[id]?.Channel_Name ?? id, 성공횟수: cnt }))
    .sort((a, b) => a.성공횟수 - b.성공횟수);

  // Scatter sample
  const shuffled = [...campaigns].sort(() => 0.5 - Math.random()).slice(0, 300);
  const scatterData = shuffled.map(c => ({
    Impressions: c.Impressions,
    CTR: c.CTR,
    결과: c.is_success === 'Y' ? '성공' : '실패',
  }));

  const allCampaigns = campaigns.map(c => ({
    브랜드:      brandMap[c.Brand_ID]?.Brand_Name ?? c.Brand_ID,
    크리에이터:  creatorMap[c.Creator_ID]?.Channel_Name ?? c.Creator_ID,
    CTR:         c.CTR,
    CVR:         c.CVR,
    Impressions: c.Impressions,
    Budget_Spent: c.Budget_Spent,
    성공: c.is_success,
  }));

  return NextResponse.json({
    kpis: { totalCollabs, successRate, avgCTR, avgCVR },
    industrySuccessRate,
    catAvgCTR,
    top10Creators,
    scatterData,
    allCampaigns,
  });
}
