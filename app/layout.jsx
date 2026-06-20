import "./globals.css";

export const metadata = {
  title: "하루 시작",
  description: "오늘 자유시간 계산 & 취미 추천",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
