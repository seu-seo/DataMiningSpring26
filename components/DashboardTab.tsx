'use client';

import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer, Tooltip, ScatterChart, Scatter, Legend,
} from 'recharts';
import type { DashboardData } from '@/lib/types';

const IND_COLOR = (opacity: number) => `rgba(60,140,100,${opacity.toFixed(2)})`;
const CTR_COLOR = (opacity: number) => `rgba(80,130,180,${opacity.toFixed(2)})`;

function KpiCard({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="kpi-card">
      <div className="kpi-value" style={{ color }}>{value}</div>
      <div className="kpi-label">{label}</div>
    </div>
  );
}

export default function DashboardTab() {
  const [data, setData]     = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(0);
  const PAGE_SIZE = 20;

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then((d: DashboardData) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="wrap" style={{ paddingTop: '3rem', textAlign: 'center', color: 'var(--muted)' }}>
        대시보드 데이터를 불러오는 중...
      </div>
    );
  }
  if (!data) {
    return (
      <div className="wrap" style={{ paddingTop: '3rem', textAlign: 'center', color: 'var(--risk)' }}>
        데이터 로드 실패
      </div>
    );
  }

  const { kpis, industrySuccessRate, catAvgCTR, top10Creators, scatterData, allCampaigns } = data;
  const nInd = industrySuccessRate.length;
  const nCTR = catAvgCTR.length;
  const nTop = top10Creators.length;

  const indData  = industrySuccessRate.map((d, i) => ({ ...d, fill: IND_COLOR(0.35 + 0.55 * i / Math.max(nInd - 1, 1)) }));
  const ctrData  = catAvgCTR.map((d, i) => ({ ...d, fill: CTR_COLOR(0.35 + 0.55 * i / Math.max(nCTR - 1, 1)) }));
  const topData  = top10Creators.map((d, i) => ({ ...d, fill: `rgba(26,122,74,${0.4 + 0.55 * i / Math.max(nTop - 1, 1)})` }));

  const successScatter = scatterData.filter(d => d.결과 === '성공');
  const failScatter    = scatterData.filter(d => d.결과 === '실패');

  const pageData   = allCampaigns.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(allCampaigns.length / PAGE_SIZE);

  return (
    <div className="wrap" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
      <div className="section-title">캠페인 성과 대시보드</div>

      {/* KPIs */}
      <div className="grid-4" style={{ marginBottom: '2rem' }}>
        <KpiCard value={kpis.totalCollabs.toLocaleString() + '건'} label="총 협업 수"  color="#0f0f0e" />
        <KpiCard value={kpis.successRate.toFixed(1) + '%'}          label="성공률"      color="#15803d" />
        <KpiCard value={kpis.avgCTR.toFixed(2) + '%'}               label="평균 CTR"   color="#2433ff" />
        <KpiCard value={kpis.avgCVR.toFixed(2) + '%'}               label="평균 CVR"   color="#9a6207" />
      </div>

      {/* Bar charts row */}
      <div className="grid-2" style={{ marginBottom: '2rem' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r)', padding: '1rem' }}>
          <div style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.88rem' }}>업종별 성공률</div>
          <ResponsiveContainer width="100%" height={Math.max(200, nInd * 36 + 60)}>
            <BarChart data={indData} layout="vertical" margin={{ left: 0, right: 50, top: 4, bottom: 0 }}>
              <XAxis type="number" domain={[0, 100]} hide />
              <YAxis type="category" dataKey="업종" width={72} tick={{ fontSize: 11, fill: '#76766f' }} />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Bar dataKey="성공률(%)" radius={3} barSize={14} label={{ position: 'right', fontSize: 11, formatter: (v: number) => `${v}%` }}>
                {indData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r)', padding: '1rem' }}>
          <div style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.88rem' }}>카테고리별 평균 CTR</div>
          <ResponsiveContainer width="100%" height={Math.max(200, nCTR * 36 + 60)}>
            <BarChart data={ctrData} layout="vertical" margin={{ left: 0, right: 50, top: 4, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="카테고리" width={72} tick={{ fontSize: 11, fill: '#76766f' }} />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Bar dataKey="평균CTR(%)" radius={3} barSize={14} label={{ position: 'right', fontSize: 11, formatter: (v: number) => `${v}%` }}>
                {ctrData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <hr style={{ borderColor: 'var(--line)', margin: '0 0 2rem' }} />

      {/* Top creators + scatter */}
      <div className="grid-2" style={{ marginBottom: '2rem' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r)', padding: '1rem' }}>
          <div style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.88rem' }}>성공 협업 Top 10 크리에이터</div>
          <ResponsiveContainer width="100%" height={Math.max(200, nTop * 36 + 60)}>
            <BarChart data={topData} layout="vertical" margin={{ left: 0, right: 40, top: 4, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="크리에이터" width={90} tick={{ fontSize: 11, fill: '#76766f' }} />
              <Tooltip />
              <Bar dataKey="성공횟수" radius={3} barSize={14} label={{ position: 'right', fontSize: 11 }}>
                {topData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r)', padding: '1rem' }}>
          <div style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.88rem' }}>노출수 vs CTR (성공/실패)</div>
          <ResponsiveContainer width="100%" height={320}>
            <ScatterChart margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
              <XAxis dataKey="Impressions" name="노출수" tick={{ fontSize: 10 }} />
              <YAxis dataKey="CTR" name="CTR (%)" tick={{ fontSize: 10 }} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Legend />
              <Scatter name="성공" data={successScatter} fill="#1a7a4a" opacity={0.65} />
              <Scatter name="실패" data={failScatter}    fill="#c0392b" opacity={0.65} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      <hr style={{ borderColor: 'var(--line)', margin: '0 0 2rem' }} />

      {/* Full data table */}
      <div style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.88rem' }}>전체 협업 데이터</div>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>브랜드</th><th>크리에이터</th>
                <th style={{ textAlign: 'right' }}>CTR</th>
                <th style={{ textAlign: 'right' }}>CVR</th>
                <th style={{ textAlign: 'right' }}>노출</th>
                <th style={{ textAlign: 'right' }}>예산</th>
                <th style={{ textAlign: 'center' }}>성공</th>
              </tr>
            </thead>
            <tbody>
              {pageData.map((row, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500 }}>{row.브랜드}</td>
                  <td>{row.크리에이터}</td>
                  <td style={{ textAlign: 'right' }}>{row.CTR}%</td>
                  <td style={{ textAlign: 'right' }}>{row.CVR}%</td>
                  <td style={{ textAlign: 'right' }}>{row.Impressions.toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }}>{row.Budget_Spent.toLocaleString()}원</td>
                  <td style={{ textAlign: 'center' }}>{row.성공 === 'Y' ? '✅' : '❌'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderTop: '1px solid var(--line)', fontSize: '0.82rem', color: 'var(--muted)' }}>
          <span>{allCampaigns.length.toLocaleString()}건 중 {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, allCampaigns.length)}건</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn-chip" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={{ padding: '0.2rem 0.7rem', opacity: page === 0 ? 0.4 : 1 }}>이전</button>
            <button className="btn-chip" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} style={{ padding: '0.2rem 0.7rem', opacity: page >= totalPages - 1 ? 0.4 : 1 }}>다음</button>
          </div>
        </div>
      </div>
    </div>
  );
}
