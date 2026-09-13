/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  INTERRUPTEUR DE LANCEMENT
 * ─────────────────────────────────────────────────────────────────────────────
 *  Il sépare deux usages du même site :
 *
 *  - OUVERT (true) : l'outil est accessible. C'est le cas de la branche `main`,
 *    déployée sur l'environnement de staging — on y teste toutes les
 *    fonctionnalités pour de vrai.
 *
 *  - FERMÉ (false) : la page présente le projet sans mener nulle part : pas de
 *    connexion, pas d'entraînement, et l'appel à l'action principal reste
 *    visible mais inerte. C'est le cas de la branche `production`, déployée sur
 *    l'environnement public, celui qu'on partage.
 *
 *  Cette valeur est donc la SEULE différence entre `main` et `production`.
 *  Pour publier une nouveauté : la mettre à `false` sur `production`, et à
 *  `true` sur `main`.
 */
export const OUTIL_OUVERT = true;
