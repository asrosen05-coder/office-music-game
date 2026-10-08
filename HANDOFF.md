# Handoff: Name That Episode (Office Music Quiz)

**Repo:** `C:\Projects\Office Music Game\office-music-game`. Nothing is committed yet; all files are untracked.

## What this is
A mobile-first, client-side-only web game. You hear a 30s clip of a song that played in an episode of *The Office* (US), then pick the episode from 4 options. A game is 10 random songs with 1 skip and 1 song reveal. There's no backend and no score persistence. Audio streams from each song's official YouTube upload through the IFrame Player API.

## Run it
```
python -m http.server 8765      # then open http://localhost:8765
```
- **Open it at `localhost`, not `127.0.0.1`.** YouTube returns error 150 (embedding refused) for every video when the page origin is `127.0.0.1`. This was verified in-browser. In production, any real domain works.
- `file://` won't work because `fetch()` of the JSON files fails there.

## Architecture (vanilla HTML/CSS/JS, ES modules, no build step)
```
index.html        all screens (start / question / final / error), popover, result + quit sheets, SVG icon symbols
css/styles.css    tokens (light + dark), type scale, layout, components, reduced-motion / -transparency / -contrast
js/data.js        fetch + validate songs/episodes (dup ids, dangling refs, youtubeId format, clip window)
js/quiz.js        pure rules, no DOM: scoring, options, scoring clock (start/pause/resume), outcomes, unplayable swap
js/player.js      YouTube wrapper: clip window enforcement, blocked/paused/ended detection, replay
js/motion.js      spring solver (Apple response/damping params), momentum projection, rubber-band, count-up, haptics
js/sheet.js       bottom sheet: 1:1 drag, interruptible, velocity handoff, projection-based dismiss
js/ui.js          all DOM rendering
js/app.js         flow controller wiring data + player + quiz + ui
```

## Rules (unchanged from the original spec)
- 4 options: 1 correct + 3 random distinct episodes. Each option has an ⓘ button that opens an original 1–2 sentence description.
- Score = `200 + 800 · 0.5^(t/8)`: 1000 for an instant answer, 600 at 8s, ~540 at 10s, floors near 200. Wrong = 0. Skip = 0, counted separately. (The half-life was 4s originally and doubled after playtesting.)
- **Song reveal:** once per game, it shows the current song's title and artist (never the episode) in the Now Playing card. It's free; the final recap marks revealed songs.
- The scoring clock starts on the **first** YouTube `PLAYING` event only. It freezes while the tab is backgrounded or the End Quiz sheet is open.
- Answers stay disabled until the clip actually starts, so you can't score 1000 by tapping before the audio plays.

## Design (Apple HIG-inspired)
- System font with size-specific tracking. Rounded numerals for scores. Semantic light/dark color tokens.
- The YouTube player is the Now Playing card's background, blurred to an unreadable ambient glow. When the browser blocks autoplay, or playback is paused, that iframe becomes the tap target. A tap *inside* the iframe is what unlocks audio on iOS.
- The result sheet springs up and reveals the song and episode while the clip keeps playing. Drag it down (flick or slow drag, decided by projected momentum) or tap Next.
- The ⓘ popover grows out of its button. Press feedback fires on pointer-down. Haptics on answer (Android only).
- Live "pts available" counter, segmented progress bar (green/red/gray per result), and a Replay button after the clip ends (the score clock keeps running).
- Final screen: score count-up, Office-themed rank, stat tiles, and a per-song recap.

## Bugs fixed from the original build
- The scoring clock reset on **every** `PLAYING` event (any resume or retry gave points back). It now starts once per question.
- The clip timer kept running while backgrounded. The app now pauses audio and clock together.
- If the YouTube API never loaded, `init()` hung and the Play button never got wired. Now there's a 10s timeout and an error screen.
- An unplayable video silently shortened the quiz. It's now swapped for an unused song; after 3 failures in a row the app stops with an explanation instead of draining the song pool.
- YouTube's `endSeconds` can leak a stale ENDED event into the next clip, which made the next song play past its window. The clip window is now enforced by the app, and only events for the current video count.
- The old "primer" (mute → play → pause on an empty player) did nothing and was removed. Unlocking comes from loading the first clip inside the Play tap, with the in-iframe tap as fallback.

## Data
- **34 songs across 34 episodes, seasons 1–9.** Sourced from the theoffice.fandom.com song list. Episode numbers come from the fandom wiki infoboxes, which count two-parters as two episodes (e.g. Café Disco = S5 E27).
- **Every song is unique to one episode in the set**, so each question has exactly one right answer. "My Humps" was dropped because it recurs as Michael's ringtone in six episodes; "The Longest Time" replaced it for *Michael's Birthday*. "Kind & Generous" also appears briefly in *The Job*, which is deliberately left out of the episode set.
- All `youtubeId`s are official artist, label, VEVO, or auto-generated Topic uploads. "Kickstart My Heart" was moved off an unofficial reupload.
- Every ID was confirmed embeddable through oEmbed and by loading it in a real IFrame player on `localhost`. All 34 loaded without errors; 26 were probed one by one and the rest played during real games.
- Every clip is 30s (`clipDurationSeconds`), and every start + 30s fits inside its video.
- `startSeconds` are **estimates** and haven't been listened to. They're the most likely thing to need tuning.
- Episode descriptions are original wording. No lyrics anywhere.

## Verified (live, desktop Chrome, real YouTube audio)
Start → Play autoplays song 1; songs 2–10 autoplay after Next. Live points drain. Correct, wrong, and skip all work. The clip stops at its boundary and Replay works. Popover position is correct. Drag-to-dismiss advances. The End Quiz sheet pauses and resumes the clock correctly. The final screen and Play Again work. Dark mode was checked. Logic tests for `quiz.js` pass (scoring, clock pause/resume, skip, unplayable swap).

## Not yet verified
1. **A real iPhone with Safari.** This is the most important remaining test. Expect the first clip to need a tap on the card ("Tap to play"), with later clips autoplaying. Also check the sheet drag and safe areas.
2. Listening through each clip to tune `startSeconds` so each lands on a recognizable hook.
3. Nothing is committed to git yet.
