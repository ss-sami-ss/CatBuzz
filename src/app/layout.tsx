import type { Metadata, Viewport } from "next";
import { AppProviders } from "@/components/layout/app-providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "CatBuzz",
    template: "%s | CatBuzz",
  },
  description: "شبکهٔ همکاری برای مراقبت از گربه‌های خیابانی",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
