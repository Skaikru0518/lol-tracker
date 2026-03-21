---
name: project_stack
description: Fullstack Next.js practice project - stack and config decisions
type: project
---

League of Legends Profile Tracker — fullstack Next.js gyakorló projekt.
- Stack: Next.js (Route Handlers), Zod validáció, shadcn/ui, npm, React Query (cache)
- Animáció: Framer Motion (komponens animációk) + Lenis (smooth scroll)
- Külső API: Riot Games API (summoner, ranked, match history, champion mastery)
- Features: profil, ranked stats, match history, statisztikák, champion stats
- Nincs Prisma/DB, nincs regisztráció — direkt Riot API lekérés + kliens oldali cache React Query-vel
- Guidelines fájl: `.claude/CLAUDE.md` (ez az elsődleges config)
- `.claude/AGENTS.md`: Next.js verzió-figyelmeztetés — mindig a `node_modules/next/dist/docs/` doksit kell olvasni kód írás előtt

**Why:** Gyakorlás és tanulás céljából épül.
**How to apply:** Csak kérésre segíts, magyarázd el a döntések mögötti okokat ha kérdez.
