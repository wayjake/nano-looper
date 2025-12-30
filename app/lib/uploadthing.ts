import { createUploadthing, type FileRouter } from "uploadthing/server";
import { z } from "zod";
import { getRoom } from "~/db/rooms";
import { createSound } from "~/db/sounds";

const f = createUploadthing();

export const uploadRouter = {
  audioUploader: f({
    audio: { maxFileSize: "16MB", maxFileCount: 1 },
  })
    .input(z.object({ roomId: z.string() }))
    .middleware(async ({ input }) => {
      // Validate room exists and not expired
      const room = await getRoom(input.roomId);
      if (!room) {
        throw new Error("Room not found or expired");
      }
      return { roomId: input.roomId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // Save sound metadata to DB
      const sound = await createSound({
        roomId: metadata.roomId,
        name: file.name,
        mimeType: file.type,
        size: file.size,
        url: file.ufsUrl,
      });
      return { soundId: sound.id };
    }),
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;
