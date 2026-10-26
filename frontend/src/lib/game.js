// Tiny event bus so any component can report things the game cares about
// (résumé downloaded, theme switched…) without knowing the game exists.
export const GAME_EVENT = 'aakash:game'

export function emitGame(type, detail = {}) {
  window.dispatchEvent(new CustomEvent(GAME_EVENT, { detail: { type, ...detail } }))
}

// Each section is a level. `short` labels the HUD; `title` is the level-up banner.
export const LEVELS = [
  { id: 'top', short: 'Spawn point' },
  { id: 'about', short: "Who's this?", title: "Who's this guy?" },
  { id: 'experience', short: 'Day job', title: 'The day job' },
  { id: 'skills', short: 'Inventory', title: 'Inventory' },
  { id: 'projects', short: 'Quests', title: 'Main quests & side quests' },
  { id: 'achievements', short: 'Trophy room', title: 'Trophy room' },
  { id: 'contact', short: 'Say hello', title: 'Final level: say hello' },
]
