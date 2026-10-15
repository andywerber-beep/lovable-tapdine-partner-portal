// Demo dish presets for in-person pitches. Only usable by demo/test venues (enforced server-side).
export const PRESET_IMAGE_ORIGIN = "https://code-to-color-studio.lovable.app";

export const DEMO_PRESETS = [
  { id: "coffee-pastry", title: "Coffee & Fresh Morning Pastry", description: "Barista flat white with a warm, flaky butter croissant", price: 5.0 },
  { id: "sourdough-toastie", title: "Artisan Sourdough Toastie", description: "Toasted sourdough with ham and melting mature cheddar", price: 6.5 },
  { id: "smash-burger", title: "Smash Burger & Golden Fries", description: "Double smashed beef patty, cheese and pickles with crispy fries", price: 9.5 },
  { id: "avocado-eggs", title: "Avocado & Poached Eggs on Sourdough", description: "Smashed avocado, two poached eggs and chilli flakes on toasted sourdough", price: 7.5 },
  { id: "tea-cake", title: "Speciality Tea & Cake Slice", description: "Pot of loose-leaf tea with a slice of Victoria sponge", price: 4.5 },
] as const;

export type DemoPresetId = (typeof DEMO_PRESETS)[number]["id"];

export const presetImagePath = (id: string) => `/presets/${id}.jpg`;

/** Demo / Test Kitchen venues unlock pitch tools. */
export const isDemoVenueName = (name: string | null | undefined) => /\b(demo|test)\b/i.test(name ?? "");
