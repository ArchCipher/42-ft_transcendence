import { z } from "zod";
import { validationError } from "./validation";

type ApiResponse = Response;

export async function parseRequest<T>(
  request: Request,
  schema: {
    safeParse: (
      data: unknown,
    ) => { success: true; data: T } | { success: false; error: unknown };
  },
  extra: Record<string, unknown> = {},
): Promise<
  | { data: T; body: unknown; error?: never }
  | { data?: never; body?: never; error: ApiResponse }
> {
  // Content-Type check
  if (
    !(
      request.headers.get("content-type")?.split(";")[0].trim() ===
      "application/json"
    )
  ) {
    return {
      error: Response.json(
        { error: "Content-Type must be application/json" },
        { status: 415 },
      ),
    };
  }

  // JSON parsing
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return {
      error: Response.json({ error: "Invalid JSON body" }, { status: 400 }),
    };
  }

  // Schema validation (merge extra query params with body)
  const parsed = schema.safeParse({ ...body, ...extra });
  if (!parsed.success) {
    return {
      error: Response.json(
        {
          error: "Validation failed",
          fields: validationError(parsed.error as z.ZodError),
        },
        { status: 400 },
      ),
    };
  }

  return { data: parsed.data, body };
}
