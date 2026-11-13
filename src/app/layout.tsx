import type { Metadata } from "next";
import { Noto_Sans, Noto_Sans_Georgian } from "next/font/google";
import { AppFooter } from "@/components/AppFooter";
import { AppHeader } from "@/components/AppHeader";
import { Providers } from "@/components/Providers";
import { HtmlLang } from "@/i18n/HtmlLang";
// MathLive's math fonts and the styles for read-only formulas.
import "mathlive/fonts.css";
import "mathlive/static.css";
import "./globals.css";

// next/font downloads the font when the app is built and serves it from our
// own site, so teachers' browsers never have to contact Google.
const notoSansGeorgian = Noto_Sans_Georgian({
  subsets: ["georgian", "latin"],
  variable: "--font-georgian",
  display: "swap",
});

// Backup font for characters Noto Sans Georgian doesn't have (e.g. № or
// Russian letters). Without it each computer would pick its own font, and
// the printout/PDF would look different from machine to machine.
const notoSans = Noto_Sans({
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-fallback",
  display: "swap",
  preload: false, // only downloaded when such a character actually appears
});

// next/font gives us "'Noto Sans Georgian', 'Noto Sans Georgian Fallback'".
// That second one is Arial in disguise and claims EVERY character, so a "№"
// would be drawn in Arial before our Noto Sans backup gets a chance. We keep
// only the real font's name and build the list ourselves (see globals.css).
const georgianOnly = notoSansGeorgian.style.fontFamily.split(",")[0];

export const metadata: Metadata = {
  title: "MathTest — ტესტების შემდგენელი",
  description: "ტესტების, ქვიზებისა და საკონტროლო წერების შექმნა მათემატიკაში, ბეჭდვა და PDF.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: next-themes sets class="dark"/"light" on <html>
    // before React starts, so the server's HTML and the browser's differ there.
    <html
      lang="ka"
      suppressHydrationWarning
      className={`${notoSansGeorgian.variable} ${notoSans.variable} h-full`}
      style={{ "--font-georgian-only": georgianOnly } as React.CSSProperties}
    >
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground antialiased">
        <HtmlLang />
        <Providers>
          <AppHeader />
          <main className="flex-1">{children}</main>
          <AppFooter />
        </Providers>
      </body>
    </html>
  );
}
