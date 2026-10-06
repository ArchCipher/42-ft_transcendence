import { describe, it, expect } from "vitest";
import { z } from "zod";
import { parseRequest } from "../../lib/auth/parse-request";
import { loginSchema } from "../../lib/auth/validation";

function makeRequest(
  body: string | null,
  contentType: string | null = "application/json",
): Request {
  return new Request("http://localhost/api/test", {
    method: "POST",
    headers: contentType === null ? {} : { "content-type": contentType },
    body: body === null ? undefined : body,
  });
}

async function expectError(promise: Promise<unknown>) {
  const result = await promise;
  if (!("error" in (result as object))) {
    throw new Error("expected an error response");
  }
  return (result as { error: Response }).error;
}

describe("parseRequest content-type enforcement", () => {
  it("returns 415 when Content-Type is missing", async () => {
    const res = await expectError(
      parseRequest(makeRequest("{}", null), loginSchema),
    );
    expect(res.status).toBe(415);
    expect((await res.json()).error).toBe("Content-Type must be application/json");
  });

  it("returns 415 for a non-JSON content type", async () => {
    const res = await expectError(
      parseRequest(makeRequest("{}", "text/plain"), loginSchema),
    );
    expect(res.status).toBe(415);
  });

  it("accepts a JSON content type with parameters", async () => {
    const result = await parseRequest(
      makeRequest(
        '{"email":"a@example.com","password":"somepassword123"}',
        "application/json; charset=utf-8",
      ),
      loginSchema,
    );
    expect("data" in result).toBe(true);
    expect("error" in result).toBe(false);
  });
});

describe("parseRequest JSON parsing", () => {
  it("returns 400 for an unparseable body", async () => {
    const res = await expectError(
      parseRequest(makeRequest("not json{"), loginSchema),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid JSON body");
  });
});

describe("parseRequest schema validation", () => {
  it("returns 400 + per-field errors when validation fails", async () => {
    const res = await expectError(
      parseRequest(
        makeRequest('{"email":"bad","password":"x"}'),
        loginSchema,
      ),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
    expect(Array.isArray(body.fields.email)).toBe(true);
    expect(Array.isArray(body.fields.password)).toBe(true);
  });

  it("returns parsed data and the raw body on success", async () => {
    const result = await parseRequest(
      makeRequest('{"email":"a@example.com","password":"somepassword123"}'),
      loginSchema,
    );
    expect("data" in result).toBe(true);
    if ("data" in result) {
      expect(result.data).toEqual({
        email: "a@example.com",
        password: "somepassword123",
      });
      expect(result.body).toEqual(result.data);
    }
  });
});

describe("parseRequest extra context merge", () => {
  const schema = z.object({ a: z.string(), b: z.number() });

  it("merges server-derived values in before validation", async () => {
    const result = await parseRequest(
      makeRequest('{"a":"x"}'),
      schema,
      { b: 5 },
    );
    expect("data" in result).toBe(true);
    if ("data" in result) expect(result.data).toEqual({ a: "x", b: 5 });
  });

  it("fails when extra merges produce an invalid object", async () => {
    const res = await expectError(
      parseRequest(makeRequest('{"a":"x"}'), schema, { b: "nope" }),
    );
    expect(res.status).toBe(400);
  });
});
