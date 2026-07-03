"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useSpeechRecognition() {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  // ponytail: types SpeechRecognition absents du lib DOM par défaut → any local.
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const Ctor =
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!Ctor) return;
    setSupported(true);

    const recognition = new Ctor();
    recognition.lang = "fr-FR";
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (event: any) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      setTranscript(text);
    };
    recognition.onerror = (event: any) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setError("Micro refusé — autorise l'accès au micro dans le navigateur.");
      } else if (event.error === "no-speech") {
        setError("Je n'ai rien entendu, réessaie.");
      } else {
        setError("Souci avec le micro, réessaie.");
      }
      setListening(false);
    };
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.stop();
    };
  }, []);

  const start = useCallback(() => {
    const r = recognitionRef.current;
    if (!r) return;
    setError(null);
    setTranscript("");
    try {
      r.start();
      setListening(true);
    } catch {
      // ponytail: start() throw si déjà démarré — sans gravité, on ignore.
    }
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  return { supported, listening, transcript, start, stop, error };
}
