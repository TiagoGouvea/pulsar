import type { HarnessConfig } from "../config/schema.js";
import { FakeExecutor } from "./fake.js";
import { PiExecutor } from "./pi.js";
import type { Executor } from "./types.js";

export function createExecutor(config: HarnessConfig): Executor {
  return config.execution.executor === "fake" ? new FakeExecutor() : new PiExecutor();
}
