# Summon.gg — funkcióötletek és pozicionálás (2026-11-13)

Szerintem nem érdemes ott versenyezni, ahol az OP.gg, a u.gg vagy a dpm.lol erős: tier-listák, buildek, globális meta-statisztikák. Ehhez napi százezres meccsminta és production kulcs kell, ezt nem lehet behozni. Az Est. MMR-t pedig a Riot szabályzata eleve tiltja.

Ott érdemes építeni, ahol már most is egyedi vagy: **achievementek, teljesítménypont, streamer-eszközök**, és a **baráti kör vagy a közösség**, amit a nagy oldalak egyáltalán nem szolgálnak ki.

## Amire most is építhetsz

- **Achievementek, ritkasággal és meccsenkénti badge-ekkel:** a nagy oldalakon ez nincs meg. Ez a legerősebb ok, amiért valaki visszajön.
- **Teljesítménypont kategóriákra bontva:** a u.gg és az OP.gg főleg nyers számokat ad. A „mit csináltam rosszul” típusú értelmezés nagyrészt fizetős oldalaknál van (Mobalytics).
- **Stream widget és overlay:** a widgettel egy streamer minden adásban a nézők elé teszi a márkát.

## Amivel jönnének a felhasználók (fontossági sorrendben)

1. **Discord bot.** A baráti társaságok Discordon élnek, az OP.gg ott nincs jelen. Ötletek:
   - fiók összekötése;
   - automatikus poszt promotáláskor, nagy LP-nyereségnél vagy új achievementnél;
   - heti szerver-ranglista;
   - `/rank` és `/live` parancsok.

   Egy csoport, egy bot, és mindenki naponta látja a „summon.gg”-t. Ez a legjobb terjedési csatorna.
2. **Chatbot-parancs streamereknek.** Egy `/api/chat/{slug}` végpont, ami szöveget ad vissza, például: `Skaikru: Emerald II 54 LP · ma 5W 2L (+38 LP)`. A Nightbot és a StreamElements ezt `!rank` parancsként tudja használni. A widget adata már megvan, ez kb. egy délutánnyi munka, és rengeteg streamer keres ilyet.
3. **Megosztható képek** (`next/og`):
   - meccskártya („S+ · 14/2/9 Ahri”);
   - promotálás-kártya;
   - achievement-kártya.

   Discordon vagy Twitteren beillesztve a link előnézete maga a reklám.
4. **Session-összefoglaló a profilon:** „Ma: 6 meccs, 4W 2L, +31 LP, átlagpont 72, legjobb: …”. A widget logikája megvan hozzá. Az emberek a saját mai napjukra kíváncsiak, nem az utolsó 20 meccsre.
5. **Duo és barátok:**
   - kivel nyersz a legtöbbet, „duo-szinergia”;
   - két profil összehasonlítása (pont, kategóriák, championok);
   - „ki carryzott” a közös meccseken.

   A baráti versengés miatt jönnek vissza.
6. **Értelmezett coaching a pontból:**
   - „Az utolsó 30 meccsen a vision a leggyengébb kategóriád: 38 a ranghoz mért 55 helyett.”
   - Kategóriatrend az idő függvényében.
   - Meccs után 2–3 konkrét tanulság a timeline-ból: halál objektív előtt, CS 10 percnél a szerephez képest.

   A baseline és a kategóriák már megvannak, ez inkább megjelenítés kérdése.
7. **Heti vagy szezonvégi összefoglaló („Wrapped”):** legtöbbet játszott champion, legjobb meccs, megszerzett achievementek, LP-görbe. Megosztható képként szezonvégén vírusszerűen terjed.
8. **Helyi közösség:** magyar nyelv és hazai ranglista a követett fiókokból. Az OP.gg globális, egy magyar közösség viszont saját helyet akar. Kicsi, de hűséges piac.

## TFT

Ugyanaz a logika: **ne meta-oldal legyen** (a MetaTFT és a tactics.tools ott verhetetlen), hanem **személyes tracker**.

- **Profil:** rang, LP-görbe (a meglévő komponens jó hozzá), meccslista helyezéssel, comppal, augmentekkel és itemekkel.
- **TFT-achievementek**, ez megint egyedi: „3-csillagos 5-költségű”, „top 4 sorozat”, „nyerés ugyanazzal a trait-tel 3-szor”.
- **TFT stream widget:** a helyezés-pöttyök (1–8, színezve) a strip stílusba szinte maguktól illenek.
- **Session és Discord-bot:** ugyanaz, mint LoL-nál.

Egy figyelmeztetés: a Riot a production kulcsot termékenként és játékonként hagyja jóvá. Ha a LoL-kérelem már hetek óta függőben van, a TFT-hez külön kérelem kellhet. Ezt még a fejlesztés előtt nézd meg a developer portálon.

## Amit kerülnék

- Tier-listák, buildek, aggregált champion-statisztikák: nincs hozzá adatmennyiség.
- Bármilyen becsült MMR vagy rejtett skill rating (Riot-szabályzat).
- Fizetős funkció most: előbb felhasználó kell.

## Ha egyet kéne választani

A chatbot-parancs (2.) és a megosztható képek (3.) gyorsan elkészülnek és azonnal terjednek. A Discord bot (1.) adja a legtöbbet, de az egy nagyobb projekt.

---

*Megjegyzés:* a keresések csak felületes eredményt adtak, egy-két forrás pedig konkurens marketingoldal volt. A fenti lista nagyrészt saját ismeretekre épül, a dpm.lol 2026-os funkcióit nem sikerült ellenőrizni.

## Források

- [Mobalytics: U.GG összehasonlítás](https://mobalytics.gg/ugg/)
- [Mobalytics: OP.GG vs Mobalytics](https://mobalytics.gg/opgg-vs-mobalytics/)
- [Similarweb: metatft.com konkurensei](https://www.similarweb.com/website/metatft.com/competitors)
- [Similarweb: tactics.tools konkurensei](https://www.similarweb.com/website/tactics.tools/competitors/)
- [mobi.gg: legjobb TFT-eszközök](https://mobi.gg/en/tips/best-tft-tools)
