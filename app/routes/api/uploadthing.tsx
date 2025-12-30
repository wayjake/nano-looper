import type { Route } from "./+types/uploadthing";
import { createRouteHandler } from "uploadthing/server";
import { uploadRouter } from "~/lib/uploadthing";

const handlers = createRouteHandler({
  router: uploadRouter,
});

// GET /api/uploadthing - Returns UploadThing config
export async function loader({ request }: Route.LoaderArgs) {
  return handlers(request);
}

// POST /api/uploadthing - Handles file uploads
export async function action({ request }: Route.ActionArgs) {
  return handlers(request);
}
