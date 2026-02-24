import { redirect } from "next/navigation"
import { cookies } from "next/headers"

export default function RootPage() {
  const session = cookies().get("session")
  if (session) redirect("/dashboard")
  else redirect("/login")
}
