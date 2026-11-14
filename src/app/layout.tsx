import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Family Cookbook",
  description: "Our family's recipes, stories and original cards.",
  // The collection is private: never let search engines index any page.
  robots: { index: false, follow: false, nocache: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
