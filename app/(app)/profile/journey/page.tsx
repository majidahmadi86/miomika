import { redirect } from "next/navigation";

export default function ProfileJourneyRedirect() {
  redirect("/me/journey");
}
