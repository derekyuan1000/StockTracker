import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/android-auth")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const token = new URL(request.url).searchParams.get("token");
        const dest = token
          ? `stocktracker://auth-callback?token=${encodeURIComponent(token)}`
          : "stocktracker://auth-callback";
        return new Response(null, {
          status: 302,
          headers: { Location: dest },
        });
      },
    },
  },
});