"""E2E du mode Entrainement : drill texte, cap 4 questions, bilan affiche.

Prerequis : `npm run dev` deja lance sur le port 3000 (cle Groq dans .env.local),
et `pip install playwright && playwright install chromium`.
Usage : python tests/e2e-drill.py   (captures dans %TEMP% ou $E2E_OUT)
"""
import os, re, tempfile, functools
print = functools.partial(print, flush=True)
from playwright.sync_api import sync_playwright, expect

OUT = os.environ.get("E2E_OUT", tempfile.gettempdir())
BASE = os.environ.get("E2E_BASE_URL", "http://localhost:3000")
ANSWERS = [
    "Je suis Ezekiel, developpeur web depuis trois ans. Chez SNDI j'ai repris un portail citoyen qui plantait sous charge : j'ai reecrit la couche de cache, on est passe de 8 secondes a 900 millisecondes de temps de reponse sur 12 000 utilisateurs par jour.",
    "Le projet le plus dur : une migration de base de donnees en production, la nuit, avec 400 Go. J'ai ecrit un script de bascule progressive et un plan de retour arriere teste deux fois en preproduction. Zero minute d'indisponibilite le jour J.",
    "Mon principal defaut, c'est que je vais trop vite a la solution technique avant d'avoir bien ecoute le besoin. Je m'oblige maintenant a reformuler la demande par ecrit avant de coder, ca m'a evite deux refontes inutiles cette annee.",
    "Dans cinq ans je veux etre lead technique sur une equipe de quatre ou cinq personnes, en gardant du temps de code. J'ai deja encadre deux stagiaires, c'est la partie du metier qui me motive le plus apres la technique.",
]

errors, failed = [], []
import traceback
with sync_playwright() as p:
    b = p.chromium.launch(headless=True, args=["--mute-audio", "--autoplay-policy=no-user-gesture-required"])
    page = b.new_page(viewport={"width": 1280, "height": 900})
    page.on("console", lambda m: (errors.append(m.text), print("  [console.error]", m.text[:200])) if m.type == "error" else None)
    page.on("pageerror", lambda e: (errors.append(str(e)), print("  [pageerror]", str(e)[:200])))
    page.on("framenavigated", lambda f: print("  [nav]", f.url) if f == page.main_frame else None)
    page.on("requestfailed", lambda r: failed.append(f"{r.method} {r.url} {r.failure}"))

    page.goto(f"{BASE}/entrainement", wait_until="domcontentloaded", timeout=180_000)
    page.wait_for_selector("main button h2", timeout=180_000)
    themes = page.locator("main button h2")
    print(f"[1] themes affiches : {themes.count()}")
    print("    -> " + " | ".join(themes.all_inner_texts()))
    page.screenshot(path=f"{OUT}/01-themes.png", full_page=True)

    page.get_by_role("button", name=re.compile("Comportementales|STAR")).first.click()
    page.get_by_role("button", name=re.compile("Rejoindre")).click()
    print("[2] drill demarre (theme comportemental), lobby franchi")

    ta = page.get_by_label("Ta réponse")
    send = page.get_by_label("Envoyer")
    expect(ta).to_be_visible(timeout=30_000)
    page.get_by_label("Transcription").click()
    print("    salle ouverte, transcription activee")

    def wait_question(n):
        expect(ta).to_be_enabled(timeout=90_000)
        page.wait_for_timeout(400)
        expect(ta).to_be_enabled(timeout=90_000)
        txt = page.locator("main").inner_text()
        print(f"[3.{n}] question {n} recue ({len(txt)} car. a l'ecran)")

    # bulles de la transcription uniquement (pas la tuile "Recruteur IA")
    bulles_rh = page.locator("div.overflow-y-auto").get_by_text("Recruteur", exact=True)
    nb_recruteur = 0
    for i, ans in enumerate(ANSWERS, start=1):
        wait_question(i)
        if i == len(ANSWERS):
            nb_recruteur = bulles_rh.count()
            page.screenshot(path=f"{OUT}/02-chat.png", full_page=True)
        ta.fill(ans)
        send.click()

    print(f"[4] questions du recruteur dans la transcription avant la 4e reponse : {nb_recruteur}")

    expect(page.get_by_text("Points forts")).to_be_visible(timeout=120_000)
    print("[5] bilan affiche")
    rapport = page.locator("main").inner_text()
    page.screenshot(path=f"{OUT}/03-bilan.png", full_page=True)
    print("---- BILAN ----")
    print(rapport[:1400])
    print("---------------")

    bas = rapport.lower()
    assert "en mieux" in bas, "reecriture absente du bilan"
    assert "travailler" in bas, "axes absents du bilan"
    assert "points forts" in bas, "points forts absents du bilan"
    assert re.search(r"\b\d{1,3}\b", rapport), "score absent"
    assert nb_recruteur == 4, f"cap 4 questions casse : {nb_recruteur}"

    # relance : "Refaire ce theme" doit revenir au chat
    page.get_by_role("button", name=re.compile("Refaire")).click()
    page.wait_for_timeout(1500)
    au_salon = page.get_by_role("button", name=re.compile("Rejoindre")).count() > 0
    print(f"[6] apres 'Refaire ce theme' : retour au salon ? {au_salon}")
    page.screenshot(path=f"{OUT}/04-refaire.png", full_page=True)
    if au_salon:
        page.get_by_role("button", name=re.compile("Rejoindre")).click()
    expect(page.get_by_label("Ta réponse")).to_be_enabled(timeout=90_000)
    q = page.locator("div.overflow-y-auto").get_by_text("Recruteur", exact=True).count()
    print(f"[7] 2e drill demarre, bulles recruteur : {q}")

    b.close()

print("\nERREURS CONSOLE :", errors or "aucune")
print("REQUETES ECHOUEES :", failed or "aucune")
print("\nRESULTAT : PASS")
