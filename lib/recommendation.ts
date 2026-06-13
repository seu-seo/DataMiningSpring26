import type { Creator, BrandAttrs, RecommendedCreator } from './types';

const categoryMap: Record<string, string[]> = {
  '뷰티': ['뷰티'],
  '패션': ['패션', '라이프스타일'],
  '식품': ['푸드'],
  '테크': ['테크', '게임'],
  '생활용품': ['라이프스타일'],
  '피트니스': ['피트니스', '라이프스타일'],
  '교육': ['교육'],
  '여행': ['여행', '라이프스타일'],
  '게임': ['게임', '테크'],
  '헬스케어': ['라이프스타일', '피트니스'],
};

const similarCategories: Record<string, number> = {
  '뷰티:패션': 0.5, '패션:뷰티': 0.5,
  '테크:게임': 0.5, '게임:테크': 0.5,
  '라이프스타일:여행': 0.5, '여행:라이프스타일': 0.5,
  '푸드:라이프스타일': 0.3, '라이프스타일:푸드': 0.3,
  '피트니스:라이프스타일': 0.5, '라이프스타일:피트니스': 0.5,
};

export function calcCategoryScore(brandIndustry: string, creatorCategory: string): number {
  const direct = categoryMap[brandIndustry] ?? [];
  if (direct.includes(creatorCategory)) return 1.0;
  return similarCategories[`${creatorCategory}:${brandIndustry}`] ?? 0.0;
}

export function calcContextScore(brand: BrandAttrs, creator: Creator): number {
  let score = 0.0;
  if (brand.Target_Age === creator.Target_Age) score += 0.25;
  if (
    brand.Target_Gender === creator.Target_Gender ||
    creator.Target_Gender === 'Mixed' ||
    brand.Target_Gender === 'Mixed'
  ) score += 0.25;
  if (creator.Estimated_CPM <= brand.Max_CPM) score += 0.25;
  if (creator.Risk_Score >= 3.0) score += 0.25;
  return score;
}

export function gradeLabel(score: number): 'A' | 'B' | 'C' | 'D' {
  if (score >= 0.9) return 'A';
  if (score >= 0.8) return 'B';
  if (score >= 0.7) return 'C';
  return 'D';
}

export function parseBrandTextKeyword(text: string): BrandAttrs {
  const industryMap: Record<string, string[]> = {
    '뷰티': ['뷰티', '스킨케어', '화장', '코스메틱', '메이크업', '향수'],
    '패션': ['패션', '의류', '옷', '스타일', '코디'],
    '식품': ['식품', '음식', '요리', '먹', '푸드', '식음료', '베이커리', '카페'],
    '테크': ['테크', '기술', '전자', 'it', '소프트웨어', '앱', '스타트업'],
    '게임': ['게임', '게이밍', 'e스포츠'],
    '생활용품': ['생활', '가전', '인테리어', '청소', '주방'],
    '피트니스': ['피트니스', '운동', '헬스', '다이어트', '스포츠', '요가'],
    '교육': ['교육', '학습', '강의', '튜터', '어학'],
    '여행': ['여행', '투어', '관광', '호텔'],
    '헬스케어': ['헬스케어', '건강', '의료', '영양', '보건', '비건'],
  };

  let industry = '뷰티';
  for (const [ind, kws] of Object.entries(industryMap)) {
    if (kws.some(kw => text.toLowerCase().includes(kw))) { industry = ind; break; }
  }

  let targetAge = '18-34';
  if (['10대', '청소년', '틴'].some(k => text.includes(k))) targetAge = '13-17';
  else if (['5060', '50대', '60대', '중장년', '시니어'].some(k => text.includes(k))) targetAge = '35-54';
  else if (['3040', '40대', '4050'].some(k => text.includes(k))) targetAge = '25-44';

  let targetGender = 'Mixed';
  if (['여성', '여자', '여성분'].some(k => text.includes(k))) targetGender = 'Female';
  else if (['남성', '남자', '남성분'].some(k => text.includes(k))) targetGender = 'Male';

  let platform = 'Mixed';
  if (['유튜브', 'youtube'].some(k => text.toLowerCase().includes(k))) platform = 'YouTube';
  else if (['인스타', 'instagram'].some(k => text.toLowerCase().includes(k))) platform = 'Instagram';
  else if (['틱톡', 'tiktok'].some(k => text.toLowerCase().includes(k))) platform = 'TikTok';

  let maxCPM = 5000.0;
  const m = text.match(/(\d[\d,]*)\s*만\s*원/);
  if (m) maxCPM = parseInt(m[1].replace(/,/g, '')) * 10000 / 300;

  return {
    Brand_Name: '입력된 브랜드',
    Industry: industry,
    Target_Age: targetAge,
    Target_Gender: targetGender,
    Preferred_Platform: platform,
    Max_CPM: maxCPM,
    Monthly_Budget: Math.round(maxCPM * 300),
  };
}

export function recommendFromText(
  brandAttrs: BrandAttrs,
  creators: Creator[],
  riskThreshold = 2.5,
  topN = 3,
): RecommendedCreator[] {
  const rows: RecommendedCreator[] = [];
  for (const c of creators) {
    if (c.Risk_Score < riskThreshold) continue;
    const catScore = calcCategoryScore(brandAttrs.Industry, c.Category);
    if (catScore === 0) continue;
    const ctxScore = calcContextScore(brandAttrs, c);
    const matching = Math.round((catScore * 0.5 + ctxScore * 0.5) * 10000) / 10000;
    rows.push({
      ...c,
      Rank: 0,
      category_score: Math.round(catScore * 10000) / 10000,
      context_score: Math.round(ctxScore * 10000) / 10000,
      cf_score: 0,
      matching_score: matching,
      recommendation_grade: gradeLabel(matching),
      collab_count: 0,
      past_campaigns: [],
    });
  }
  rows.sort((a, b) => b.matching_score - a.matching_score);
  return rows.slice(0, topN).map((r, i) => ({ ...r, Rank: i + 1 }));
}
