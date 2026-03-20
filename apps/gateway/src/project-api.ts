import {
  deleteManagedProject,
  listProjects,
  readProject
} from "@project-manager/project-core";
import { type FastifyReply } from "fastify";

function buildProjectApiRecord(rootDir: string, slug: string) {
  const project = readProject(rootDir, slug);
  if (project === null) {
    return null;
  }

  return {
    ...project,
    path: `projects/${slug}`
  };
}

function sendProjectDeleteApi(
  rootDir: string,
  pathname: string,
  method: string,
  reply: FastifyReply
): boolean {
  const projectSlugMatch = pathname.match(/^\/api\/projects\/([a-z0-9-]+)$/);
  if (!projectSlugMatch || method !== "DELETE") {
    return false;
  }

  const slug = projectSlugMatch[1] ?? "";
  const project = deleteManagedProject(rootDir, slug);
  if (project === null) {
    void reply.code(404).send({
      error: "project-not-found",
      slug
    });
    return true;
  }

  void reply.code(200).send({ project });
  return true;
}

export function sendProjectApi(
  rootDir: string,
  pathname: string,
  method: string,
  reply: FastifyReply
): boolean {
  if (sendProjectDeleteApi(rootDir, pathname, method, reply)) {
    return true;
  }

  if (pathname === "/api/projects") {
    void reply.code(200).send({
      projects: listProjects(rootDir)
    });
    return true;
  }

  const projectSlugMatch = pathname.match(/^\/api\/projects\/([a-z0-9-]+)$/);
  if (!projectSlugMatch) {
    return false;
  }

  const slug = projectSlugMatch[1] ?? "";
  const project = buildProjectApiRecord(rootDir, slug);
  if (project === null) {
    void reply.code(404).send({
      error: "project-not-found",
      slug
    });
    return true;
  }

  void reply.code(200).send(project);
  return true;
}
