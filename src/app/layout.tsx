import type { Metadata } from "next";
import { Noto_Sans_Georgian } from "next/font/google";
import { AppHeader } from "@/components/AppHeader";
import { HtmlLang } from "@/i18n/HtmlLang";
import "./globals.css";

// next/font downloads the font when the app is built and serves it from our
// own site, so teachers' browsers never have to contact Google.
const notoSansGeorgian = Noto_Sans_Georgian({
  subsets: ["georgian", "latin"],
  variable: "--font-georgian",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MathTest — ტესტების შემდგენელი",
  description: "ტესტების, ქვიზებისა და საკონტროლო წერების შექმნა მათემატიკაში, ბეჭდვა და PDF.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ka" className={`${notoSansGeorgian.variable} h-full`}>
      <body className="flex min-h-full flex-col bg-slate-50 font-sans text-slate-900 antialiased">
        <HtmlLang />
        <AppHeader />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
