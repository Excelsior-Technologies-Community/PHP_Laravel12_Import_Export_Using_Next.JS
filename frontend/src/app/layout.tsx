// Import global Tailwind & custom CSS
import "./globals.css";

// Root layout component (wraps entire app)
export default function RootLayout({
  children,
}: {
  children: React.ReactNode; // React children type
}) {
  return (
    <html lang="en">
      {/* Render all pages here */}
      <body>{children}</body>
    </html>
  );
}
