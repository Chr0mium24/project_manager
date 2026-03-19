export function handler(context) {
  return {
    ok: true,
    service: "service-b",
    runtimePath: context.runtimePath,
    method: context.method,
    query: context.query,
    body: context.body
  };
}
