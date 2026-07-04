import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Steward — constrained-autonomy treasury agent",
  description: "An autonomous treasury agent that can't rug you — the vault holds the rules, not the AI.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
