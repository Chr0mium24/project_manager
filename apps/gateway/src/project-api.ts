import {
  listProjects,
  readProject
} from "@project-manager/project-core";
import { type FastifyReply } from "fastify";

export function sendProjectApi(rootDir: string, pathname: string, reply: FastifyReply): boolean {
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
  const project = readProject(rootDir, slug);
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
