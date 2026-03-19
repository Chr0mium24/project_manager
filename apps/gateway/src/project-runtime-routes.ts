import {
  readProject,
  readProjectEntry
} from "@project-manager/project-core";
import { readPublishedStaticEntry } from "@project-manager/publish-core";
import { type FastifyReply } from "fastify";

export function sendStaticProject(rootDir: string, pathname: string, reply: FastifyReply): boolean {
  const staticProjectMatch = pathname.match(/^\/p\/([a-z0-9-]+)(?:\/.*)?$/);
  if (!staticProjectMatch) {
    return false;
  }

  const slug = staticProjectMatch[1] ?? "";
  const project = readProject(rootDir, slug);
  const entryContent = readPublishedStaticEntry(rootDir, slug) ?? readProjectEntry(rootDir, slug);

  if (project === null || project.runtime !== "static" || entryContent === null) {
    void reply.code(404).send({
      error: "static-project-not-found",
      slug
    });
    return true;
  }

  void reply
    .code(200)
    .header("content-type", "text/html; charset=utf-8")
    .send(entryContent);
  return true;
}

export function sendDynamicProject(rootDir: string, pathname: string, reply: FastifyReply): boolean {
  const dynamicProjectMatch = pathname.match(/^\/app\/([a-z0-9-]+)(?:\/.*)?$/);
  if (!dynamicProjectMatch) {
    return false;
  }

  const slug = dynamicProjectMatch[1] ?? "";
  const project = readProject(rootDir, slug);
  if (project === null || project.runtime !== "dynamic") {
    void reply.code(404).send({
      error: "dynamic-project-not-found",
      slug
    });
    return true;
  }

  void reply.code(200).send({
    slug: project.slug,
    runtime: project.runtime,
    route: project.route,
    entry: project.entry,
    framework: project.framework
  });
  return true;
}
