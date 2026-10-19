import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "mapbox-gl/dist/mapbox-gl.css";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CommunityPulse — Find your people, close to home",
  description:
    "CommunityPulse connects teens with local third spaces, community hubs, and volunteer opportunities in any congressional district or city.",
};

export const viewport: Viewport = {
  themeColor: "#061D35",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
