import { redirect } from "next/navigation";

// The old lessons list is retired — /learn owns this surface now.
// Any old link, bookmark, or history entry lands on /learn forever.
// The lesson player at /lessons/[id] is untouched.
export default function LessonsListRedirect() {
  redirect("/learn");
}
