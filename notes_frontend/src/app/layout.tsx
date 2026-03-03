import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Retro Notes",
  description:
    "Cross-device notes with tagging, search, and autosave (retro themed).",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <div className="app-shell">{children}</div>
      </body>
    </html>
  );
}
