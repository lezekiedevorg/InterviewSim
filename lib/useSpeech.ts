"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { rankFrenchVoices } from "./speech";

export function useSpeech() {
  const [supported, setSupported] = useState(false);
  const [muted, setMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const mutedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    setSupported(true);
    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      voiceRef.current = rankFrenchVoices(voices)[0] ?? voices[0] ?? null;
    };
    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      window.speechSynthesis.cancel();
    };
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!supported || mutedRef.current || !text.trim()) return;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "fr-FR";
      if (voiceRef.current) u.voice = voiceRef.current;
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

  return { supported, speak, cancel, muted, toggleMute, isSpeaking };
}
