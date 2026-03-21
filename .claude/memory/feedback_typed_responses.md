---
name: feedback_typed_responses
description: Always use Zod schemas and explicit types for API responses, never leave anything as any
type: feedback
---

Minden API response-hoz Zod séma + exportált típus kell.
- Zod sémák: `src/lib/validators/` mappában
- Hookokban explicit típus: `useQuery<MyType>(...)`
- Soha ne legyen `any` — mindig legyen IntelliSense és autocompletion

**Why:** Típus nélkül nincs autocompletion, nem látszik milyen propjai vannak a response-nak.
**How to apply:** Új endpoint → először Zod séma + típus export, utána hook és route handler.
