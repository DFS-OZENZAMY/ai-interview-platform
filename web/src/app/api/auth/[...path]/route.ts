import { NextRequest } from "next/server";
import { relay } from "@/lib/platform-relay";
type Ctx = { params: Promise<{ path: string[] }> };
const handle = async (request: NextRequest, { params }: Ctx) => relay(request, "/api/auth/" + (await params).path.join("/"));
export { handle as GET, handle as POST, handle as PUT, handle as DELETE };
