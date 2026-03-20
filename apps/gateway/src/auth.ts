import { type FastifyReply, type FastifyRequest } from "fastify";

export interface GatewayAuthOptions {
  adminToken?: string | null | undefined;
}

export interface GatewayAuthConfig {
  adminToken: string | null;
}

function readAuthorizationHeader(request: FastifyRequest): string | null {
  const headerValue = request.headers.authorization;
  if (typeof headerValue !== "string" || headerValue.length === 0) {
    return null;
  }

  return headerValue;
}

function readBearerToken(request: FastifyRequest): string | null {
  const headerValue = readAuthorizationHeader(request);
  if (headerValue === null || !headerValue.startsWith("Bearer ")) {
    return null;
  }

  const token = headerValue.slice("Bearer ".length).trim();
  return token.length === 0 ? null : token;
}

export function resolveGatewayAuthConfig(options?: GatewayAuthOptions): GatewayAuthConfig {
  return {
    adminToken: options?.adminToken ?? process.env.PROJECT_MANAGER_ADMIN_TOKEN ?? null
  };
}

export function requiresAdminAuth(pathname: string, method: string): boolean {
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return false;
  }

  return pathname.startsWith("/api/projects")
    || pathname.startsWith("/api/admin")
    || pathname.startsWith("/api/publish")
    || pathname.startsWith("/api/ai");
}

export function sendAdminAuthRejection(
  authConfig: GatewayAuthConfig,
  pathname: string,
  request: FastifyRequest,
  reply: FastifyReply
): boolean {
  if (!requiresAdminAuth(pathname, request.method)) {
    return false;
  }

  if (authConfig.adminToken === null) {
    void reply.code(503).send({
      error: "auth-not-configured"
    });
    return true;
  }

  if (readBearerToken(request) === authConfig.adminToken) {
    return false;
  }

  void reply.header("www-authenticate", 'Bearer realm="project-manager"').code(401).send({
    error: "unauthorized"
  });
  return true;
}
