import { cookies } from "next/headers";
import { COOKIE, sessionFromToken } from "@/lib/server";
import Chat from "./chat";
import Login from "./login";

export const dynamic = "force-dynamic";

export default async function Home() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!sessionFromToken(token)) return <Login />;
  return <Chat />;
}
