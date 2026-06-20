import { auth } from "@/lib/auth";

export async function getRequestUser(request: { headers: Headers }) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user ?? null;
}
