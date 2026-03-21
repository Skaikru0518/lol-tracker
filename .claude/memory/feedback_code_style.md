---
name: feedback_code_style
description: Code structure preferences - small reusable components, no large monolithic files
type: feedback
---

Komponensek legyenek kicsik, reusable-ök, és külön fájlokban.
- Komponensek helye: `/components/` mappa
- Ne legyen 500 soros komponens — bontsuk kisebbekre
- Page-ek külön, és a page-eken belüli részeket is külön komponensekbe

**Why:** Olvashatóság, karbantarthatóság, újrafelhasználhatóság.
**How to apply:** Minden új komponensnél gondolj arra, hogy bontható-e kisebb részekre. Ha egy fájl túl nagy lesz, refaktoráld.
