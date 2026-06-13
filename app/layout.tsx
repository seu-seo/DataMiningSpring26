import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Vouch — 리스크까지 측정하는 크리에이터 매칭',
  description: 'CBF + CF 하이브리드 추천 시스템으로 브랜드에 최적인 크리에이터를 찾아드립니다.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
