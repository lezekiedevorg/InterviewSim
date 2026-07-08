"use client";

import { useEffect, useRef, useState } from "react";

export function UserTile({ cameraOn, inset = false }: { cameraOn: boolean; inset?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!cameraOn) return;
    let stream: MediaStream | null = null;
    let cancelled = false;
    setError(false);
    if (!navigator.mediaDevices) {
      setError(true);
      return;
    }
    navigator.mediaDevices
      ?.getUserMedia({ video: true })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [cameraOn]);

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden border border-cream/20 bg-night-900 ${
        inset ? "h-[72px] w-[110px] rounded-[14px]" : "aspect-video w-full rounded-[22px]"
      }`}
    >
      {cameraOn && !error ? (
        <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
      ) : (
        <div className="flex flex-col items-center gap-1.5 p-2 text-center">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`text-faint ${inset ? "h-[18px] w-[18px]" : "h-7 w-7"}`}
            aria-hidden
          >
            <path d="M16 8l6-3v14l-6-3" />
            <rect x="2" y="6" width="14" height="12" rx="3" />
            <line x1="3" y1="3" x2="21" y2="21" />
          </svg>
          <span className={`font-semibold text-faint ${inset ? "text-[11px]" : "text-sm"}`}>
            {error ? "Caméra indisponible" : "Toi · caméra off"}
          </span>
        </div>
      )}
    </div>
  );
}
