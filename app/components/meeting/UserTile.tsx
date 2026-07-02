"use client";

import { useEffect, useRef, useState } from "react";

export function UserTile({ cameraOn }: { cameraOn: boolean }) {
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
    <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl bg-slate-200">
      {cameraOn && !error ? (
        <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
      ) : (
        <div className="flex flex-col items-center gap-2">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-slate-400 text-lg font-bold text-white">
            Toi
          </span>
          {error && <span className="text-xs text-slate-500">Caméra indisponible</span>}
        </div>
      )}
    </div>
  );
}
