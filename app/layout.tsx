import type { Metadata } from "next";
import { Sora, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Header } from "@/app/components/Header";

const heading = Sora({ subsets: ["latin"], variable: "--font-heading" });
const body = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "InterviewSim",
  description: "Entraîne-toi à tes entretiens avec une IA.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${heading.variable} ${body.variable}`}>
      <body>
        <Header />
        {children}
      </body>
    </html>
  );
}
