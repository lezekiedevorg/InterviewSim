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
 *  Cette valeur est la SEULE différence entre `main` et `production`.
 *  Pour publier une nouveauté : fusionner `main` dans `production`, puis laisser
 *  cette valeur à `false` ici — c'est le point d'entrée qu'on referme.
 */
export const OUTIL_OUVERT = false;
