import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Image Docker mince : Next produit .next/standalone avec seulement les
     dépendances d'exécution (~56 Mo au lieu de ~300 Mo avec tout
     node_modules). Le Dockerfile copie server.js + static + public. */
  output: "standalone",

  /* msedge-tts embarque `ws` et se bundle mal : on le laisse hors du bundle
     pour qu'il soit require() à l'exécution. */
  serverExternalPackages: ["msedge-tts"],

  /* Le conteneur tourne derrière Traefik (Coolify) : pas besoin de gérer TLS. */
  poweredByHeader: false,
};

export default nextConfig;
