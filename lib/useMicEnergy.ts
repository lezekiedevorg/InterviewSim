"use client";

import { useEffect, useRef, useState } from "react";
import { createVoiceGate } from "./voiceGate";

// ponytail: seuils de calibration — dépendent du micro/débit réel (à régler à l'usage,
// avant de sortir l'artillerie Silero VAD). 0.06 RMS ≈ voix nette ; 150 ms ≈ salve, pas un pic.
const DEFAULT_THRESHOLD_RMS = 0.06;
const DEFAULT_SUSTAIN_MS = 150;

type Opts = {
  enabled: boolean;
  listening: boolean;
  onSpeech: () => void;
  thresholdRms?: number;
  sustainMs?: number;
};

export function useMicEnergy({
  enabled,
  listening,
  onSpeech,
  thresholdRms = DEFAULT_THRESHOLD_RMS,
  sustainMs = DEFAULT_SUSTAIN_MS,
}: Opts): { supported: boolean; error: string | null } {
  const [supported, setSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs vers les valeurs courantes : le graphe audio (créé une fois par `enabled`)
  // les lit sans réarmer l'effet à chaque rendu.
  const listeningRef = useRef(listening);
  listeningRef.current = listening;
  const onSpeechRef = useRef(onSpeech);
  onSpeechRef.current = onSpeech;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const AC = window.AudioContext ?? (window as any).webkitAudioContext;
    const hasGUM = !!navigator.mediaDevices?.getUserMedia;
    if (!AC || !hasGUM) {
      setSupported(false);
      return;
    }
    setSupported(true);
    if (!enabled) return;

    let cancelled = false;
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    let raf = 0;
    const gate = createVoiceGate(thresholdRms, sustainMs);

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        ctx = new AC();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        const buf = new Uint8Array(analyser.fftSize);

        const tick = () => {
          if (cancelled) return;
          if (listeningRef.current) {
            analyser.getByteTimeDomainData(buf);
            // RMS de l'écart au centre (128) normalisé sur [0,1].
            let sum = 0;
            for (let i = 0; i < buf.length; i++) {
              const v = (buf[i] - 128) / 128;
              sum += v * v;
            }
            const rms = Math.sqrt(sum / buf.length);
            if (gate.feed(rms, performance.now())) onSpeechRef.current();
          } else {
            gate.reset(); // pas en écoute → on réarme pour la prochaine salve
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch {
        if (!cancelled) setError("Micro refusé — le barge-in est désactivé.");
      }
    })();

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      void ctx?.close();
    };
  }, [enabled, thresholdRms, sustainMs]);

  return { supported, error };
}
