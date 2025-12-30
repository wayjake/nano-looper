import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  // Home page - creates room and redirects
  route("/", "routes/home.tsx", { index: true }),

  // Room layout with child routes
  route("r/:roomId", "routes/room.tsx", [
    index("routes/room._index.tsx"),
    route("add-sounds", "routes/room.add-sounds.tsx"),
  ]),

  // Sample preview page (standalone, for development)
  route("preview", "routes/preview.tsx"),

  // API routes
  route("api/rooms/:roomId/sounds", "routes/api/rooms.$roomId.sounds.tsx"),
  route("api/sounds/:soundId", "routes/api/sounds.$soundId.tsx"),
  route("api/rooms/:roomId/save", "routes/api/rooms.$roomId.save.tsx"),
  route("api/rooms/:roomId/pads/:padIndex", "routes/api/rooms.$roomId.pads.$padIndex.tsx"),
  route("api/uploadthing", "routes/api/uploadthing.tsx"),
] satisfies RouteConfig;
