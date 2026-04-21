import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const displayFont = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700", "800"],
});

const bodyFont = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600"],
});

export const metadata = {
  title: "nexxtt.io",
  description: "White-label design-services marketplace",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${displayFont.variable} ${bodyFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-off text-body" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
