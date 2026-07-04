"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSpeech } from "./useSpeech";
import { EDGE_SOLO_VOICE } from "./edgeVoices";

export type SpeakOpts = {
  edgeVoice?: string;
  pitch?: number;
  rate?: number;
  voice?: SpeechSynthesisVoice;
};

type Engine = "probing" | "edge" | "browser";

export function useVoice() {
  const browser = useSpeech(); // chemin navigateur (best-voice), inchangé
  const [engine, setEngine] = useState<Engine>("probing");
  const [edgeSpeaking, setEdgeSpeaking] = useState(false);

  const queueRef = useRef<{ text: string; voice: string }[]>([]);
  const playingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const resolveRef = useRef<(() => void) | null>(null);
  // Contrôleurs des fetch /api/tts en vol (courant + préchargé) — pour tout couper d'un coup.
  const abortsRef = useRef<Set<AbortController>>(new Set());
  const mutedRef = useRef(false);

  // mutedRef suit l'état de sourdine du navigateur (source unique).
  useEffect(() => {
    mutedRef.current = browser.muted;
  }, [browser.muted]);

  // Test edge une seule fois : succès -> moteur edge ; sinon navigateur.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: "Bonjour.", voice: EDGE_SOLO_VOICE }),
        });
        if (!cancelled) setEngine(res.ok ? "edge" : "browser");
      } catch {
        if (!cancelled) setEngine("browser");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stopEdge = useCallback(() => {
    queueRef.current = [];
    abortsRef.current.forEach((ac) => ac.abort()); // coupe tous les fetch en vol (mute immédiat)
    abortsRef.current.clear();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    const r = resolveRef.current;
    resolveRef.current = null;
    r?.(); // débloque la lecture en cours (la boucle verra la file vide et sortira)
    setEdgeSpeaking(false);
  }, []);

  // Coupe l'audio edge dès que le navigateur passe en sourdine.
  useEffect(() => {
    if (browser.muted) stopEdge();
  }, [browser.muted, stopEdge]);

  const pump = useCallback(async () => {
    if (playingRef.current) return;
    playingRef.current = true;
    setEdgeSpeaking(true);

    // Lance la fabrication de l'audio d'un item ; renvoie l'URL blob ou null (échec/annulation).
    const fetchAudio = (item: { text: string; voice: string }): Promise<string | null> => {
      const ac = new AbortController();
      abortsRef.current.add(ac);
      return (async () => {
        try {
          const res = await fetch("/api/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item),
            signal: ac.signal,
          });
          if (!res.ok) throw new Error("tts");
          return URL.createObjectURL(await res.blob());
        } catch {
          return null; // échec ponctuel ou annulation -> phrase sautée (transcription reste lisible)
        } finally {
          abortsRef.current.delete(ac);
        }
      })();
    };

    const playUrl = (url: string): Promise<void> =>
      new Promise<void>((resolve) => {
        resolveRef.current = resolve;
        const audio = new Audio(url);
        audioRef.current = audio;
        const done = () => {
          resolveRef.current = null;
          resolve();
        };
        audio.onended = done;
        audio.onerror = done;
        audio.play().catch(done);
      });

    const nextItem = () => (queueRef.current.length ? queueRef.current.shift()! : null);

    // Préchargement de profondeur 1 : on fabrique la phrase N+1 pendant qu'on joue la N.
    let cur: Promise<string | null> | null = (() => {
      const it = nextItem();
      return it ? fetchAudio(it) : null;
    })();
    try {
      while (cur && !mutedRef.current) {
        // démarre le fetch de la phrase suivante AVANT de jouer la courante
        const it = nextItem();
        const next = it ? fetchAudio(it) : null;

        const url = await cur;
        if (url) {
          if (!mutedRef.current) await playUrl(url);
          URL.revokeObjectURL(url);
          audioRef.current = null;
        }

        // enchaîne sur le préchargé ; sinon la file a pu se remplir entre-temps (flux)
        cur = next ?? (() => {
          const it2 = nextItem();
          return it2 ? fetchAudio(it2) : null;
        })();
      }
    } finally {
      // On libère le verrou AVANT le nettoyage async (un nouveau speak() peut relancer pump).
      playingRef.current = false;
      setEdgeSpeaking(false);
      // Si on sort (mute) avec un audio déjà préchargé en main, on récupère et révoque son URL.
      if (cur) {
        const leftover = await cur;
        if (leftover) URL.revokeObjectURL(leftover);
      }
    }
  }, []);

  // On dépend des membres stables de `browser` (useCallback), pas de l'objet
  // `browser` lui-même qui change d'identité à chaque rendu — sinon speak/cancel
  // deviendraient instables et l'effet de nettoyage de MeetingRoom couperait la
  // voix à chaque rendu (edge ET navigateur).
  const browserSpeak = browser.speak;
  const browserMuted = browser.muted;
  const browserCancel = browser.cancel;

  const speak = useCallback(
    (text: string, opts?: SpeakOpts) => {
      if (browserMuted || !text.trim()) return;
      if (engine === "edge") {
        queueRef.current.push({ text, voice: opts?.edgeVoice ?? EDGE_SOLO_VOICE });
        void pump();
      } else {
        browserSpeak(
          text,
          opts ? { pitch: opts.pitch, rate: opts.rate, voice: opts.voice } : undefined
        );
      }
    },
    [engine, browserSpeak, browserMuted, pump]
  );

  const cancel = useCallback(() => {
    stopEdge();
    browserCancel();
  }, [stopEdge, browserCancel]);

  // Nettoyage au démontage.
  useEffect(() => () => stopEdge(), [stopEdge]);

  return {
    supported: engine === "browser" ? browser.supported : true,
    ready: engine !== "probing", // moteur décidé : l'UI peut commencer à parler (évite le mélange edge/navigateur)
    speak,
    cancel,
    muted: browser.muted,
    toggleMute: browser.toggleMute,
    isSpeaking: engine === "edge" ? edgeSpeaking : browser.isSpeaking,
    voices: browser.voices,
  };
}
