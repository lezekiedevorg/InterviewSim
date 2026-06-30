"use client";

import { useState } from "react";
import type { InterviewContext, ChatMessage, Debrief } from "@/lib/types";
import { validateContext } from "@/lib/validate";

type Phase = "form" | "chat" | "debrief";

export default function Home() {
  const [phase, setPhase] = useState<Phase>("form");
  const [context, setContext] = useState<InterviewContext>({ poste: "", cv: "" });
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [debrief, setDebrief] = useState<Debrief | null>(null);
  const [debriefRaw, setDebriefRaw] = useState<string | null>(null);

  const formErrors = validateContext(context);

  async function streamRecruiter(nextHistory: ChatMessage[]) {
    setStreaming(true);
    setErrorMsg(null);
    // Ajoute un message recruteur vide qu'on va remplir au fil du flux
    setHistory([...nextHistory, { role: "recruiter", text: "" }]);
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context, history: nextHistory }),
      });
      if (!res.ok) {
        const txt = await res.text();
        setErrorMsg(txt || "Erreur.");
        // retire le message recruteur vide
        setHistory(nextHistory);
        return;
      }
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setHistory([...nextHistory, { role: "recruiter", text: acc }]);
      }
    } catch {
      setErrorMsg("Connexion interrompue. Réessaie.");
      setHistory(nextHistory);
    } finally {
      setStreaming(false);
    }
  }

  function startInterview() {
    if (formErrors.length > 0) return;
    setPhase("chat");
    streamRecruiter([]); // première réplique du recruteur
  }

  function sendAnswer() {
    if (currentAnswer.trim() === "" || streaming) return;
    const next: ChatMessage[] = [
      ...history,
      { role: "candidate", text: currentAnswer.trim() },
    ];
    setCurrentAnswer("");
    streamRecruiter(next);
  }

  async function finishInterview() {
    setPhase("debrief");
    setErrorMsg(null);
    setDebrief(null);
    setDebriefRaw(null);
    try {
      const res = await fetch("/api/debrief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context, transcript: history }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Erreur.");
        return;
      }
      if (data.debrief) setDebrief(data.debrief);
      else setDebriefRaw(data.raw ?? "");
    } catch {
      setErrorMsg("Connexion interrompue. Réessaie.");
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
      <h1>InterviewSim</h1>

      {phase === "form" && (
        <section>
          <p>Décris ton entretien, colle ton CV, puis lance la simulation.</p>
          <Field label="Poste visé *" value={context.poste}
            onChange={(v) => setContext({ ...context, poste: v })} />
          <Field label="Entreprise / type" value={context.entreprise ?? ""}
            onChange={(v) => setContext({ ...context, entreprise: v })} />
          <Field label="Domaine" value={context.domaine ?? ""}
            onChange={(v) => setContext({ ...context, domaine: v })} />
          <Field label="Niveau (junior/senior)" value={context.niveau ?? ""}
            onChange={(v) => setContext({ ...context, niveau: v })} />
          <Field label="Langue" value={context.langue ?? ""}
            onChange={(v) => setContext({ ...context, langue: v })} />
          <Area label="CV (collé) *" value={context.cv}
            onChange={(v) => setContext({ ...context, cv: v })} />
          <Area label="Offre d'emploi (collée)" value={context.offre ?? ""}
            onChange={(v) => setContext({ ...context, offre: v })} />
          <button disabled={formErrors.length > 0} onClick={startInterview}>
            Démarrer l&apos;entretien
          </button>
          {formErrors.length > 0 && (
            <p style={{ color: "#a00" }}>{formErrors.join(" ")}</p>
          )}
        </section>
      )}

      {phase === "chat" && (
        <section>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {history.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === "recruiter" ? "flex-start" : "flex-end",
                background: m.role === "recruiter" ? "#eef" : "#efe",
                padding: 10, borderRadius: 8, maxWidth: "85%", whiteSpace: "pre-wrap",
              }}>
                <strong>{m.role === "recruiter" ? "Recruteur" : "Toi"}</strong>
                <div>{m.text}</div>
              </div>
            ))}
          </div>
          {errorMsg && <p style={{ color: "#a00" }}>{errorMsg}</p>}
          <div style={{ marginTop: 16 }}>
            <textarea value={currentAnswer} disabled={streaming}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              rows={3} style={{ width: "100%" }} placeholder="Ta réponse..." />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button onClick={sendAnswer} disabled={streaming || currentAnswer.trim() === ""}>
                Envoyer
              </button>
              <button onClick={finishInterview} disabled={streaming}>
                Terminer l&apos;entretien
              </button>
            </div>
          </div>
        </section>
      )}

      {phase === "debrief" && (
        <section>
          <h2>Débrief</h2>
          {errorMsg && (
            <>
              <p style={{ color: "#a00" }}>{errorMsg}</p>
              <button onClick={finishInterview}>Réessayer</button>
            </>
          )}
          {!errorMsg && !debrief && !debriefRaw && <p>Génération du débrief…</p>}
          {debrief && (
            <div>
              <p><strong>Score de confiance :</strong> {debrief.scoreConfiance}/100</p>
              <p>{debrief.syntheseGenerale}</p>
              <h3>Points forts</h3>
              <ul>{debrief.pointsForts.map((x, i) => <li key={i}>{x}</li>)}</ul>
              <h3>À travailler</h3>
              <ul>{debrief.pointsATravailler.map((x, i) => <li key={i}>{x}</li>)}</ul>
              <h3>Reformulations suggérées</h3>
              <ul>{debrief.reformulations.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
          )}
          {debriefRaw && <pre style={{ whiteSpace: "pre-wrap" }}>{debriefRaw}</pre>}
        </section>
      )}
    </main>
  );
}

function Field(props: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <label style={{ display: "block", fontSize: 14 }}>{props.label}</label>
      <input value={props.value} onChange={(e) => props.onChange(e.target.value)}
        style={{ width: "100%" }} />
    </div>
  );
}

function Area(props: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <label style={{ display: "block", fontSize: 14 }}>{props.label}</label>
      <textarea value={props.value} onChange={(e) => props.onChange(e.target.value)}
        rows={5} style={{ width: "100%" }} />
    </div>
  );
}
