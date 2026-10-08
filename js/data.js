const MIN_EPISODES = 4;
const PREVIEW_URL = /^https:\/\/[a-z0-9.-]+\.apple\.com\//;

export async function loadData() {
  const [songsRes, episodesRes] = await Promise.all([
    fetch('data/songs.json'),
    fetch('data/episodes.json'),
  ]);
  if (!songsRes.ok || !episodesRes.ok) {
    throw new Error('Failed to fetch game data files.');
  }

  const songs = await songsRes.json();
  const episodes = await episodesRes.json();
  validate(songs, episodes);
  return { songs, episodes };
}

function validate(songs, episodes) {
  if (!Array.isArray(songs) || !Array.isArray(episodes)) {
    throw new Error('Game data is malformed (expected arrays).');
  }
  if (episodes.length < MIN_EPISODES) {
    throw new Error(`Need at least ${MIN_EPISODES} episodes, found ${episodes.length}.`);
  }
  if (songs.length < 1) {
    throw new Error('No songs found in dataset.');
  }

  const episodeIds = new Set();
  for (const ep of episodes) {
    if (episodeIds.has(ep.id)) throw new Error(`Duplicate episode id "${ep.id}".`);
    episodeIds.add(ep.id);
  }

  const songIds = new Set();
  for (const song of songs) {
    if (songIds.has(song.id)) throw new Error(`Duplicate song id "${song.id}".`);
    songIds.add(song.id);
    if (!episodeIds.has(song.episodeId)) {
      throw new Error(`Song "${song.id}" references unknown episodeId "${song.episodeId}".`);
    }
    if (!PREVIEW_URL.test(song.previewUrl || '')) {
      throw new Error(`Song "${song.id}" has no valid Apple preview URL.`);
    }
    if (!Number.isInteger(song.appleTrackId)) {
      throw new Error(`Song "${song.id}" has no appleTrackId.`);
    }
  }
}

/** "S2 · E4" — compact, readable label for an episode. */
export function formatEpisodeCode(episode) {
  return `S${episode.season} · E${episode.episode}`;
}
