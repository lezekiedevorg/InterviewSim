import type { CSSProperties } from "react";

/**
 * Marque Say It Aloud — « Speech Loop ».
 *
 * Trois idées dans une silhouette :
 * - la boucle ouverte forme une bulle de parole ;
 * - la pointe pleine, tangente à l'arc, rend la répétition immédiate ;
 * - les trois barres centrales sont la voix, pas un micro.
 *
 * GÉOMÉTRIE — ne pas retoucher les chemins à la main.
 * Cercle centré (32, 30), rayon 20. L'arc va de 250° à 60° en passant par la
 * gauche et le haut (large-arc=1, sweep=1), ce qui ferme la bulle autour de
 * l'onde. La pointe est posée à l'extrémité de l'arc : sa base est centrée sur
 * le point final et orientée selon la TANGENTE (sin θ, cos θ), donc elle
 * prolonge le trait au lieu de le couper.
 *
 * Trois erreurs ont été corrigées avant d'arriver ici, chacune rendait la
 * boucle illisible :
 *
 * 1. Flèche en deux segments fins : elle se noyait dans le contour, l'œil
 *    lisait une bulle et jamais une rotation.
 * 2. Pointe pleine mais SOUDÉE au trait : lue comme un épaississement.
 * 3. Pointe détachée « flottante », puis pointe orientée vers l'INTÉRIEUR
 *    (signe de tangente inversé) : elle rentrait dans la bulle.
 *
 * La règle qui marche : base du triangle centrée sur la fin de l'arc, axe
 * aligné sur la tangente, pointe vers l'extérieur.
 */

/** Longueur de l'arc : 2πR × (190/360) avec R=20. Sert au tracé animé. */
const ARC_LENGTH = 66.32;

export function SpeechLoopMark({
  size = 32,
  className = "",
  title,
  style,
  animate = false,
}: {
  size?: number;
  className?: string;
  title?: string;
  style?: CSSProperties;
  /** Rejoue le tracé de la boucle : « on recommence ». Voir loop-replay. */
  animate?: boolean;
}) {
  const labelled = Boolean(title);
  // Le trait s'épaissit quand l'icône rétrécit : sans cela, l'onde et la
  // boucle se referment visuellement en dessous de 24 px.
  const stroke = size <= 18 ? 8 : size <= 32 ? 7 : 6.5;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      style={style}
      role={labelled ? "img" : undefined}
      aria-label={title}
      aria-hidden={labelled ? undefined : true}
    >
      {/* Boucle-bulle */}
      <path
        d="M25.2 48.8A20 20 0 1 1 42.0 12.7"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        className={animate ? "loop-replay" : undefined}
        style={
          animate
            ? ({
                strokeDasharray: ARC_LENGTH,
                strokeDashoffset: 0,
              } as CSSProperties)
            : undefined
        }
      />
      {/* Queue de la bulle, courte et anguleuse */}
      <path
        d="M25.2 48.8L17.5 52.5L26 49"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Pointe pleine, tangente à l'arc */}
      <path d="M37.8 20.0L52.8 18.9L46.2 5.3Z" fill="currentColor" />
      {/* Onde vocale : trois hauteurs */}
      <path
        d="M24 26v6M32 20v18M40 25v8"
        stroke="currentColor"
        strokeWidth={stroke - 1}
        strokeLinecap="round"
        className={animate ? "loop-voice" : undefined}
      />
    </svg>
  );
}

/** Wordmark officiel. Le nom et le symbole peuvent vivre séparément. */
export function SayItAloudLogo({
  compact = false,
  animate = false,
}: {
  compact?: boolean;
  animate?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <SpeechLoopMark size={32} animate={animate} className="shrink-0 text-amber-400" />
      {!compact && (
        <span className="font-heading text-lg font-semibold tracking-[-0.025em] text-cream">
          Say It <span className="text-amber-400">Aloud</span>
        </span>
      )}
    </span>
  );
}
