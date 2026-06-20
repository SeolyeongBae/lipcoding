import "./globals.css";

export const metadata = {
  title: "myroutine",
  description: "오늘 루틴에 맞는 유튜브 영상을 AI가 추천하는 생산성 앱",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
