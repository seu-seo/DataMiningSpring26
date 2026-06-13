export interface Creator {
  Creator_ID: string;
  Channel_Name: string;
  Platform: string;
  Category: string;
  Followers: number;
  Engagement_Rate: number;
  Estimated_CPM: number;
  Risk_Score: number;
  Target_Age: string;
  Target_Gender: string;
}

export interface Brand {
  Brand_ID: string;
  Brand_Name: string;
  Industry: string;
  Monthly_Budget: number;
  Max_CPM: number;
  Target_Age: string;
  Target_Gender: string;
  Preferred_Platform: string;
}

export interface Campaign {
  Collab_ID: string;
  Brand_ID: string;
  Creator_ID: string;
  Campaign_Start: string;
  Campaign_End: string;
  Budget_Spent: number;
  Impressions: number;
  Clicks: number;
  CTR: number;
  Conversions: number;
  CVR: number;
  is_success: string;
}

export interface BrandAttrs {
  Brand_Name: string;
  Industry: string;
  Target_Age: string;
  Target_Gender: string;
  Preferred_Platform: string;
  Monthly_Budget: number;
  Max_CPM: number;
}

export interface RecommendedCreator extends Creator {
  Rank: number;
  category_score: number;
  context_score: number;
  cf_score: number;
  matching_score: number;
  recommendation_grade: string;
  collab_count: number;
  past_campaigns: {
    Brand_Name: string;
    CTR: number;
    CVR: number;
    is_success: string;
  }[];
}

export interface SimilarCase {
  Brand_Name: string;
  Creator_Name: string;
  CTR: number;
  CVR: number;
  Impressions: number;
}

export interface RecommendResponse {
  brandAttrs: BrandAttrs;
  recommendations: RecommendedCreator[];
  similarCases: SimilarCase[];
  allScores: number[];
  maxFollowers: number;
}

export interface DashboardData {
  kpis: {
    totalCollabs: number;
    successRate: number;
    avgCTR: number;
    avgCVR: number;
  };
  industrySuccessRate: { 업종: string; '성공률(%)': number }[];
  catAvgCTR: { 카테고리: string; '평균CTR(%)': number }[];
  top10Creators: { 크리에이터: string; 성공횟수: number }[];
  scatterData: { Impressions: number; CTR: number; 결과: string }[];
  allCampaigns: {
    브랜드: string;
    크리에이터: string;
    CTR: number;
    CVR: number;
    Impressions: number;
    Budget_Spent: number;
    성공: string;
  }[];
}
