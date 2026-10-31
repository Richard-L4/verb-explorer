/*
 * Configures request middleware: functions that wrap server request handling.
 * TanStack Start runs these before route/server-function responses; error-page.ts
 * provides a friendly fallback, while CSRF checks protect browser server-function calls.
 */
import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";

// async/await lets this wrapper wait for downstream work and catch rejected requests.
const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
// Public API routes (Stripe webhooks etc.) must never be session- or
// CSRF-checked: Stripe posts unauthenticated, cross-origin requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => {
    const pathname = new URL(ctx.request.url).pathname;
    if (pathname === "/api/public/stripe-webhook") return false;
    return ctx.handlerType === "serverFn";
  },
});

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware, csrfMiddleware],
}));
