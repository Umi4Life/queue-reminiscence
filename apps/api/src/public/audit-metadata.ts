import type { AppConfig } from "@queue-reminiscence/config";
import { createHmac } from "node:crypto";

import type { MutationRequestMeta } from "../queue/mutations";

function hashAuditValue(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

function readForwardedClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");

  if (!forwarded) {
    return null;
  }

  const first = forwarded.split(",")[0]?.trim();

  return first && first.length > 0 ? first : null;
}

export function buildMutationRequestMeta(request: Request, config: AppConfig): MutationRequestMeta {
  const ip = config.trustProxy ? readForwardedClientIp(request) : null;
  const userAgent = request.headers.get("user-agent");

  return {
    ipHash: ip ? hashAuditValue(ip, config.rateLimitHmacSecret) : null,
    userAgentHash: userAgent ? hashAuditValue(userAgent, config.rateLimitHmacSecret) : null,
  };
}
