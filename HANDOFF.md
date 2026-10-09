# Handoff: That's What She Sang (Office Music Quiz)

**Live:** https://thatswhatshesang.com (GitHub Pages, deploys from `main`). The old `asrosen05-coder.github.io/office-music-game/` address redirects there.
**Repo:** `C:\Projects\Office Music Game\office-music-game` → `github.com/asrosen05-coder/office-music-game` (public)

## What this is
A mobile-first, client-side-only web game. You hear a 30-second preview of a song that played in an episode of *The Office* (US), then pick the episode from 4 options. A game is 10 random songs, with 1 skip and 1 song reveal. At the end you can share an emoji breakdown. There's no backend and no score persistence. Audio is Apple's ad-free iTunes previews, played in a plain `<audio>` element.

## Run it locally
```
python -m http.server 8765      # then open http://localhost:8765
```
`file://` won't work because `fetch()` of the JSON files fails there.

## Releasing (important)
Every asset URL in `index.html` carries `?v=N`: the import map entries, the `app.js` script tag and the stylesheet link. **Bump N on every release.** Otherwise phones keep cached old code (GitHub Pages caches for about 10 minutes, and that includes `index.html` itself, so reload after a deploy) and run it against new data. That broke the game on an iPhone once. Data files are fetched with `cache: 'no-cache'`, so they're always fresh. A new JS module also needs an entry in the import map.

## Domain
- `thatswhatshesang.com` is registered at **Namecheap** with free domain privacy on.
- **Namecheap → Advanced DNS** holds GitHub's records: 4 A records for `@` (`185.199.108–111.153`), 4 AAAA records for `@` (`2606:50c0:8000–8003::153`), a CNAME for `www` pointing to `asrosen05-coder.github.io.`, and a TXT record `_github-pages-challenge-asrosen05-coder` for GitHub's domain verification. Leave all of them in place.
- The domain is verified in the GitHub account's Pages settings. That stops anyone else from attaching it to their own GitHub site.
- The repo's Pages settings have the custom domain set and **Enforce HTTPS** on. GitHub issues and renews the certificate, which covers both `thatswhatshesang.com` and `www`.
- The `CNAME` file in the repo root holds the domain. **Don't delete it**, or the site falls back to the `github.io` address.
- The share link is built from `location`, so it picks up the domain automatically.

## Architecture (vanilla HTML/CSS/JS, ES modules, no build step)
```
index.html        all screens, popover, result + quit sheets, toast, SVG icon sprite, versioned import map
css/styles.css    tokens (light + dark), type scale, layout, components, reduced-motion / -transparency / -contrast
js/data.js        fetch (no-cache) + validate; bad songs are skipped with a console warning, bad episodes are fatal
js/quiz.js        pure rules, no DOM: scoring, options (respecting alsoIn), clock, outcomes, skip, reveal, summary
js/player.js      <audio> player for Apple previews: blocked/paused detection, preloading, preview-URL refresh
js/share.js       share text builder (pure) + native share sheet / clipboard fallback
js/motion.js      spring solver (Apple response/damping params), momentum projection, rubber-band, count-up, haptics
js/sheet.js       bottom sheet: 1:1 drag, interruptible, velocity handoff, projection-based dismiss
js/ui.js          all DOM rendering
js/app.js         flow controller wiring data + player + quiz + ui + share
assets/icons/     icon.svg (browser tab) + apple-touch-icon.png (180×180 iPhone home screen)
```

## Rules
- **Options:** 4 per question, 1 correct and 3 random distinct episodes. A song's `alsoIn` episodes are never offered as wrong answers. Each option has an ⓘ button with an original 1–2 sentence description.
- **Scoring:** `200 + 800 · 0.5^(t/8)`, which is 1000 for an instant answer, 600 at 8s, and floors near 200. Wrong and skip both score 0, tracked separately. The clock starts on the first `playing` event, and pauses while the app is backgrounded or the End Quiz sheet is open. Answers stay disabled until audio actually starts.
- **Lifelines:** one skip and one song reveal per game. The reveal shows title and artist, never the episode, costs nothing, and is marked 👁️ in the share text and recap.
- **Share:** 🟩 correct, 🟥 wrong, 🟪 skipped, then one line per song with 👁️ if it was revealed, plus the score and the play link. Episodes are left out so friends aren't spoiled. On touch devices it opens the native share sheet (Messages, etc.); otherwise it copies to the clipboard, falling back to the share sheet if the clipboard is refused.

## Design (Apple HIG-inspired)
- System font with size-specific tracking and rounded numerals. Semantic light and dark tokens in a Dunder Mifflin palette (navy, copier-paper cream, manila gold). Slate gray marks a skipped song everywhere.
- The Now Playing card is tinted by the song's album art, heavily blurred. When the browser blocks autoplay (iOS, first clip), the card says "Tap to play", and tapping it starts the audio.
- The result sheet springs up with the song, cover art, episode, an "Also heard in …" line for multi-episode songs, and a "Listen on Apple Music" link. Drag it down or tap Next.
- Press feedback fires on pointer-down. Haptics on answer (Android). Live points counter, segmented progress bar, Replay after the clip ends.

## Data
- **185 songs, 95 episodes, seasons 1–9.** 90 episodes have at least one song. Five are distractor-only: *Christmas Party*, *The Convention*, *Women's Appreciation*, *The Job*, *The Banker*.
- **Source:** the theoffice.fandom.com song list. Episode numbers come from the wiki infoboxes, which count two-parters as two episodes (e.g. Café Disco = S5 E27).
- **Inclusion rules:** songs played, performed, sung or hummed in an episode, using the original commercial recording. Parodies whose melody is the original (e.g. "Ryan Started the Fire") use the original song. **Excluded:** traditional or public-domain songs, classical pieces, TV themes and ad jingles, in-show originals with no release, deleted scenes, and songs only quoted or mentioned.
- **Multi-episode songs:** the answer is the episode where the song matters most; the rest go in `alsoIn`. Current cases: My Humps, Mambo No. 5, Sing, I Will Survive, Car Wash, Little Drummer Boy, Kind & Generous.
- **Song schema:** `{ id, title, artist, episodeId, alsoIn?, appleTrackId, previewUrl, artworkUrl, appleMusicUrl, notes }`. Every match was reviewed by hand to be the original studio recording (no live versions, remixes, re-recordings or covers). Where search only surfaced covers, the original was pinned by track ID.
- **Not on Apple:** "Christmas in Hollis", "Girls Gone Wild" (Captain Ahab), "Boy Hangover", and In-Flight Safety's "Big White Elephant" and "Model Homes".
- **Preview URLs** can change when Apple re-ingests a track. The player then looks up a fresh URL by `appleTrackId` once before swapping in a different song.
- **Episode descriptions** are original wording. No lyrics anywhere.

## Verified
- **iPhone (by the user):** the Apple-preview version loads and plays, and Share opens the native share sheet.
- **Node logic tests (27 passing):** scoring, clock pause and resume, skip, reveal, unplayable swap, `alsoIn` never offered as an option (2,000 generated questions), and the share-text format.
- **Data:** every song references a real episode, has a valid Apple preview and track ID, no duplicate tracks, and no `alsoIn` containing its own answer episode. All 185 preview and artwork URLs respond.
- **Desktop Chrome:** final screen layout and share text.

## Not yet verified
1. **The clipboard path on a desktop browser.** My test environment's browser window wasn't focused, so the clipboard was refused there.
