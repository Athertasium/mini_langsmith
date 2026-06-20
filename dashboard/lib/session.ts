import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function getRequestUser(request: { headers: Headers }) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user ?? null;
}

export async function getServerUser() {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  return session?.user ?? null;
}
