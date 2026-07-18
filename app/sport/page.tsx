import { redirect } from "next/navigation";

// La sezione è /allenamento; /sport (nome del tab) rimanda lì per coerenza.
export default function SportRedirect() {
  redirect("/allenamento");
}
