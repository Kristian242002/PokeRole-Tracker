import { redirect } from "next/navigation";
import { currentUser } from "@/auth";

/** "/" → I miei Pokémon se loggato, altrimenti login (§10). */
export default async function HomePage() {
  redirect((await currentUser()) ? "/pokemon/miei" : "/login");
}
