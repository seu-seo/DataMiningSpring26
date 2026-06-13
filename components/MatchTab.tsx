'use client';

import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer, Tooltip,
} from 'recharts';
import type { RecommendResponse, RecommendedCreator } from '@/lib/types';

const GRADE_COLOR  = { A: '#15803d', B: '#2433ff', C: '#9a6207', D: '#c42626' } as Record<string, string>;
const GRADE_BG     = { A: '#e4f4e7', B: 'rgba(36,51,255,.08)', C: '#fbf0d9', D: '#fbe6e4' } as Record<string, string>;
const GRADE_BORDER = { A: '#bbe3c4', B: '#c0c8ff', C: '#efd9a8', D: '#f1c2bd' } as Record<string, string>;
const GRADE_LABEL  = { A: '강력 추천', B: '추천', C: '보통', D: '참고' } as Record<string, string>;
const MEDALS       = ['🥇', '🥈', '🥉'];

const CHIPS = [
  {
    label: '헬스케어 브랜드 — 피트니스',
    text:  '저희는 3554 남녀를 타깃으로 하는 헬스케어 브랜드입니다. 영양제 신제품 출시를 앞두고 피트니스·건강 콘텐츠를 꾸준히 올리는 크리에이터를 찾고 있어요. 팔로워 진정성이 높고 신뢰도 있는 분을 우선합니다.',
  },
  {
    label: '게임 주변기기 — e스포츠',
    text:  '게임 주변기기 브랜드로, 1324 남성 유튜브 시청자에게 신제품을 알리고 싶습니다. 게이밍 리뷰·e스포츠 관련 콘텐츠를 제작하는 크리에이터와 장기 파트너십을 원합니다.',
  },
  {
    label: '패션 브랜드 — 2030 여성',
    text:  '2030 여성을 위한 패션 브랜드입니다. 의류와 스타일 코디 콘텐츠를 인스타그램 또는 유튜브에서 활발히 운영하는 분을 찾습니다. 약속 이행과 커뮤니케이션을 중시합니다.',
  },
];

function fmtFollowers(n: number) {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`;
  if (n >= 10_000) return `${(n / 10_000).toFixed(1)}만`;
  return n.toLocaleString();
}

function buildReasons(row: RecommendedCreator) {
  const pos: string[] = [], neg: string[] = [];
  if (row.category_score >= 1.0) pos.push('카테고리 일치');
  else if (row.category_score > 0) pos.push('카테고리 유사');
  else neg.push('카테고리 불일치');
  if (row.context_score >= 0.5) pos.push('오디언스 적합');
  else if (row.context_score < 0.25) neg.push('오디언스 미스매칭');
  if (row.Engagement_Rate >= 5.0) pos.push('높은 참여율');
  else if (row.Engagement_Rate < 2.0) neg.push('낮은 참여율');
  if (row.cf_score > 0) pos.push('협업 이력 반영');
  return { pos, neg };
}

function buildHistData(allScores: number[]) {
  const edges  = [0, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.01];
  const labels = ['~0.4', '0.4~0.5', '0.5~0.6', '0.6~0.7', '0.7~0.8', '0.8~0.9', '0.9~'];
  const fills  = ['#e8e8e3','#d6d6d0','#c0c8ff','#a8b0ff','#efd9a8','#bbe3c4','#15803d'];
  const counts = new Array(labels.length).fill(0) as number[];
  for (const s of allScores) {
    for (let i = 0; i < edges.length - 1; i++) {
      if (s >= edges[i] && s < edges[i + 1]) { counts[i]++; break; }
    }
  }
  return labels.map((label, i) => ({ label, count: counts[i], fill: fills[i] }));
}

function ScoreBar({ row }: { row: RecommendedCreator }) {
  const data = [
    { name: '카테고리(CBF)', value: row.category_score, fill: '#2433ff' },
    { name: '조건매칭(CBF)', value: row.context_score,  fill: '#15803d' },
    { name: '협업필터링(CF)', value: row.cf_score,       fill: '#9a6207' },
  ];
  return (
    <ResponsiveContainer width="100%" height={130}>
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 48, top: 8, bottom: 0 }}>
        <XAxis type="number" domain={[0, 1.1]} hide />
        <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: '#76766f' }} />
        <Tooltip formatter={(v: number) => v.toFixed(2)} />
        <Bar dataKey="value" radius={3} barSize={12} label={{ position: 'right', fontSize: 11 }}>
          {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function CreatorCard({ row, maxFollowers, expanded, onToggle }: {
  row: RecommendedCreator;
  maxFollowers: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const grade   = row.recommendation_grade as 'A' | 'B' | 'C' | 'D';
  const color   = GRADE_COLOR[grade];
  const bg      = GRADE_BG[grade];
  const border  = GRADE_BORDER[grade];
  const medal   = MEDALS[row.Rank - 1] ?? '';
  const { pos, neg } = buildReasons(row);
  const followPct = Math.min(Math.round((row.Followers / maxFollowers) * 100), 100);
  const scorePct  = Math.round(row.matching_score * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="creator-card" style={{ borderColor: border }}>
        {/* header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#76766f' }}>
            {row.Rank}위{medal && ` ${medal}`}
          </span>
          <span style={{
            background: bg, color, border: `1px solid ${border}`,
            borderRadius: 999, padding: '0.2rem 0.7rem', fontSize: '0.72rem', fontWeight: 600,
          }}>
            {GRADE_LABEL[grade]}
          </span>
        </div>

        <div style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.2rem', letterSpacing: '-0.3px' }}>
          {row.Channel_Name}
        </div>
        <div style={{ fontSize: '0.8rem', color: '#76766f', marginBottom: '1rem' }}>
          {row.Platform} · {row.Category}
        </div>

        {/* matching score bar */}
        <div style={{ marginBottom: '0.9rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#76766f', marginBottom: '0.35rem' }}>
            <span>매칭 점수</span>
            <span style={{ fontWeight: 700, color }}>{row.matching_score.toFixed(2)}</span>
          </div>
          <div style={{ background: '#e8e8e3', borderRadius: 999, height: 4 }}>
            <div style={{ background: color, height: 4, borderRadius: 999, width: `${scorePct}%` }} />
          </div>
        </div>

        {/* followers bar */}
        <div style={{ marginBottom: '0.9rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#76766f', marginBottom: '0.35rem' }}>
            <span>구독자</span>
            <span style={{ fontWeight: 600, color: '#0f0f0e' }}>{fmtFollowers(row.Followers)}</span>
          </div>
          <div style={{ background: '#e8e8e3', borderRadius: 999, height: 3 }}>
            <div style={{ background: '#adadA6', height: 3, borderRadius: 999, width: `${followPct}%` }} />
          </div>
        </div>

        {/* mini stats */}
        <div className="stat-mini">
          <div className="stat-mini-cell">
            <div className="stat-mini-label">참여율</div>
            <div className="stat-mini-val">{row.Engagement_Rate}%</div>
          </div>
          <div className="stat-mini-cell">
            <div className="stat-mini-label">협업</div>
            <div className="stat-mini-val">{row.collab_count}회</div>
          </div>
          <div className="stat-mini-cell">
            <div className="stat-mini-label">Risk</div>
            <div className="stat-mini-val">{row.Risk_Score}</div>
          </div>
        </div>

        {/* reason tags */}
        <div style={{ marginBottom: '0.8rem' }}>
          {pos.map(r => (
            <span key={r} className="reason-tag" style={{ background: 'var(--safe-bg)', color: 'var(--safe)', borderColor: 'var(--safe-line)' }}>✔ {r}</span>
          ))}
          {neg.map(r => (
            <span key={r} className="reason-tag" style={{ background: 'var(--risk-bg)', color: 'var(--risk)', borderColor: 'var(--risk-line)' }}>✖ {r}</span>
          ))}
        </div>

        {/* toggle detail */}
        <button
          onClick={onToggle}
          style={{ fontSize: '0.78rem', color: 'var(--muted)', padding: '0.3rem 0', width: '100%', textAlign: 'left', borderTop: '1px solid var(--line)', paddingTop: '0.6rem', marginTop: 'auto' }}
        >
          {expanded ? '▲ 상세 접기' : '▼ 상세 분석 보기'}
        </button>
      </div>

      {expanded && (
        <div style={{ border: '1px solid var(--line)', borderTop: 'none', borderRadius: '0 0 var(--r-lg) var(--r-lg)', padding: '1rem', background: 'var(--surface)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)', marginBottom: '0.5rem' }}>점수 분해</div>
          <ScoreBar row={row} />
          {row.past_campaigns.length > 0 && (
            <>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)', marginTop: '0.8rem', marginBottom: '0.4rem' }}>과거 협업 성과</div>
              <table className="data-table">
                <thead><tr><th>브랜드</th><th>CTR</th><th>CVR</th><th>성공</th></tr></thead>
                <tbody>
                  {row.past_campaigns.map((p, i) => (
                    <tr key={i}>
                      <td>{p.Brand_Name}</td>
                      <td>{p.CTR}%</td>
                      <td>{p.CVR}%</td>
                      <td>{p.is_success === 'Y' ? '✅' : '❌'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function MatchTab() {
  const [text, setText]             = useState('');
  const [riskThreshold, setRisk]    = useState(2.5);
  const [topN, setTopN]             = useState(3);
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState<RecommendResponse | null>(null);
  const [error, setError]           = useState('');
  const [expanded, setExpanded]     = useState<Record<string, boolean>>({});
  const [activeCategory, setActiveCat] = useState('전체');

  const handleChip = (chipText: string) => { setText(chipText); setResult(null); };

  const handleSubmit = async () => {
    if (!text.trim()) { setError('브랜드 소개를 입력해 주세요.'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, riskThreshold, topN }),
      });
      if (!res.ok) throw new Error('추천 요청 실패');
      const data = (await res.json()) as RecommendResponse;
      setResult(data);
      setActiveCat('전체');
      setExpanded({});
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const filteredRecs = result
    ? activeCategory === '전체'
      ? result.recommendations
      : result.recommendations.filter(r => r.Category === activeCategory)
    : [];

  const categories = result
    ? ['전체', ...Array.from(new Set(result.recommendations.map(r => r.Category)))]
    : [];

  const histData = result ? buildHistData(result.allScores) : [];

  const gradeRanges: [string, number, number][] = [['A', 0.9, 1.1], ['B', 0.8, 0.9], ['C', 0.7, 0.8], ['D', 0.0, 0.7]];

  return (
    <div className="wrap" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '2.5rem 0 0', maxWidth: 720, margin: '0 auto' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#76766f', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '1rem' }}>
          리스크까지 측정하는 크리에이터 매칭
        </div>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(2rem, 5vw, 2.8rem)', lineHeight: 1.1, letterSpacing: '-1px', marginBottom: '0.8rem' }}>
          어떤 크리에이터를<br />찾고 계신가요?
        </h1>
        <p style={{ fontSize: '1rem', color: '#76766f', lineHeight: 1.75, marginBottom: '2rem' }}>
          브랜드와 캠페인을 자유롭게 설명해 주세요.<br />
          Vouch가 성실함부터 팔로워 진정성까지 검증해 추천합니다.
        </p>
      </div>

      {/* Search card */}
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div className="search-card">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="예) 저희는 2030 여성을 타깃으로 하는 비건 스킨케어 브랜드입니다. 신제품 세럼 런칭을 위해 진정성 있고 꾸준히 활동하는 뷰티 크리에이터를 찾고 있어요..."
            onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleSubmit(); }}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 14px 14px', borderTop: '1px solid var(--line)', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'block', marginBottom: 2 }}>최소 Risk Score</label>
                <select className="field-select" style={{ width: 140 }} value={riskThreshold} onChange={e => setRisk(Number(e.target.value))}>
                  {[1.0,1.5,2.0,2.5,3.0,3.5,4.0,4.5,5.0].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'block', marginBottom: 2 }}>추천 인원</label>
                <select className="field-select" style={{ width: 100 }} value={topN} onChange={e => setTopN(Number(e.target.value))}>
                  {[1,2,3,4,5,6,7,8,9,10].map(v => <option key={v} value={v}>{v}명</option>)}
                </select>
              </div>
            </div>
            <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
              {loading ? '분석 중...' : '크리에이터 추천받기 →'}
            </button>
          </div>
        </div>

        {/* Chips */}
        <div style={{ display: 'flex', gap: 8, marginTop: '1rem', flexWrap: 'wrap' }}>
          {CHIPS.map(c => (
            <button key={c.label} className="btn-chip" onClick={() => handleChip(c.text)}>{c.label}</button>
          ))}
        </div>

        {error && (
          <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'var(--risk-bg)', border: '1px solid var(--risk-line)', borderRadius: 'var(--r)', color: 'var(--risk)', fontSize: '0.88rem' }}>
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <div style={{ marginTop: '2rem' }}>
          {/* Brief analysis card */}
          <div style={{ maxWidth: 720, margin: '0 auto 1.5rem', background: '#fafaf9', border: '1px solid #e8e8e3', borderRadius: 12, padding: '1rem 1.2rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#76766f', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>브리프 분석 결과</div>
            <div style={{ fontSize: '0.88rem', color: '#3a3a38', marginBottom: '0.7rem', lineHeight: 1.6 }}>
              &ldquo;{text.slice(0, 80)}{text.length > 80 ? '...' : ''}&rdquo;
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              {[
                ['업종 ' + result.brandAttrs.Industry, 'var(--safe)', 'var(--safe-bg)', 'var(--safe-line)'],
                ['타깃 ' + result.brandAttrs.Target_Age + ' / ' + result.brandAttrs.Target_Gender, '#3a3a38', '#fafaf9', '#e8e8e3'],
                ['플랫폼 ' + result.brandAttrs.Preferred_Platform, '#3a3a38', '#fafaf9', '#e8e8e3'],
                ['Max CPM ' + result.brandAttrs.Max_CPM.toLocaleString() + '원', '#3a3a38', '#fafaf9', '#e8e8e3'],
              ].map(([label, color, bg, border]) => (
                <span key={label as string} style={{ fontSize: '0.75rem', fontWeight: 600, color: color as string, background: bg as string, border: `1px solid ${border as string}`, borderRadius: 999, padding: '3px 10px' }}>
                  {label}
                </span>
              ))}
            </div>
            <div style={{ paddingTop: '0.6rem', borderTop: '1px solid #e8e8e3', fontSize: '0.75rem', color: '#76766f', lineHeight: 1.7 }}>
              <span style={{ fontWeight: 600, color: '#3a3a38' }}>참고 — 매칭 등급 기준</span>&nbsp;&nbsp;
              매칭 점수 = 카테고리(CBF) × 0.5 + 조건 매칭(CBF) × 0.5&nbsp;&nbsp;|&nbsp;&nbsp;
              <span style={{ color: 'var(--safe)', fontWeight: 600 }}>A 0.9+</span>{' '}
              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>B 0.8~</span>{' '}
              <span style={{ color: 'var(--warn)', fontWeight: 600 }}>C 0.7~</span>{' '}
              <span style={{ color: 'var(--risk)', fontWeight: 600 }}>D -</span>
            </div>
          </div>

          {/* Category tabs */}
          <div className="section-title">추천 결과</div>
          {result.recommendations.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', border: '1px dashed var(--line)', borderRadius: 'var(--r-lg)' }}>
              조건을 만족하는 크리에이터가 없습니다. Risk Score 기준을 낮춰보세요.
            </div>
          ) : (
            <>
              {categories.length > 2 && (
                <div style={{ display: 'flex', gap: 6, marginBottom: '1rem', flexWrap: 'wrap' }}>
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setActiveCat(cat)}
                      style={{
                        padding: '0.3rem 0.8rem', borderRadius: 999,
                        border: `1px solid ${activeCategory === cat ? 'var(--ink)' : 'var(--line)'}`,
                        background: activeCategory === cat ? 'var(--ink)' : 'transparent',
                        color: activeCategory === cat ? '#fafaf9' : 'var(--ink-s)',
                        fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}

              <div className="grid-3">
                {filteredRecs.map(row => (
                  <CreatorCard
                    key={row.Creator_ID}
                    row={row}
                    maxFollowers={result.maxFollowers}
                    expanded={!!expanded[row.Creator_ID]}
                    onToggle={() => toggleExpanded(row.Creator_ID)}
                  />
                ))}
              </div>
            </>
          )}

          {/* Score distribution */}
          <div className="section-title">매칭 점수 분포</div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r)', padding: '1rem' }}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={histData} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#76766f' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#76766f' }} />
                  <Tooltip />
                  <Bar dataKey="count" radius={4} barSize={28} label={{ position: 'top', fontSize: 11 }}>
                    {histData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div>
              <div style={{ fontWeight: 600, marginBottom: '0.6rem', fontSize: '0.88rem' }}>등급별 현황</div>
              {gradeRanges.map(([g, lo, hi]) => {
                const cnt = result.allScores.filter(s => s >= lo && s < hi).length;
                const pct = result.allScores.length > 0 ? Math.round((cnt / result.allScores.length) * 100) : 0;
                return (
                  <div key={g} style={{ marginBottom: '0.6rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.2rem' }}>
                      <span style={{ color: GRADE_COLOR[g], fontWeight: 700 }}>등급 {g}</span>
                      <span style={{ color: '#555' }}>{cnt}명 ({pct}%)</span>
                    </div>
                    <div style={{ background: '#f0f0f0', borderRadius: 4, height: 5 }}>
                      <div style={{ background: GRADE_COLOR[g], height: 5, borderRadius: 4, width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Similar cases */}
          <div className="section-title">유사 협업 사례</div>
          {result.similarCases.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', border: '1px dashed var(--line)', borderRadius: 'var(--r-lg)' }}>
              <div style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>🔍</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.3rem' }}>유사 사례를 찾지 못했어요</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                {result.brandAttrs.Industry} 업종의 성공 협업 데이터가 아직 충분하지 않습니다.
              </div>
            </div>
          ) : (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>기업</th><th>크리에이터</th><th style={{ textAlign: 'right' }}>노출</th>
                    <th style={{ textAlign: 'right' }}>CTR</th><th style={{ textAlign: 'right' }}>CVR</th>
                  </tr>
                </thead>
                <tbody>
                  {result.similarCases.map((c, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600, color: '#1a3a5c' }}>✅ {c.Brand_Name}</td>
                      <td>{c.Creator_Name}</td>
                      <td style={{ textAlign: 'right' }}>{c.Impressions.toLocaleString()}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#2d6a9f' }}>{c.CTR}%</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#1a7a4a' }}>{c.CVR}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
