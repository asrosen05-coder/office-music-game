const MIN_EPISODES = 4;
const PREVIEW_URL = /^https:\/\/[a-z0-9.-]+\.apple\.com\//;

export async function loadData() {
  // no-cache = always revalidate, so a deploy never pairs new code with stale data (or vice versa).
  const [songsRes, episodesRes] = await Promise.all([
    fetch('data/songs.json', { cache: 'no-cache' }),
    fetch('data/episodes.json', { cache: 'no-cache' }),
  ]);
  if (!songsRes.ok || !episodesRes.ok) {
    throw new Error('Failed to fetch game data files.');
  }

  const songs = await songsRes.json();
  const episodes = await episodesRes.json();
  return validate(songs, episodes);
}

/** Episode problems are fatal (they break every question); a bad song is skipped with a warning. */
function validate(songs, episodes) {
  if (!Array.isArray(songs) || !Array.isArray(episodes)) {
    throw new Error('Game data is malformed (expected arrays).');
  }
  if (episodes.length < MIN_EPISODES) {
    throw new Error(`Need at least ${MIN_EPISODES} episodes, found ${episodes.length}.`);
  }

  const episodeIds = new Set();
  for (const ep of episodes) {
    if (episodeIds.has(ep.id)) throw new Error(`Duplicate episode id "${ep.id}".`);
    episodeIds.add(ep.id);
  }

  const songIds = new Set();
  const playable = songs.filter((song) => {
    const problem =
      songIds.has(song.id) ? 'duplicate id'
      : !episodeIds.has(song.episodeId) ? `unknown episodeId "${song.episodeId}"`
      : !PREVIEW_URL.test(song.previewUrl || '') ? 'no valid Apple preview URL'
      : !Number.isInteger(song.appleTrackId) ? 'no appleTrackId'
      : null;
    songIds.add(song.id);
    if (problem) console.warn(`Skipping song "${song.id}": ${problem}.`);
    return !problem;
  });

  if (playable.length < 1) {
    throw new Error('No playable songs found in dataset.');
  }
  return { songs: playable, episodes };
}

/** "S2 · E4" — compact, readable label for an episode. */
export function formatEpisodeCode(episode) {
  return `S${episode.season} · E${episode.episode}`;
}
