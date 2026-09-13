/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  INTERRUPTEUR DE LANCEMENT
 * ─────────────────────────────────────────────────────────────────────────────
 *  Tant que l'outil n'est pas ouvert au public, la page de présentation ne doit
 *  mener nulle part : ni connexion, ni entraînement, et l'appel à l'action
 *  principal reste visible mais inerte.
 *
 *  Le but est qu'un visiteur venu d'un partage puisse comprendre le projet sans
 *  atterrir dans une application qu'on ne veut pas encore assumer.
 *
 *  POUR OUVRIR : passer cette valeur à `true`, puis redéployer. Rien d'autre à
 *  toucher — chaque point d'entrée lit cette constante. Laisser la valeur à
 *  `false` ici et l'oublier serait la seule façon de se tromper.
 */
export const OUTIL_OUVERT = false;
