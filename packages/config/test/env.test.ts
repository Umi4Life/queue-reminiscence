import { describe, expect, test } from "bun:test";

import { ConfigError, parseEnv } from "../src/env";

const validEnv = {
  DATABASE_URL: "postgres://user:pass@localhost:5432/queue_reminiscence",
  PUBLIC_APP_URL: "http://localhost:5173",
  ADMIN_APP_URL: "http://localhost:5174",
  API_PUBLIC_BASE_URL: "http://localhost:3000/public",
  API_ADMIN_BASE_URL: "http://localhost:3000/admin",
  SESSION_SECRET: "change-me-in-development",
  TOKEN_HMAC_SECRET: "change-me-in-development",
  RATE_LIMIT_HMAC_SECRET: "change-me-in-development",
  TRUST_PROXY: "true",
  ADMIN_SESSION_TTL_DAYS: "14",
  PUBLIC_MUTATION_SESSION_TTL_HOURS: "24",
};

describe("parseEnv", () => {
  test("parses a valid environment into typed app config", () => {
    expect(parseEnv(validEnv)).toEqual({
      databaseUrl: validEnv.DATABASE_URL,
      publicAppUrl: validEnv.PUBLIC_APP_URL,
      adminAppUrl: validEnv.ADMIN_APP_URL,
      apiPublicBaseUrl: validEnv.API_PUBLIC_BASE_URL,
      apiAdminBaseUrl: validEnv.API_ADMIN_BASE_URL,
      sessionSecret: validEnv.SESSION_SECRET,
      tokenHmacSecret: validEnv.TOKEN_HMAC_SECRET,
      rateLimitHmacSecret: validEnv.RATE_LIMIT_HMAC_SECRET,
      trustProxy: true,
      adminSessionTtlDays: 14,
      publicMutationSessionTtlHours: 24,
    });
  });

  test("parses TRUST_PROXY case-insensitively as false", () => {
    expect(parseEnv({ ...validEnv, TRUST_PROXY: "FALSE" }).trustProxy).toBe(false);
  });

  test("throws a ConfigError listing missing and blank required values", () => {
    expect(() =>
      parseEnv({
        ...validEnv,
        DATABASE_URL: undefined,
        SESSION_SECRET: "   ",
        TOKEN_HMAC_SECRET: "",
      }),
    ).toThrow(ConfigError);

    expect(() =>
      parseEnv({
        ...validEnv,
        DATABASE_URL: undefined,
        SESSION_SECRET: "   ",
        TOKEN_HMAC_SECRET: "",
      }),
    ).toThrow(/DATABASE_URL, SESSION_SECRET, TOKEN_HMAC_SECRET/);
  });

  test("rejects invalid TRUST_PROXY values", () => {
    expect(() => parseEnv({ ...validEnv, TRUST_PROXY: "yes" })).toThrow(
      /TRUST_PROXY must be true or false/,
    );
  });

  test("rejects invalid TTL values", () => {
    expect(() => parseEnv({ ...validEnv, ADMIN_SESSION_TTL_DAYS: "0" })).toThrow(
      /ADMIN_SESSION_TTL_DAYS must be a positive integer/,
    );

    expect(() => parseEnv({ ...validEnv, PUBLIC_MUTATION_SESSION_TTL_HOURS: "1.5" })).toThrow(
      /PUBLIC_MUTATION_SESSION_TTL_HOURS must be a positive integer/,
    );
  });

  test("rejects invalid URLs", () => {
    expect(() => parseEnv({ ...validEnv, PUBLIC_APP_URL: "not a url" })).toThrow(
      /PUBLIC_APP_URL must be a valid URL/,
    );
  });
});
