import {
  listDynamicPublishRecords,
  listStaticPublishRecords,
  publishDynamicProject,
  publishStaticProject,
  readDynamicPublishRecord,
  readStaticPublishRecord,
  type DynamicPublishResult,
  type StaticPublishResult
} from "@project-manager/publish-core";
import { type FastifyReply } from "fastify";

interface StaticPublishPayload {
  result: StaticPublishResult;
}

interface StaticPublishRecordPayload {
  result: StaticPublishResult;
}

interface StaticPublishListPayload {
  results: StaticPublishResult[];
}

interface DynamicPublishPayload {
  result: DynamicPublishResult;
}

interface DynamicPublishRecordPayload {
  result: DynamicPublishResult;
}

interface DynamicPublishListPayload {
  results: DynamicPublishResult[];
}

function sendDynamicPublishApi(rootDir: string, pathname: string, reply: FastifyReply): boolean {
  if (pathname === "/api/publish/dynamic") {
    const payload: DynamicPublishListPayload = {
      results: listDynamicPublishRecords(rootDir)
    };
    void reply.code(200).send(payload);
    return true;
  }

  const readPublishDynamicMatch = pathname.match(/^\/api\/publish\/dynamic\/([a-z0-9-]+)$/);
  if (readPublishDynamicMatch) {
    const slug = readPublishDynamicMatch[1] ?? "";
    const result = readDynamicPublishRecord(rootDir, slug);
    if (result === null) {
      void reply.code(404).send({
        error: "dynamic-publish-not-found",
        slug
      });
      return true;
    }

    const payload: DynamicPublishRecordPayload = { result };
    void reply.code(200).send(payload);
    return true;
  }

  return false;
}

function sendStaticPublishApi(rootDir: string, pathname: string, reply: FastifyReply): boolean {
  if (pathname === "/api/publish/static") {
    const payload: StaticPublishListPayload = {
      results: listStaticPublishRecords(rootDir)
    };
    void reply.code(200).send(payload);
    return true;
  }

  const readPublishStaticMatch = pathname.match(/^\/api\/publish\/static\/([a-z0-9-]+)$/);
  if (readPublishStaticMatch) {
    const slug = readPublishStaticMatch[1] ?? "";
    const result = readStaticPublishRecord(rootDir, slug);
    if (result === null) {
      void reply.code(404).send({
        error: "static-publish-not-found",
        slug
      });
      return true;
    }

    const payload: StaticPublishRecordPayload = { result };
    void reply.code(200).send(payload);
    return true;
  }

  return false;
}

export function sendPublishApi(rootDir: string, pathname: string, reply: FastifyReply): boolean {
  if (sendDynamicPublishApi(rootDir, pathname, reply)) {
    return true;
  }

  return sendStaticPublishApi(rootDir, pathname, reply);
}

export function sendPublishMutationApi(rootDir: string, pathname: string, reply: FastifyReply): boolean {
  const publishDynamicMatch = pathname.match(/^\/api\/publish\/dynamic\/([a-z0-9-]+)$/);
  if (publishDynamicMatch) {
    return sendDynamicPublish(rootDir, publishDynamicMatch[1] ?? "", reply);
  }

  const publishStaticMatch = pathname.match(/^\/api\/publish\/static\/([a-z0-9-]+)$/);
  if (!publishStaticMatch) {
    return false;
  }

  return sendStaticPublish(rootDir, publishStaticMatch[1] ?? "", reply);
}

function sendDynamicPublish(rootDir: string, slug: string, reply: FastifyReply): boolean {
  try {
    const result = publishDynamicProject(rootDir, slug);
    if (result === null) {
      void reply.code(404).send({
        error: "project-not-found",
        slug
      });
      return true;
    }

    const payload: DynamicPublishPayload = { result };
    void reply.code(200).send(payload);
    return true;
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }

    void reply.code(400).send({
      error: "invalid-dynamic-publish-target",
      slug,
      message: error.message
    });
    return true;
  }
}

function sendStaticPublish(rootDir: string, slug: string, reply: FastifyReply): boolean {
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
