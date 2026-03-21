import { describe, expect, it } from "vitest";
import { parseAiEventStream } from "../src/app/project-manager-ai-event-stream.ts";

describe("parseAiEventStream", () => {
  it("parses codex json event streams into timeline entries", () => {
    const stdout = [
      "{\"type\":\"thread.started\",\"thread_id\":\"session-1\"}",
      "{\"type\":\"turn.started\"}",
      "{\"type\":\"item.completed\",\"item\":{\"type\":\"agent_message\",\"text\":\"First line\\nSecond line\"}}",
      "{\"type\":\"item.completed\",\"item\":{\"type\":\"command_execution\",\"command\":\"pwd\",\"aggregated_output\":\"/tmp/demo\\n\",\"exit_code\":0}}",
      "{\"type\":\"item.completed\",\"item\":{\"type\":\"file_change\",\"changes\":[{\"path\":\"src/index.html\",\"kind\":\"add\"}]}}",
      "{\"type\":\"turn.completed\"}"
    ].join("\n");

    expect(parseAiEventStream(stdout)).toEqual([
      { title: "Thread started", body: ["session-1"], details: [], autoCollapsed: false, tone: "neutral" },
      { title: "Turn started", body: [], details: [], autoCollapsed: false, tone: "neutral" },
      { title: "AI", body: ["First line", "Second line"], details: [], autoCollapsed: false, tone: "success" },
      { title: "Command finished", body: ["pwd", "exit 0"], details: ["/tmp/demo"], autoCollapsed: true, tone: "neutral" },
      { title: "Files changed", body: ["add src/index.html"], details: [], autoCollapsed: false, tone: "neutral" },
      { title: "Turn ended", body: [], details: [], autoCollapsed: false, tone: "success" }
    ]);
  });

  it("returns null when stdout is not a json event stream", () => {
    expect(parseAiEventStream("step 1\nstep 2\n")).toBeNull();
  });

  it("captures stream error and failed turn events", () => {
    const stdout = [
      "{\"type\":\"error\",\"message\":\"stream disconnected\"}",
      "{\"type\":\"turn.failed\",\"error\":{\"message\":\"request failed\"}}"
    ].join("\n");

    expect(parseAiEventStream(stdout)).toEqual([
      { title: "Stream issue", body: ["stream disconnected"], details: [], autoCollapsed: false, tone: "error" },
      { title: "Turn ended", body: ["request failed"], details: [], autoCollapsed: false, tone: "error" }
    ]);
  });
});
