import { createFileRoute } from "@tanstack/react-router";
import { handleV1 } from "@/server/api/router";
import "@/server/api/register";

export const Route = createFileRoute("/api/v1/$")({
  server: {
    handlers: {
      GET: ({ request }) => handleV1(request),
      POST: ({ request }) => handleV1(request),
      PUT: ({ request }) => handleV1(request),
      PATCH: ({ request }) => handleV1(request),
      DELETE: ({ request }) => handleV1(request),
    },
  },
});
