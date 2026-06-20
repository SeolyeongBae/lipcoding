import "./globals.css";

export const metadata = {
  title: "Weather Assistant",
  description: "Powered by GitHub Copilot SDK",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
