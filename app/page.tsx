import Link from "next/link";
import type { Metadata } from "next";
import { InterviewDemo } from "@/app/components/landing/InterviewDemo";
import { Reveal } from "@/app/components/landing/Reveal";

export const metadata: Metadata = {
  title: "InterviewSim — Le jour J, vous l'aurez déjà répété",
  description:
    "Un recruteur virtuel vous pose les questions de votre poste à partir de votre CV, écoute vos réponses et vous rend une note avec un débrief franc. Recommencez autant de fois qu'il vous faut.",
};

/* ───────────────────────────────────────────────────────────────────────────
   LANDING — surface « Decide/Learn ». Le hero est donc légitime ici, et une
   idée doit atterrir par section.

   Rien d'inventé : les engagements du bandeau sont vérifiables dans le code
   (aucun paiement n'existe, le CV n'est pas publié, /reset existe). Aucun
   chiffre d'usage, aucun témoignage, aucun tarif — je ne les connais pas.
   ─────────────────────────────────────────────────────────────────────────── */

const Check = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-ok" aria-hidden="true">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

const Arrow = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
    <path d="M5 12h13M13 6l6 6-6 6" />
  </svg>
);

const steps = [
  {
    title: "Décrivez le poste",
    body: (
      <>
        Intitulé, domaine, niveau, langue. Collez votre CV pour que les questions portent sur{" "}
        <em>votre</em>{" "}parcours — ou partez d&apos;un scénario prêt à l&apos;emploi.
      </>
    ),
  },
  {
    title: "Passez l'entretien",
    body: (
      <>
        Le recruteur vous pose une question, vous répondez à l&apos;écrit ou à voix haute.
        Il rebondit sur ce que vous venez de dire. Le mode jury ajoute deux interlocuteurs.
      </>
    ),
  },
  {
    title: "Lisez le débrief",
    body: (
      <>
        Une note par critère, les passages qui ont convaincu, ceux qui ont coincé, et ce qu&apos;il
        faut retravailler avant le prochain essai.
      </>
    ),
  },
];

const criteria = [
  { label: "Structure", value: 82 },
  { label: "Fond technique", value: 74 },
  { label: "Exemples", value: 88 },
  { label: "Clarté", value: 63 },
  { label: "Posture", value: 79 },
];

const supporting = [
  {
    title: "Mode jury",
    body: "Trois interlocuteurs au lieu d'un. Les questions se croisent, les relances arrivent de partout — comme dans un vrai panel.",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
        <path d="M17 11.5a3 3 0 1 0-1.6-5.6M18 20c0-2.2-.8-4.2-2-5.7" />
      </svg>
    ),
  },
  {
    title: "À voix haute",
    body: "Le recruteur vous lit la question, vous répondez à l'oral. Vous travaillez le débit et le silence, pas seulement les mots.",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <rect x="9" y="2" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v4" />
      </svg>
    ),
  },
  {
    title: "Carte de score",
    body: "Un résultat partageable pour en discuter avec un mentor — sans dévoiler le contenu de vos réponses.",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M4 19V5m0 14h16M8 15V9m4 6V7m4 8v-4" />
      </svg>
    ),
  },
];

const themes = [
  { name: "Présentation de soi", level: "maîtrisé", done: true },
  { name: "Expérience technique", level: "3 / 5" },
  { name: "Mise en situation", level: "1 / 5" },
  { name: "Prétentions salariales", level: "2 / 4" },
  { name: "Questions pièges", level: "1 / 4" },
  { name: "Motivation du poste", level: "maîtrisé", done: true },
  { name: "Trou dans le CV", level: "0 / 3" },
];

const bars = [38, 46, 44, 58, 62, 71, 78];

const faq = [
  {
    q: "Est-ce que ça remplace un vrai entretien ?",
    a: "Non, et ce n'est pas le but. Un entretien ne se rejoue pas ; celui-ci, si. L'idée est d'arriver le jour J en ayant déjà dit vos réponses à voix haute, une dizaine de fois, et d'avoir entendu ce qui ne tenait pas debout.",
  },
  {
    q: "Que faites-vous de mon CV ?",
    a: "Il sert uniquement à donner du contexte au recruteur virtuel, pour qu'il vous interroge sur votre parcours réel plutôt que sur des questions génériques. Vous pouvez effacer votre historique et vos données depuis la page de réinitialisation.",
  },
  {
    q: "Puis-je m'entraîner dans une autre langue ?",
    a: "Oui. La langue de l'entretien se choisit à l'étape de préparation, indépendamment de la langue de l'interface.",
  },
  {
    q: "Faut-il un micro ?",
    a: "Non. Vous pouvez répondre en écrivant. Le mode vocal est là pour ceux qui veulent travailler l'oral — c'est souvent là que se joue la différence, mais ce n'est pas obligatoire.",
  },
  {
    q: "Mes réponses sont-elles partagées ?",
    a: "Non. La carte de score que vous pouvez partager ne contient qu'un résultat chiffré, jamais le contenu de ce que vous avez dit.",
  },
];

export default function LandingPage() {
  return (
    <main className="relative z-10">
      <Reveal />

      {/* ═══ HERO — asymétrique : le propos à gauche, le produit à droite ═══ */}
      <section className="px-6 pb-20 pt-16 sm:pt-20">
        <div className="mx-auto grid max-w-shell items-center gap-12 lg:grid-cols-[1.05fr_.95fr] lg:gap-16">
          <div>
            <span className="mb-6 inline-flex items-center gap-2 rounded-pill bg-accent/10 py-[7px] pl-[11px] pr-3.5 text-[12.5px] font-semibold uppercase tracking-[.08em] text-accent">
              <span className="h-[7px] w-[7px] animate-live rounded-full bg-accent" aria-hidden="true" />
              Entraînement à l&apos;entretien
            </span>

            <h1 className="mb-5 text-[clamp(38px,5.1vw,61px)]">
              Le jour J, vous l&apos;aurez{" "}
              <em className="font-medium italic text-accent">déjà répété</em>.
            </h1>

            <p className="mb-8 max-w-[33em] text-lg text-ink-muted">
              InterviewSim joue le recruteur. Il vous pose les questions de{" "}
              <strong className="font-semibold text-ink">votre</strong>{" "}poste, à partir de votre
              propre CV, écoute vos réponses, puis vous rend une note avec un débrief qui ne vous
              épargne pas. Recommencez autant de fois qu&apos;il vous faut.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/entretien"
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-pill bg-accent px-6 py-[11px] text-[15px] font-semibold text-accent-ink shadow-soft transition-all duration-studio ease-studio hover:-translate-y-px hover:shadow-card focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-accent/20"
              >
                Commencer un entretien
                <Arrow />
              </Link>
              <a
                href="#how"
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-pill border-[1.5px] border-border-strong bg-surface px-6 py-[11px] text-[15px] font-semibold text-ink transition-all duration-studio ease-studio hover:-translate-y-px hover:shadow-soft focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-accent/20"
              >
                Voir comment ça marche
              </a>
            </div>

            <p className="mt-5 flex items-center gap-2 text-sm text-ink-faint">
              <Check />
              Aucune carte bancaire. Vous choisissez le poste, le niveau et la langue.
            </p>
          </div>

          <InterviewDemo />
        </div>
      </section>

      {/* ═══ Engagements — vérifiables, aucun chiffre inventé ═══ */}
      <div className="border-y-[1.5px] border-border bg-bg-alt">
        <ul className="mx-auto flex max-w-shell list-none flex-wrap justify-center gap-x-11 gap-y-3.5 px-6 py-6">
          {[
            "Sans carte bancaire pour commencer",
            "Votre CV sert au contexte, il n'est pas publié",
            "Vous pouvez tout effacer, à tout moment",
          ].map((g) => (
            <li key={g} className="flex items-center gap-2.5 text-[14.5px] font-medium text-ink-muted">
              <Check />
              {g}
            </li>
          ))}
        </ul>
      </div>

      {/* ═══ Comment ça marche ═══ */}
      <section id="how" className="scroll-mt-24 px-6 py-24">
        <div className="mx-auto max-w-shell">
          <div className="rv mb-14 max-w-[44rem]">
            <span className="mb-3.5 block text-[12.5px] font-semibold uppercase tracking-[.09em] text-accent">
              Trois temps
            </span>
            <h2 className="mb-4 text-[clamp(29px,3.6vw,41px)]">
              Un entretien, un débrief, et vous recommencez.
            </h2>
            <p className="text-[17px] text-ink-muted">
              Rien à installer, rien à configurer. Vous décrivez le poste, vous parlez, vous lisez
              ce qui n&apos;a pas marché.
            </p>
          </div>

          <div className="grid gap-9 md:grid-cols-3 md:gap-0">
            {steps.map((s, i) => (
              <div key={s.title} className="rv group relative md:pr-8">
                {/* Le trait qui relie les étapes : une progression, pas trois cartes isolées. */}
                {i < steps.length - 1 && (
                  <span
                    className="absolute left-[46px] right-1.5 top-[21px] hidden h-[1.5px] bg-gradient-to-r from-border-strong to-transparent md:block"
                    aria-hidden="true"
                  />
                )}
                <div className="relative z-10 mb-5 grid h-[42px] w-[42px] place-items-center rounded-pill border-[1.5px] border-border-strong bg-surface font-heading text-[17px] font-semibold text-accent transition-all duration-studio ease-studio group-hover:-translate-y-0.5 group-hover:border-accent group-hover:bg-accent group-hover:text-accent-ink">
                  {i + 1}
                </div>
                <h3 className="mb-2.5 text-xl">{s.title}</h3>
                <p className="text-[15px] text-ink-muted">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Fonctionnalités — une vedette, puis des appuis ═══ */}
      <section
        id="features"
        className="scroll-mt-24 border-y-[1.5px] border-border bg-bg-alt px-6 py-24"
      >
        <div className="mx-auto max-w-shell">
          <div className="rv mb-14 max-w-[44rem]">
            <span className="mb-3.5 block text-[12.5px] font-semibold uppercase tracking-[.09em] text-accent">
              Ce qu&apos;il y a dedans
            </span>
            <h2 className="mb-4 text-[clamp(29px,3.6vw,41px)]">
              La note n&apos;est que la fin de la phrase.
            </h2>
            <p className="text-[17px] text-ink-muted">
              Un score seul ne fait pas progresser. Ce qui compte, c&apos;est <em>pourquoi</em> — et
              sur quoi travailler demain.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
            <div className="rv flex flex-col gap-4 rounded-card border-[1.5px] border-border bg-surface p-8 shadow-soft">
              <h3 className="text-[26px]">Le débrief</h3>
              <p className="text-base text-ink-muted">
                Chaque entretien se termine par une note détaillée par critère, votre courbe
                comparée aux précédentes, et une analyse de ce qui a fait la différence.
              </p>
              <div className="mt-auto flex flex-1 flex-col justify-evenly gap-2.5 pt-1">
                {criteria.map((c) => (
                  <div
                    key={c.label}
                    className="grid grid-cols-[100px_1fr_30px] items-center gap-3 text-[13.5px] sm:grid-cols-[118px_1fr_34px]"
                  >
                    <span className="text-ink-muted">{c.label}</span>
                    <span className="h-[7px] overflow-hidden rounded-pill bg-bg-alt">
                      <i
                        data-bar={c.value}
                        className="block h-full w-0 rounded-pill bg-accent transition-[width] duration-[900ms] ease-studio"
                      />
                    </span>
                    <span className="text-right font-mono font-medium text-ink">{c.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-5">
              {supporting.map((f) => (
                <div
                  key={f.title}
                  className="rv rounded-card border-[1.5px] border-border bg-surface p-[22px] shadow-soft transition-all duration-studio ease-studio hover:-translate-y-0.5 hover:border-border-strong hover:shadow-card"
                >
                  <h3 className="mb-1.5 flex items-center gap-2.5 font-body text-base font-semibold tracking-normal">
                    <span className="text-accent">{f.icon}</span>
                    {f.title}
                  </h3>
                  <p className="text-[14.5px] text-ink-muted">{f.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rv mt-14">
            <span className="mb-3.5 block text-[12.5px] font-semibold uppercase tracking-[.09em] text-accent">
              Entraînement ciblé
            </span>
            <h2 className="mb-3 text-[clamp(24px,3vw,32px)]">Ou travaillez un seul point faible.</h2>
            <p className="max-w-[44rem] text-base text-ink-muted">
              Les drills sont des mini-entretiens sur un thème précis. La maîtrise se remplit à
              mesure que vous les réussissez.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              {themes.map((t) => (
                <span
                  key={t.name}
                  className="inline-flex items-center gap-2.5 rounded-pill border-[1.5px] border-border bg-surface px-4 py-2.5 text-[14.5px] font-medium text-ink transition-all duration-studio ease-studio hover:-translate-y-px hover:border-accent hover:shadow-soft"
                >
                  {t.name}
                  <span
                    className={`text-[11.5px] font-semibold ${t.done ? "text-ok" : "text-ink-faint"}`}
                  >
                    {t.level}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Progression ═══ */}
      <section id="progress" className="scroll-mt-24 px-6 py-24">
        <div className="mx-auto grid max-w-shell items-center gap-12 lg:grid-cols-[.95fr_1.05fr] lg:gap-14">
          <div className="rv">
            <span className="mb-3.5 block text-[12.5px] font-semibold uppercase tracking-[.09em] text-accent">
              Sur la durée
            </span>
            <h2 className="mb-4 text-[clamp(27px,3.4vw,38px)]">Ce qui s&apos;améliore se voit.</h2>
            <p className="text-[17px] text-ink-muted">
              Votre historique garde chaque entretien. Vous voyez ce qui progresse, ce qui stagne,
              et les exercices qui n&apos;ont pas encore été travaillés.
            </p>
            <div className="mt-7 border-l-[2.5px] border-accent pl-5">
              <p className="text-[15px] text-ink-muted">
                <b className="font-semibold text-ink">
                  Votre clarté progresse plus vite que votre fond technique.
                </b>{" "}
                Sur les cinq derniers entretiens, la structure a gagné un point quand le fond est
                resté stable — c&apos;est le fond qu&apos;il faut travailler maintenant.
              </p>
            </div>
          </div>

          <div className="rv rounded-card border-[1.5px] border-border bg-surface p-6 shadow-soft">
            <div className="mb-5 flex items-baseline justify-between">
              <h3 className="font-body text-sm font-semibold tracking-normal">
                Score moyen par entretien
              </h3>
              <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ok">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                  <path d="M4 17l6-6 4 4 6-7" />
                </svg>
                +14 pts
              </span>
            </div>
            <div className="flex h-[132px] items-end gap-2.5">
              {bars.map((h, i) => (
                <div
                  key={i}
                  data-col={h}
                  className={`relative h-0 flex-1 rounded-t-[7px] transition-[height] duration-[800ms] ease-studio ${
                    i === bars.length - 1 ? "bg-accent" : "bg-bg-alt"
                  }`}
                >
                  <span className="absolute -bottom-[23px] left-0 right-0 text-center font-mono text-[11px] text-ink-faint">
                    #{i + 1}
                  </span>
                </div>
              ))}
            </div>
            <div className="h-6" aria-hidden="true" />
          </div>
        </div>
      </section>

      {/* ═══ Questions ═══ */}
      <section
        id="faq"
        className="scroll-mt-24 border-t-[1.5px] border-border bg-bg-alt px-6 py-24"
      >
        <div className="mx-auto max-w-shell">
          <div className="rv mb-14 max-w-[44rem]">
            <span className="mb-3.5 block text-[12.5px] font-semibold uppercase tracking-[.09em] text-accent">
              Questions franches
            </span>
            <h2 className="text-[clamp(29px,3.6vw,41px)]">
              Ce que les gens demandent avant d&apos;essayer.
            </h2>
          </div>

          <div className="max-w-[800px]">
            {faq.map((item) => (
              <details key={item.q} className="rv group border-b-[1.5px] border-border">
                <summary className="flex cursor-pointer list-none items-center gap-4 py-5 font-heading text-[19px] font-semibold text-ink transition-colors duration-studio ease-studio hover:text-accent [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span className="ml-auto shrink-0 text-accent transition-transform duration-studio ease-studio group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="max-w-[62ch] pb-6 text-[15.5px] text-ink-muted">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Appel final ═══ */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-shell">
          <div className="rv rounded-[24px] border-[1.5px] border-border bg-surface bg-[radial-gradient(ellipse_70%_130%_at_50%_0%,var(--accent-soft),transparent_68%)] px-12 py-16 text-center shadow-card">
            <h2 className="mb-4 text-[clamp(28px,3.6vw,40px)]">
              Votre prochain entretien mérite une répétition.
            </h2>
            <p className="mx-auto mb-8 max-w-[40rem] text-[17px] text-ink-muted">
              Choisissez un poste, collez votre CV, et voyez ce que ça donne. Cela prend quatre
              minutes.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/entretien"
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-pill bg-accent px-6 py-[11px] text-[15px] font-semibold text-accent-ink shadow-soft transition-all duration-studio ease-studio hover:-translate-y-px hover:shadow-card focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-accent/20"
              >
                Commencer un entretien
                <Arrow />
              </Link>
              <a
                href="#faq"
                className="inline-flex min-h-[44px] items-center justify-center rounded-pill border-[1.5px] border-border-strong bg-surface px-6 py-[11px] text-[15px] font-semibold text-ink transition-all duration-studio ease-studio hover:-translate-y-px hover:shadow-soft"
              >
                J&apos;ai encore une question
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
