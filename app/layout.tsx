import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: "KeyPulse - API Key 批量验证工具",
  description: "批量验证和管理您的 API Keys",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={jetbrainsMono.variable}>
      <body className="font-mono antialiased">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
