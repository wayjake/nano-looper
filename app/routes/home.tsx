import { redirect } from "react-router";
import type { Route } from "./+types/home";
import { generateId } from "~/lib/uuid";
import { createRoom } from "~/db/rooms";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Nano Looper" },
    { name: "description", content: "A collaborative loop-based music DAW" },
  ];
}

export async function action({}: Route.ActionArgs) {
  const roomId = generateId();
  await createRoom(roomId);
  return redirect(`/r/${roomId}`);
}

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-white">
      <h1 className="text-4xl font-bold mb-8">Nano Looper</h1>
      <form method="post">
        <button
          type="submit"
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-lg font-medium transition-colors"
        >
          Create New Room
        </button>
      </form>
    </div>
  );
}
