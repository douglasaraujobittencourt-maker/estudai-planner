import { useEffect, useState } from "react";

// Global background timer store. Lives at module scope so it keeps running
// while the user navigates between routes; localStorage persists across reloads.

const KEY = "planner-timer-v1";
const DEFAULT_DURATION = 30 * 60;

type State = {
  duration: number;     // seconds — user's target (informational)
  running: boolean;
  startedAt: number | null; // ms when current run started
  accumulated: number;  // seconds accumulated across pauses
};

function load(): State {
  if (typeof window === "undefined") {
    return { duration: DEFAULT_DURATION, running: false, startedAt: null, accumulated: 0 };
  }
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as State;
  } catch {}
  return { duration: DEFAULT_DURATION, running: false, startedAt: null, accumulated: 0 };
}

let state: State = load();
const listeners = new Set<() => void>();

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
}
function emit() {
  persist();
  listeners.forEach((l) => l());
}

export function getElapsedSec(s: State = state): number {
  const base = s.accumulated;
  if (s.running && s.startedAt != null) {
    return base + Math.floor((Date.now() - s.startedAt) / 1000);
  }
  return base;
}

export const studyTimer = {
  get(): State { return state; },
  start() {
    if (state.running) return;
    state = { ...state, running: true, startedAt: Date.now() };
    emit();
  },
  pause() {
    if (!state.running) return;
    const elapsed = getElapsedSec(state);
    state = { ...state, running: false, startedAt: null, accumulated: elapsed };
    emit();
  },
  reset() {
    state = { ...state, running: false, startedAt: null, accumulated: 0 };
    emit();
  },
  setDuration(sec: number) {
    const d = Math.max(60, Math.round(sec));
    state = { ...state, duration: d };
    emit();
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  },
};

// Cross-tab sync
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY || !e.newValue) return;
    try { state = JSON.parse(e.newValue); listeners.forEach((l) => l()); } catch {}
  });
}

export function useStudyTimer() {
  const [, force] = useState(0);
  useEffect(() => studyTimer.subscribe(() => force((n) => n + 1)), []);
  // 1Hz tick while running so remaining/elapsed update
  useEffect(() => {
    if (!state.running) return;
    const id = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [state.running]);

  const elapsed = getElapsedSec(state);
  const remaining = Math.max(0, state.duration - elapsed);
  return {
    duration: state.duration,
    running: state.running,
    elapsed,
    remaining,
    start: studyTimer.start,
    pause: studyTimer.pause,
    reset: studyTimer.reset,
    setDuration: studyTimer.setDuration,
  };
}
