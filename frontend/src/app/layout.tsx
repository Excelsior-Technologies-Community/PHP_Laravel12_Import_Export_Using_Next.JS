import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Import / Export Studio",
  description:
    "Laravel and Next.js Import Export Management Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}