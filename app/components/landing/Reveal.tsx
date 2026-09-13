"use client";

/**
 * Révélation au défilement.
 *
 * Pourquoi un composant client séparé plutôt qu'un `useEffect` dans la page :
 * la page reste un composant serveur, donc tout son HTML est rendu côté
 * serveur et arrive déjà lisible. On ne paie le JavaScript que pour
 * l'observation — pas pour le contenu.
 *
 * Sans `IntersectionObserver`, on affiche tout immédiatement : une page
 * invisible serait pire qu'une page sans animation.
 */

import { useEffect } from "react";

export function Reveal() {
  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>(".rv");

    const display = (el: HTMLElement) => {
      el.classList.add("seen");
      // Barres de critères : la largeur est posée ici, pas dans le HTML, pour
      // que la transition ait un point de départ à zéro.
      el.querySelectorAll<HTMLElement>("[data-bar]").forEach((bar) => {
        bar.style.width = `${bar.dataset.bar}%`;
      });
      // Colonnes du graphique : on les décale légèrement pour que ça respire.
      el.querySelectorAll<HTMLElement>("[data-col]").forEach((col, i) => {
        window.setTimeout(() => {
          col.style.height = `${col.dataset.col}%`;
        }, i * 70);
      });
    };

    if (!("IntersectionObserver" in window)) {
      elements.forEach(display);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          display(entry.target as HTMLElement);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.18, rootMargin: "0px 0px -40px 0px" }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return null;
}
