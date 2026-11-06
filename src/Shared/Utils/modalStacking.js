/**
 * Stacked pop-ups (2026-10-29).
 *
 * The app opens windows on top of other windows (quick actions on the
 * AlephTelos home -> product -> "create a process" / "create a category").
 * Bootstrap gives every modal the same z-index (1055), lower than the quick
 * action layer (2000), so a window opened from inside it was hidden behind
 * it while its invisible backdrop blocked the page ("frozen" screen).
 *
 * startModalStacking() watches <body> and gives each Bootstrap backdrop and
 * modal a growing z-index in the order they were opened, starting above
 * every custom layer of the app: the newest window is always on top and
 * dims the one below it. Closing it shows the previous one unchanged.
 */
const BASE_Z_INDEX = 2100;
const STEP = 10;

function restack() {
  let level = 0;
  Array.from(document.body.children).forEach((element) => {
    if (element.classList.contains("modal-backdrop") || element.classList.contains("modal")) {
      element.style.zIndex = String(BASE_Z_INDEX + level * STEP);
      level += 1;
    }
  });
}

/** Starts the watcher once; returns a function that stops it. */
export function startModalStacking() {
  if (typeof window === "undefined" || typeof window.MutationObserver === "undefined" || !document.body) {
    return () => {};
  }
  const observer = new MutationObserver(restack);
  observer.observe(document.body, { childList: true });
  restack();
  return () => observer.disconnect();
}
