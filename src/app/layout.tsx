import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Instinct Dashboard",
  description:
    "A private dashboard for tasks, fixed commitments, and recurring tasks.",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body>{children}</body>
    </html>
  );
}
