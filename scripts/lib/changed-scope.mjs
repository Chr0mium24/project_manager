export const FRONTEND_APPS = new Set(["web"]);

function getModuleName(filePath, prefix) {
  const parts = filePath.split("/");
  return parts[0] === prefix ? (parts[1] ?? null) : null;
}

function parsePorcelainPath(line) {
  const rawPath = line.slice(3).trim();
  if (rawPath.includes(" -> ")) {
    return rawPath.split(" -> ").at(-1) ?? rawPath;
  }

  return rawPath;
}

export function parseChangedPaths(porcelainOutput) {
  return porcelainOutput
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.length >= 4)
    .map(parsePorcelainPath)
    .sort();
}

export function classifyChangedPaths(paths) {
  const frontendApps = new Set();
  const backendApps = new Set();
  const sharedPackages = new Set();

  for (const filePath of paths) {
    const appName = getModuleName(filePath, "apps");
    if (appName !== null) {
      if (FRONTEND_APPS.has(appName)) {
        frontendApps.add(appName);
      } else {
        backendApps.add(appName);
      }
      continue;
    }

    const packageName = getModuleName(filePath, "packages");
    if (packageName !== null) {
      sharedPackages.add(packageName);
    }
  }

  return {
    frontendApps: [...frontendApps].sort(),
    backendApps: [...backendApps].sort(),
    sharedPackages: [...sharedPackages].sort()
  };
}

export function validateChangedScope(summary) {
  const failures = [];

  if (summary.frontendApps.length > 1) {
    failures.push(
      `changed frontend modules exceed limit: ${summary.frontendApps.join(", ")}`
    );
  }

  if (summary.backendApps.length > 1) {
    failures.push(
      `changed backend modules exceed limit: ${summary.backendApps.join(", ")}`
    );
  }

  if (summary.sharedPackages.length > 1) {
    failures.push(
      `changed shared packages exceed limit: ${summary.sharedPackages.join(", ")}`
    );
  }

  return failures;
}
