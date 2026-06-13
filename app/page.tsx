'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import AboutTab from '@/components/AboutTab';

const MatchTab     = dynamic(() => import('@/components/MatchTab'),     { ssr: false });
const DashboardTab = dynamic(() => import('@/components/DashboardTab'), { ssr: false });

type Tab = 'about' | 'match' | 'dashboard';

export default function HomePage() {
  const [tab, setTab] = useState<Tab>('match');

  return (
    <>
      {/* Nav */}
      <header style={{ borderBottom: '1px solid var(--line)' }}>
        <div className="wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 36px' }}>
          <button
            onClick={() => setTab('match')}
            style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', background: 'none', border: 'none' }}
          >
            <span style={{
              width: 28, height: 28, borderRadius: 7, background: '#0f0f0e', color: '#fafaf9',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--serif)', fontSize: 18, lineHeight: '1',
            }}>V</span>
            <span style={{ fontFamily: 'var(--serif)', fontSize: 23, letterSpacing: '.2px' }}>Vouch</span>
          </button>
          <span style={{ fontSize: '0.75rem', color: '#adadA6' }}>KAIST BIZ · 2026</span>
        </div>
      </header>

      {/* Tabs */}
      <div className="tab-bar">
        {([
          ['about',     'About'],
          ['match',     '🎯 브랜드 매칭'],
          ['dashboard', '📊 성과 대시보드'],
        ] as [Tab, string][]).map(([id, label]) => (
          <button
            key={id}
            className={`tab-btn${tab === id ? ' active' : ''}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <main>
        {tab === 'about'     && <AboutTab />}
        {tab === 'match'     && <MatchTab />}
        {tab === 'dashboard' && <DashboardTab />}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--line)', padding: '1.5rem 0', textAlign: 'center' }}>
        <p style={{ color: '#bbb', fontSize: '0.78rem' }}>
          KAIST BIZ &nbsp;|&nbsp; 비즈니스 애널리틱스 2026 &nbsp;|&nbsp; CBF + CF Hybrid Recommendation System
        </p>
      </footer>
    </>
  );
}
