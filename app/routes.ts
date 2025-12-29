import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  // Home page - creates room and redirects
  index("routes/home.tsx"),

  // Room page - DAW UI
  route("r/:roomId", "routes/room.tsx"),

  // API routes
  route("api/rooms/:roomId/sounds", "routes/api/rooms.$roomId.sounds.tsx"),
  route("api/sounds/:soundId", "routes/api/sounds.$soundId.tsx"),
  route("api/rooms/:roomId/save", "routes/api/rooms.$roomId.save.tsx"),
] satisfies RouteConfig;
