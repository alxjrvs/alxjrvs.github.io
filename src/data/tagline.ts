// The rollable hero tagline: "<subject>. I make <object>."
//
// Clicking the die spins both labels (slot-machine style) and lands on a
// random pair. The FIRST item of each list is what renders before any roll
// (and with JS off).

export const subjects = [
  "Enthusiast",
  "Engineer",
  "Tinkerer",
  "Generalist",
  "Optimist",
  "Dabbler",
  "Hobbyist",
  "Craftsperson",
  "Nerd",
  "Romantic",
  "Completionist",
  "Maximalist",
  "Game Master",
  "Overthinker",
  "Collector",
  "Archivist",
  "Goblin",
  "Superfan",
  "Night owl",
  "Homebrewer",
  "Daydreamer",
  "Weirdo",
  "Contrarian",
  "Fiddler",
  "Grungler",
];

// A rare first-slot roll (about 1 in `rareOdds`), never shown while the reel
// spins. It brings its own full stop.
export const rareSubject = "Undiagnosed, but, come on.";
export const rareOdds = 50;

export const objects = [
  "stuff",
  "things",
  "tools",
  "games",
  "dice",
  "systems",
  "worlds",
  "toys",
  "trouble",
  "too much",
  "side projects",
  "rabbit holes",
  "little machines",
  "contraptions",
  "companion apps",
  "rules engines",
  "spreadsheets",
  "shortcuts",
  "excuses",
  "inside jokes",
  "bad ideas",
  "weird websites",
  "side quests",
  "card tools",
  "my own fun",
];
