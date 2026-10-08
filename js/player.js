// YouTube IFrame Player wrapper. The player lives inside the Now Playing card as a heavily
// blurred ambient layer — never legible — and becomes directly tappable only when the
// browser blocks programmatic playback (iOS), since a tap inside the iframe is what unlocks audio.

const API_TIMEOUT_MS = 10000;
const BLOCKED_AFTER_MS = 2500;
const END_POLL_MS = 250;

let player = null;
let readyPromise = null;
let handlers = {};
let clip = null;
let blockedTimer = null;
let endPoll = null;
let ended = false;

function loadApi() {
  return new Promise((resolve, reject) => {
    if (window.YT && window.YT.Player) return resolve(window.YT);
    const timer = setTimeout(() => reject(new Error('YouTube API timed out')), API_TIMEOUT_MS);
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      clearTimeout(timer);
      if (previous) previous();
      resolve(window.YT);
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.onerror = () => {
      clearTimeout(timer);
      reject(new Error('YouTube API failed to load'));
    };
    document.head.appendChild(script);
  });
}

export function initPlayer(elementId) {
  if (readyPromise) return readyPromise;
  readyPromise = loadApi().then((YT) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('YouTube player timed out')), API_TIMEOUT_MS);
    player = new YT.Player(elementId, {
      width: '100%',
      height: '100%',
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        iv_load_policy: 3,
        playsinline: 1, // mandatory: stops iOS from forcing fullscreen video
        rel: 0,
      },
      events: {
        onReady: () => {
          clearTimeout(timer);
          const iframe = player.getIframe();
          iframe.setAttribute('tabindex', '-1');
          iframe.setAttribute('title', 'Audio player');
          resolve();
        },
        onStateChange,
        onError: (e) => {
          clearTimers();
          if (handlers.onError) handlers.onError(e.data);
        },
      },
    });
  }));
  return readyPromise;
}

export function isReady() {
  return !!(player && player.loadVideoById);
}

/** Loads and plays a clip. Callbacks: onPlaying, onBuffering, onEnded, onBlocked, onError. */
export function playClip(nextClip, callbacks) {
  clearTimers();
  clip = nextClip;
  handlers = callbacks || {};
  ended = false;
  // No endSeconds: the embed can leak a stale ENDED from the previous clip into the next
  // one. The clip window is enforced by startEndPoll instead.
  player.loadVideoById({ videoId: clip.videoId, startSeconds: clip.start });
  blockedTimer = setTimeout(() => {
    const s = safeState();
    if (s !== YT.PlayerState.PLAYING && s !== YT.PlayerState.BUFFERING && handlers.onBlocked) {
      handlers.onBlocked();
    }
  }, BLOCKED_AFTER_MS);
}

export function replay() {
  if (clip) playClip(clip, handlers);
}

function onStateChange(e) {
  const S = YT.PlayerState;
  if (e.data === S.PLAYING) {
    clearTimeout(blockedTimer);
    startEndPoll();
    if (handlers.onPlaying) handlers.onPlaying();
  } else if (e.data === S.BUFFERING) {
    if (handlers.onBuffering) handlers.onBuffering();
  } else if (e.data === S.PAUSED) {
    clearInterval(endPoll);
    // our own end-of-clip pause also lands here; that's reported as ended, not paused
    if (!ended && isCurrentVideo() && handlers.onPaused) handlers.onPaused();
  } else if (e.data === S.ENDED && isCurrentVideo()) {
    finish(); // the video itself ran out before the clip window did
  }
}

function isCurrentVideo() {
  try {
    if (!clip) return false;
    const data = player.getVideoData && player.getVideoData();
    if (data && data.video_id) return data.video_id === clip.videoId;
    return (player.getVideoUrl() || '').includes(clip.videoId);
  } catch (err) {
    return false;
  }
}

function startEndPoll() {
  clearInterval(endPoll);
  endPoll = setInterval(() => {
    if (clip && isCurrentVideo() && currentTime() >= clip.start + clip.duration) {
      pause();
      finish();
    }
  }, END_POLL_MS);
}

function finish() {
  clearInterval(endPoll);
  if (ended) return;
  ended = true;
  if (handlers.onEnded) handlers.onEnded();
}

export function hasEnded() {
  return ended;
}

/** 0…1 through the current clip. */
export function clipProgress() {
  if (!clip) return 0;
  if (ended) return 1;
  if (!isCurrentVideo()) return 0;
  const p = (currentTime() - clip.start) / clip.duration;
  return Math.min(1, Math.max(0, p));
}

export function stop() {
  clearTimers();
  handlers = {};
  clip = null;
  try {
    if (player) player.stopVideo();
  } catch (err) { /* player not ready */ }
}

export function pause() {
  try {
    if (player) player.pauseVideo();
  } catch (err) { /* player not ready */ }
}

export function resume() {
  if (ended) return;
  try {
    if (player) player.playVideo();
  } catch (err) { /* player not ready */ }
}

function currentTime() {
  try {
    return player.getCurrentTime() || 0;
  } catch (err) {
    return 0;
  }
}

function safeState() {
  try {
    return player.getPlayerState();
  } catch (err) {
    return -1;
  }
}

function clearTimers() {
  clearTimeout(blockedTimer);
  clearInterval(endPoll);
}
