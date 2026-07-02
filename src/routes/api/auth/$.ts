import { createAPIFileRoute } from "@tanstack/react-start/api";
import { auth } from "@/server/auth";

export const APIRoute = createAPIFileRoute("/api/auth/$")({
  GET: ({ request }) => auth.handler(request),
  POST: ({ request }) => auth.handler(request),
});
