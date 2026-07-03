"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useSpeech() {
  const [supported, setSupported] = useState(false);
  const [muted, setMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const mutedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    setSupported(true);
    const pickVoice = () => {
      const all = window.speechSynthesis.getVoices();
      const fr = all.filter((v) => v.lang.startsWith("fr"));
      setVoices(fr);
      voiceRef.current = fr[0] ?? all[0] ?? null;
    };
    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      window.speechSynthesis.cancel();
    };
  }, []);

  const speak = useCallback(
    (
      text: string,
      opts?: { pitch?: number; rate?: number; voice?: SpeechSynthesisVoice }
    ) => {
      if (!supported || mutedRef.current || !text.trim()) return;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "fr-FR";
      if (opts?.voice) u.voice = opts.voice;
      else if (voiceRef.current) u.voice = voiceRef.current;
      if (opts?.pitch !== undefined) u.pitch = opts.pitch;
      if (opts?.rate !== undefined) u.rate = opts.rate;
      u.onstart = () => setIsSpeaking(true);
      u.onend = () => setIsSpeaking(false);
      u.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(u);
    },
    [supported]
  );

  const cancel = useCallback(() => {
    if (supported) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [supported]);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      mutedRef.current = next;
      if (next && supported) window.speechSynthesis.cancel();
      return next;
    });
  }, [supported]);

  return { supported, speak, cancel, muted, toggleMute, isSpeaking, voices };
}
