export default function AboutTab() {
  return (
    <div style={{ maxWidth: 680, margin: '3rem auto 0', padding: '0 1rem 4rem' }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '2rem' }}>
        <span style={{
          width: 36, height: 36, borderRadius: 9, background: '#0f0f0e', color: '#fafaf9',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, fontWeight: 700, fontFamily: 'var(--serif)',
        }}>V</span>
        <span style={{ fontFamily: 'var(--serif)', fontSize: '1.8rem', fontWeight: 700, letterSpacing: '-0.5px' }}>Vouch</span>
      </div>

      {/* Name meaning */}
      <section style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#76766f', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '0.6rem' }}>이름의 의미</div>
        <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>&ldquo;Vouch&rdquo; — 보증하다, 책임지고 추천하다</div>
        <p style={{ fontSize: '0.92rem', color: '#3a3a38', lineHeight: 1.8 }}>
          Vouch는 <strong>보증(vouch for)</strong>에서 따온 이름입니다.
          단순히 팔로워 수가 많은 크리에이터가 아니라,
          성실함·커뮤니케이션·약속 이행·팔로워 진정성을 데이터로 검증한 뒤
          브랜드에 <strong>책임지고 추천</strong>한다는 의미를 담았습니다.
        </p>
      </section>

      {/* Background */}
      <section style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#76766f', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '0.6rem' }}>만들게 된 계기</div>
        <p style={{ fontSize: '0.92rem', color: '#3a3a38', lineHeight: 1.8 }}>
          인플루언서 마케팅 시장이 빠르게 성장하고 있지만,
          브랜드 담당자들은 여전히 <strong>크리에이터의 신뢰도를 검증할 마땅한 방법</strong>이 없었습니다.
          허위 팔로워, 잦은 마감 지연, 소통 단절 — 실제 협업 현장에서 반복되는 문제들을
          데이터로 해결하고자 이 프로젝트를 시작했습니다.
        </p>
      </section>

      {/* How it works */}
      <section style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#76766f', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '0.6rem' }}>어떻게 작동하나요</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
          {[
            ['브리프 입력', '브랜드와 캠페인을 자유롭게 설명하면 자동으로 조건을 분석합니다.'],
            ['데이터 검증', '490명의 크리에이터를 CBF + CF 하이브리드 모델로 스코어링합니다.'],
            ['리스크 분석', '성실함·커뮤니케이션·약속 이행·팔로워 진정성 4개 축으로 평가합니다.'],
            ['최적 매칭', '976건의 실제 협업 데이터를 기반으로 최적의 파트너를 추천합니다.'],
          ].map(([title, desc]) => (
            <div key={title} style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 12, padding: '1rem 1.1rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>{title}</div>
              <div style={{ fontSize: '0.8rem', color: '#76766f', lineHeight: 1.6 }}>{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Team */}
      <section style={{ borderTop: '1px solid var(--line)', paddingTop: '1.5rem' }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#76766f', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '0.6rem' }}>팀 정보</div>
        <div style={{ fontSize: '0.88rem', color: '#3a3a38', lineHeight: 1.8 }}>
          KAIST 경영대학 &nbsp;·&nbsp; Business Analytics 2026
        </div>
      </section>
    </div>
  );
}
