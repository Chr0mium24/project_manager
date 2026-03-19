import {
  publishStaticProject,
  type StaticPublishResult
} from "@project-manager/publish-core";
import { type FastifyReply } from "fastify";

interface StaticPublishPayload {
  result: StaticPublishResult;
}

export function sendPublishApi(rootDir: string, pathname: string, reply: FastifyReply): boolean {
  const publishStaticMatch = pathname.match(/^\/api\/publish\/static\/([a-z0-9-]+)$/);
  if (!publishStaticMatch) {
    return false;
  }

  const slug = publishStaticMatch[1] ?? "";
  try {
    const result = publishStaticProject(rootDir, slug);
    if (result === null) {
      void reply.code(404).send({
        error: "project-not-found",
        slug
      });
      return true;
    }

    const payload: StaticPublishPayload = { result };
    void reply.code(200).send(payload);
    return true;
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }

    void reply.code(400).send({
      error: "invalid-static-publish-target",
      slug,
      message: error.message
    });
    return true;
  }
}
