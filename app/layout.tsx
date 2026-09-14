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

/* Sans metadataBase, Next résout og:image sur http://localhost:3000 — l'URL
   part telle quelle dans le HTML de production et aucun réseau social ne peut
   charger l'image. On prend l'URL publique fournie par Coolify quand elle
   existe, sinon le domaine de production. */
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.COOLIFY_URL ? process.env.COOLIFY_URL.split(",")[0] : null) ??
  "https://sayitaloud.production.app-lezekie.dev";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Say It Aloud — Le jour J, vous l'aurez déjà répété",
  description:
    "Entraînez-vous à vos entretiens avec un recruteur virtuel : il pose les questions de votre poste à partir de votre CV, écoute vos réponses et vous rend une note avec un débrief franc.",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Say It Aloud",
    url: siteUrl,
  },
  twitter: { card: "summary_large_image" },
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
