import { type FastifyReply } from "fastify";

export function sendAdminApi(pathname: string, method: string, reply: FastifyReply): boolean {
  if (pathname !== "/api/admin/session" || method !== "POST") {
    return false;
  }

  void reply.code(200).send({
    ok: true
  });
  return true;
}
