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
    try {
      while (queueRef.current.length > 0 && !mutedRef.current) {
        const item = queueRef.current.shift()!;
        try {
          const res = await fetch("/api/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item),
          });
          if (!res.ok) throw new Error("tts");
          const url = URL.createObjectURL(await res.blob());
          await new Promise<void>((resolve) => {
            resolveRef.current = resolve;
            const audio = new Audio(url);
            audioRef.current = audio;
            const done = () => {
              resolveRef.current = null;
              URL.revokeObjectURL(url);
              resolve();
            };
            audio.onended = done;
            audio.onerror = done;
            audio.play().catch(done);
          });
          audioRef.current = null;
        } catch {
          // ponytail: échec ponctuel edge -> on saute cette phrase (transcription reste lisible)
        }
      }
    } finally {
      playingRef.current = false;
      setEdgeSpeaking(false);
    }
  }, []);

  const speak = useCallback(
    (text: string, opts?: SpeakOpts) => {
      if (browser.muted || !text.trim()) return;
      if (engine === "edge") {
        queueRef.current.push({ text, voice: opts?.edgeVoice ?? EDGE_SOLO_VOICE });
        void pump();
      } else {
        browser.speak(
          text,
          opts ? { pitch: opts.pitch, rate: opts.rate, voice: opts.voice } : undefined
        );
      }
    },
    [engine, browser, pump]
  );

  const cancel = useCallback(() => {
    stopEdge();
    browser.cancel();
  }, [stopEdge, browser]);

  // Nettoyage au démontage.
  useEffect(() => () => stopEdge(), [stopEdge]);

  return {
    supported: engine === "browser" ? browser.supported : true,
    speak,
    cancel,
    muted: browser.muted,
    toggleMute: browser.toggleMute,
    isSpeaking: engine === "edge" ? edgeSpeaking : browser.isSpeaking,
    voices: browser.voices,
  };
}
