import { createServerFn } from "@tanstack/react-start";

/** Returns the browser-usable Google Maps key. Restrict it by HTTP referrer in Google Cloud. */
export const getMapsKey = createServerFn({ method: "GET" }).handler(async () => {
  return { key: process.env["GOOGLE_MAPS_API_KEY"] ?? "" };
});
