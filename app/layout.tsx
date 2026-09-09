import type { Metadata } from "next";
import { Inter, Overpass } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const overpass = Overpass({
  subsets: ["latin"],
  variable: "--font-overpass",
  display: "swap",
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Searah — Temukan Tempat Makan di Sepanjang Rute",
  description:
    "Aplikasi pencarian tempat makan berbasis rute perjalanan. Masukkan lokasi awal dan tujuan, temukan restoran dan kafe terbaik tanpa keluar jauh dari rute Anda.",
  keywords: [
    "searah",
    "tempat makan",
    "restoran",
    "kafe",
    "rute perjalanan",
    "food finder",
    "route based",
  ],
  openGraph: {
    title: "Searah — Temukan Tempat Makan di Sepanjang Rute",
    description:
      "Cari restoran dan kafe terbaik di sepanjang rute perjalanan Anda tanpa keluar jauh dari jalur.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${inter.variable} ${overpass.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}

