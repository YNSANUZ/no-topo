import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "No Topo — Arena ao vivo",
  description: "Uma arena pública onde o maior lance assume o telão.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
