import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  // Home page - creates room and redirects
  route("/", "routes/home.tsx", { index: true }),

  // Room page - DAW UI
  route("r/:roomId", "routes/room.tsx"),

  // Sample preview page
  route("preview", "routes/preview.tsx"),

  // API routes
  route("api/rooms/:roomId/sounds", "routes/api/rooms.$roomId.sounds.tsx"),
  route("api/sounds/:soundId", "routes/api/sounds.$soundId.tsx"),
  route("api/rooms/:roomId/save", "routes/api/rooms.$roomId.save.tsx"),
  route("api/rooms/:roomId/pads/:padIndex", "routes/api/rooms.$roomId.pads.$padIndex.tsx"),
  route("api/uploadthing", "routes/api/uploadthing.tsx"),
] satisfies RouteConfig;
