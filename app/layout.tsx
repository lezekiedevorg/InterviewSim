import type { Metadata } from "next";
import { Fraunces, Instrument_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/app/components/Header";

/* Biface : serif à axes pour les titres, sans humaniste pour le texte.
   Le monospace est réservé aux chiffres (scores, durées), jamais aux libellés. */
const heading = Fraunces({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});
const body = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Say It Aloud — Le jour J, vous l'aurez déjà répété",
  description:
    "Entraînez-vous à vos entretiens avec un recruteur virtuel : il pose les questions de votre poste à partir de votre CV, écoute vos réponses et vous rend une note avec un débrief franc.",
};

/* Posé avant la première peinture, sinon on voit un flash crème avant le brun.
   Volontairement en ligne et minimal : il ne doit rien bloquer. */
const themeScript = `(function(){try{var s=localStorage.getItem("isim-theme");var d=window.matchMedia("(prefers-color-scheme: dark)").matches;if((s||(d?"dark":"light"))==="dark"){document.documentElement.classList.add("dark")}}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="fr"
      /* Next 16 n'écrase plus `scroll-behavior` pendant les navigations.
         Cet attribut rétablit l'ancien comportement : instantané au changement
         de page, fluide à l'intérieur d'une page. */
      data-scroll-behavior="smooth"
      /* Le script ci-dessous modifie <html> avant l'hydratation : sans ça,
         React signale une divergence d'attribut. */
      suppressHydrationWarning
      className={`${heading.variable} ${body.variable} ${mono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="grain">
        <Header />
        {children}
      </body>
    </html>
  );
}
