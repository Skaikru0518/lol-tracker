# Summon.gg repó audit — 2026-11-13

**Mit csinál a repó:** a Summon.gg egy Next.js-es League of Legends statisztika-oldal. Riot ID alapján mutat profilt, meccseket, rangot, LP-történetet, achievementeket, teljesítménypontot, valamint streamer-widgetet és overlay-végpontot. Az adat a Riot API-ból jön, és Postgresben (Prisma) tárolódik. A cronok frissítik a rangokat, az achievementeket és a baseline-t.

**Feltételezett terhelés:**
- egy pod, 384 MB heap, korábban már OOM-mal elhalt;
- kevés egyidejű látogató;
- egy személyes Riot kulcs, 100 kérés/2 perc.

A szűk keresztmetszet tehát a Riot-keret és a memória.

## Must fix

1. **Bárki elfogyaszthatja a közös Riot-keretet** (`src/app/api/ranked/batch/route.ts`, `src/app/api/matches/route.ts`, `src/app/api/achievements/route.ts`)
   - **Mi ez:** nyilvános végpontok, a kliens hívja őket a profil- és a live-oldalról.
   - **Probléma:**
     - a `ranked/batch` bármennyi puuidot elfogad, és mindegyikre Riot-hívást indít;
     - a `matches` legfeljebb 100 meccset tölt le egy kérésre;
     - egy `?puuids=` lista 200 azonosítóval 200 Riot-hívás. A kulcs 2 percre kifogy, és addig az egész oldalon hibát kap mindenki.
     - Az `achievements` POST korlát nélkül újraszámol, és a játékos összes meccsét beolvassa.
     - IP-limit csak a widgeten és az overlayen van.
   - **Javítás:**
     - a `puuids` legyen legfeljebb 10 (a live meccsben is 10 játékos van);
     - a `MAX_COUNT` legyen 50, mert a UI ennél többet nem kér;
     - a meglévő `allowRequest(ip)` menjen ezekre a route-okra is. Fejenként 2–3 sor.
   - **Ha kihagyjuk:** egy rossz szándékú szkript vagy egy crawler percekre megbénítja az oldalt.

## Should fix

2. **Kis- és nagybetű-érzékeny Riot ID keresés** (`src/lib/summoner/profile/account.ts:20`)
   - **Mi ez:** a `resolveAccount` előbb a DB-ben keresi a fiókot név és tag alapján, és csak ha ott nincs meg, kérdezi a Riotot.
   - **Probléma:**
     - a Postgres egyenlőség érzékeny a kis- és nagybetűre, a Riot ID viszont nem;
     - a `/summoner/skaikru-heavn` vagy egy kisbetűs widget-URL soha nem talál a DB-ben, így minden betöltés, a widgetnél pedig minden perc egy Riot-hívás.
   - **Javítás:** a `findFirst` feltétele legyen `{ gameName: { equals: gameName, mode: "insensitive" }, tagLine: { equals: tagLine, mode: "insensitive" } }`. A tábla kb. 3000 soros, az index hiánya itt nem számít.
   - **Ha kihagyjuk:** felesleges Riot-hívások, ráadásul pont a percenként pollozó widgeteknél.

3. **A widget-állapot sosem törlődik** (`src/lib/widget/widget-data.ts:43`)
   - **Mi ez:** a pod memóriájában egy map summoner, queue és scope szerint, ez osztja el a Riot-keretet.
   - **Probléma:**
     - minden summoner, akinek bárki megnyitja a widget-generátorát, örökre kap egy bejegyzést;
     - a widget-cache bevezetése óta (`88ceda1`) egy bejegyzés legfeljebb 20 szűkített meccset is tart;
     - ezer megnyitott generátor után ez több tíz MB, ami 384 MB-os heapnél, OOM-előzménnyel számít.
   - **Javítás:** a bejegyzés kapjon `usedAt` mezőt, és ha a map 200 fölé nő, törlődjenek a 15 percnél régebben használt bejegyzések. Kb. 5 sor, ugyanaz a minta, mint az `ip-rate-limit.ts`-ben.
   - **Ha kihagyjuk:** lassan növő memória a pod következő újraindulásáig.

4. **A `ranked/batch` lemásolja a rang-mentést, de LP-snapshotot nem ír** (`src/app/api/ranked/batch/route.ts:73-100`)
   - **Mi ez:** a live-oldal és a scoreboard rangjait frissíti.
   - **Probléma:**
     - saját upsert-ciklusa van a `saveRankedEntries` helyett, így nem ír `LPHistory` sort;
     - ha egy játékos LP-je ezen az úton változik, az LP-grafikonból kimarad a pont;
     - a widget LP-változás-baseline-ja is gyakrabban lesz „stale”.
   - **Javítás:** a ciklus helyett `await saveRankedEntries(puuid, entries)`. Kb. 30 sor törlődik.
   - **Ha kihagyjuk:** hiányos LP-történet, és két helyen kell karbantartani ugyanazt a logikát.

5. **Az achievement-frissítés kétszer van megírva** (`src/app/api/cron/achievements/route.ts:35-57`, `src/app/api/achievements/route.ts` POST)
   - **Mi ez:** detektálás, aztán `createMany`, `deleteMany` és `recomputeProgress` egy fiókra.
   - **Probléma:** a cron és a POST ugyanezt a 4 lépést külön-külön hajtja végre. Ha az egyiket módosítjuk (például a törlési szabályt), a másik eltér tőle.
   - **Javítás:** egy `refreshAchievements(puuid)` függvény a `src/lib/achievements/`-ben, és mindkét hely ezt hívja. Kb. −12 sor.
   - **Ha kihagyjuk:** később a cron és a profil-gomb eltérő eredményt ad.

## Nice to have

6. **Az overlay-cache lejárt elemei bent maradnak** (`src/lib/overlay/overlay-game.ts:21,159`)
   - **Mi ez:** 60 mp-es cache puuid szerint, meccsenként mind a 10 játékosra beírva.
   - **Probléma:** a lejárt bejegyzéseket semmi nem törli, és az idegen játékosok kulcsai sosem íródnak felül, így minden overlayezett meccs objektuma bent marad.
   - **Javítás:** `set` előtt egy ciklus, ami törli a lejárt elemeket (2 sor).
   - **Ha kihagyjuk:** kis szivárgás, kevés overlay-használónál napi 1–2 MB.

7. **Elavult megjegyzés** (`src/components/ui/icon-tooltip.tsx:3-5`)
   - **Mi ez:** „Requires shadcn tooltip… run npx shadcn add tooltip”.
   - **Probléma:** a tooltip komponens már megvan, a megjegyzés félrevezető.
   - **Javítás:** a 3 sor törlése.
   - **Ha kihagyjuk:** semmi, csak zaj.

Kihagytam 3 apróbb tételt: a régi `as any` lint-hibákat a Riot-mentő ágakban, és két nem pontos komment-szöveget.

---

**Verdict:** használható, a korábbi optimalizálások rendben vannak. Először az 1-est javítsd (a Riot-keret védelme), utána a 2-est és a 3-ast (felesleges hívások és memória).

**Lean:** kb. −45 sor lehetséges, függőséget nem kell kidobni.

**Nem néztem meg:**
- **Az IP-limit megkerülhetősége:** a route-ok az `X-Forwarded-For` első értékét veszik. A namespace-ben nincs Ingress, és nem tudom, mi áll a Traefik előtt (Cloudflare? tunnel?). Ha a kliens által küldött fejléc eljut a podig, az IP-limit kijátszható. Ezt neked kell ellenőrizned.
- a komponensek és a UI zöme (kb. 18 ezer sorból a szerveroldalt és a route-okat olvastam);
- a C# projekt és a summon-electron;
- `pnpm build` nem futott;
- a baseline-cron gyakorisága, mert a cronok nem a k8s-ből indulnak.
