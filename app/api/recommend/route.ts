import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import path from 'path';
import type { Creator, Brand, Campaign, BrandAttrs } from '@/lib/types';
import {
  recommendFromText,
  parseBrandTextKeyword,
  calcCategoryScore,
  calcContextScore,
  gradeLabel,
} from '@/lib/recommendation';

function load<T>(name: string): T {
  return JSON.parse(readFileSync(path.join(process.cwd(), 'data', name), 'utf-8')) as T;
}

async function parseBrandText(text: string): Promise<BrandAttrs> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return parseBrandTextKeyword(text);
  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system:
        '당신은 브랜드 마케팅 전문가입니다. 사용자가 입력한 브랜드 소개 텍스트를 분석하여 아래 JSON 형식으로만 응답하세요. 설명이나 다른 텍스트 없이 JSON만 반환하세요.\n\n반환 형식:\n{\n  "Brand_Name": "브랜드명 (언급 없으면 입력된 브랜드)",\n  "Industry": "뷰티|패션|식품|테크|게임|생활용품|피트니스|교육|여행|헬스케어 중 하나",\n  "Target_Age": "13-17|18-34|25-44|35-54 중 하나",\n  "Target_Gender": "Mixed|Female|Male 중 하나",\n  "Preferred_Platform": "Mixed|YouTube|Instagram|TikTok 중 하나",\n  "Monthly_Budget": 월예산정수원단위언급없으면1500000,\n  "Max_CPM": 최대CPM실수언급없으면5000.0\n}',
      messages: [{ role: 'user', content: text }],
    });
    const raw = (response.content[0] as { type: string; text: string }).text.trim();
    const fence = raw.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
    const parsed = JSON.parse(fence ? fence[1] : raw) as Record<string, unknown>;

    const validIndustries = new Set(['뷰티','패션','식품','테크','게임','생활용품','피트니스','교육','여행','헬스케어']);
    const validAges      = new Set(['13-17','18-34','25-44','35-54']);
    const validGenders   = new Set(['Mixed','Female','Male']);
    const validPlatforms = new Set(['Mixed','YouTube','Instagram','TikTok']);

    return {
      Brand_Name:         String(parsed.Brand_Name ?? '입력된 브랜드'),
      Industry:           validIndustries.has(String(parsed.Industry)) ? String(parsed.Industry) : '뷰티',
      Target_Age:         validAges.has(String(parsed.Target_Age))     ? String(parsed.Target_Age) : '18-34',
      Target_Gender:      validGenders.has(String(parsed.Target_Gender)) ? String(parsed.Target_Gender) : 'Mixed',
      Preferred_Platform: validPlatforms.has(String(parsed.Preferred_Platform)) ? String(parsed.Preferred_Platform) : 'Mixed',
      Max_CPM:            Number(parsed.Max_CPM ?? 5000),
      Monthly_Budget:     Number(parsed.Monthly_Budget ?? 1500000),
    };
  } catch {
    return parseBrandTextKeyword(text);
  }
}

export async function POST(req: NextRequest) {
  const { text, riskThreshold = 2.5, topN = 3 } = (await req.json()) as {
    text: string;
    riskThreshold: number;
    topN: number;
  };

  if (!text?.trim()) return NextResponse.json({ error: '텍스트를 입력해주세요.' }, { status: 400 });

  const [creators, brands, campaigns] = [
    load<Creator[]>('creators.json'),
    load<Brand[]>('brands.json'),
    load<Campaign[]>('campaigns.json'),
  ];

  const brandAttrs = await parseBrandText(text);

  const recommendations = recommendFromText(brandAttrs, creators, riskThreshold, topN);

  const brandMap    = Object.fromEntries(brands.map(b => [b.Brand_ID, b]));
  const creatorMap  = Object.fromEntries(creators.map(c => [c.Creator_ID, c]));
  const collabCount: Record<string, number> = {};
  const pastByCreator: Record<string, Campaign[]> = {};
  for (const camp of campaigns) {
    collabCount[camp.Creator_ID] = (collabCount[camp.Creator_ID] ?? 0) + 1;
    if (!pastByCreator[camp.Creator_ID]) pastByCreator[camp.Creator_ID] = [];
    pastByCreator[camp.Creator_ID].push(camp);
  }

  const enriched = recommendations.map(r => ({
    ...r,
    collab_count: collabCount[r.Creator_ID] ?? 0,
    past_campaigns: (pastByCreator[r.Creator_ID] ?? []).slice(0, 5).map(c => ({
      Brand_Name: brandMap[c.Brand_ID]?.Brand_Name ?? c.Brand_ID,
      CTR: c.CTR,
      CVR: c.CVR,
      is_success: c.is_success,
    })),
  }));

  const topIds = new Set(recommendations.map(r => r.Creator_ID));
  const similarCases = campaigns
    .filter(c => {
      const b = brandMap[c.Brand_ID];
      return b?.Industry === brandAttrs.Industry && topIds.has(c.Creator_ID) && c.is_success === 'Y';
    })
    .slice(0, 5)
    .map(c => ({
      Brand_Name:   brandMap[c.Brand_ID]?.Brand_Name ?? c.Brand_ID,
      Creator_Name: creatorMap[c.Creator_ID]?.Channel_Name ?? c.Creator_ID,
      CTR: c.CTR,
      CVR: c.CVR,
      Impressions: c.Impressions,
    }));

  // score distribution (all creators, no risk filter)
  const allScores = creators
    .map(c => {
      const cat = calcCategoryScore(brandAttrs.Industry, c.Category);
      if (cat === 0) return null;
      const ctx = calcContextScore(brandAttrs, c);
      return Math.round((cat * 0.5 + ctx * 0.5) * 10000) / 10000;
    })
    .filter((s): s is number => s !== null);

  return NextResponse.json({
    brandAttrs,
    recommendations: enriched,
    similarCases,
    allScores,
    maxFollowers: Math.max(...creators.map(c => c.Followers)),
  });
}
