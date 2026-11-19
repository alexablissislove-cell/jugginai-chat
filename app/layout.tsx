import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JugginAI",
  description: "Chat with JugginAI, powered by Grok.",
  icons: { icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚛</text></svg>" },
};
export const viewport: Viewport = { themeColor: "#0b0c10", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-[#0b0c10] text-zinc-100 antialiased">{children}</body>
    </html>
  );
}
