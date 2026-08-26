import type { Task } from "@/lib/api";

export function isDone(task: Task): boolean {
  return task.status === "done";
}

/** A conditional task the user has confirmed doesn't apply to them — treated
 * like it's resolved: it shouldn't block anything and shouldn't be
 * recommended. */
export function isConditionNotApplicable(task: Task): boolean {
  return task.is_conditional && task.condition_status === "not_applicable";
}

/** Whether a task's own completion requirement is satisfied for the purpose
 * of unblocking whatever depends on it — either actually done, or a
 * conditional task confirmed not to apply. */
export function isSatisfied(task: Task): boolean {
  return isDone(task) || isConditionNotApplicable(task);
}

export function isBlocked(tasks: Task[], index: number): boolean {
  const task = tasks[index];
  return task.dependencies.some((depIndex) => !isSatisfied(tasks[depIndex]));
}

export function blockingCount(tasks: Task[], index: number): number {
  return tasks.filter((t) => t.dependencies.includes(index)).length;
}

export function computeLevels(tasks: Task[]): number[] {
  const levels = new Array(tasks.length).fill(-1);

  function levelOf(index: number, visiting: Set<number>): number {
    if (levels[index] !== -1) return levels[index];
    if (visiting.has(index)) return 0; // guard against a cyclic reference
    visiting.add(index);
    const deps = tasks[index].dependencies.filter((d) => d >= 0 && d < tasks.length);
    const level = deps.length === 0 ? 0 : Math.max(...deps.map((d) => levelOf(d, visiting))) + 1;
    levels[index] = level;
    return level;
  }

  tasks.forEach((_, index) => levelOf(index, new Set()));
  return levels;
}

/** The longest dependency chain end-to-end — the sequence of tasks that
 * actually gates completion, as opposed to work that could happen in
 * parallel. Walks backward from the deepest task, at each step following
 * whichever dependency has the greatest depth. */
export function computeCriticalPath(tasks: Task[]): number[] {
  if (tasks.length === 0) return [];
  const levels = computeLevels(tasks);

  let current = levels.reduce(
    (deepest, level, index) => (level > levels[deepest] ? index : deepest),
    0
  );

  const path = [current];
  const visited = new Set([current]);
  while (tasks[current].dependencies.length > 0) {
    const deps = tasks[current].dependencies.filter((d) => d >= 0 && d < tasks.length);
    if (deps.length === 0) break;
    current = deps.reduce((deepest, d) => (levels[d] > levels[deepest] ? d : deepest), deps[0]);
    if (visited.has(current)) break; // cyclic reference — stop instead of looping forever
    visited.add(current);
    path.push(current);
  }

  return path.reverse();
}

const PRIORITY_RANK: Record<Task["priority"], number> = { high: 0, medium: 1, low: 2 };

/** One factual, independently-translatable reason the scorer used to pick
 * this task, so the UI can render a transparent bulleted list instead of a
 * single vague sentence. */
export type ReasonItem =
  | { kind: "priority"; text: string }
  | { kind: "blocks"; count: number }
  | { kind: "no_prerequisites" }
  | { kind: "highest_priority"; readyCount: number };

export interface NextBestAction {
  task: Task;
  index: number;
  reasons: ReasonItem[];
  blocksCount: number;
  /** True when every unblocked task left is conditional — we don't know if
   * the condition holds for this user, so the UI should hedge ("if this
   * applies to you") rather than recommend it outright. */
  isConditionalPick: boolean;
}

export function getNextBestAction(tasks: Task[]): NextBestAction | null {
  const unblocked = tasks
    .map((task, index) => ({ task, index }))
    .filter(
      ({ task, index }) =>
        !isDone(task) && !isConditionNotApplicable(task) && !isBlocked(tasks, index)
    );

  if (unblocked.length === 0) return null;

  // Prefer a task everyone must do — we can't tell whether a conditional
  // task's condition (e.g. "only if your group has more than 4 members")
  // applies to this user, so recommending it as *the* next action would be
  // presumptuous. A task the user has already confirmed applies to them is
  // treated as unconditional from here on. Only fall back to an
  // unconfirmed conditional task if nothing else is available.
  const unconditional = unblocked.filter(
    ({ task }) => !task.is_conditional || task.condition_status === "applies"
  );
  const eligible = unconditional.length > 0 ? unconditional : unblocked;
  const isConditionalPick = unconditional.length === 0;

  eligible.sort((a, b) => {
    const priorityDiff = PRIORITY_RANK[a.task.priority] - PRIORITY_RANK[b.task.priority];
    if (priorityDiff !== 0) return priorityDiff;

    const blocksDiff = blockingCount(tasks, b.index) - blockingCount(tasks, a.index);
    if (blocksDiff !== 0) return blocksDiff;

    if (a.task.deadline && b.task.deadline) return a.task.deadline.localeCompare(b.task.deadline);
    if (a.task.deadline) return -1;
    if (b.task.deadline) return 1;
    return 0;
  });

  const best = eligible[0];
  const priorityReason = best.task.priority_reason || `${best.task.priority} priority`;
  const blocksN = blockingCount(tasks, best.index);

  const reasons: ReasonItem[] = [{ kind: "priority", text: priorityReason }];

  if (blocksN > 0 && !priorityReason.toLowerCase().includes("block")) {
    reasons.push({ kind: "blocks", count: blocksN });
  }

  const bestRank = PRIORITY_RANK[best.task.priority];
  const isTopPriority = eligible.every((e) => PRIORITY_RANK[e.task.priority] >= bestRank);
  if (isTopPriority && eligible.length > 1) {
    reasons.push({ kind: "highest_priority", readyCount: eligible.length });
  }

  if (best.task.dependencies.length === 0) {
    reasons.push({ kind: "no_prerequisites" });
  }

  return {
    task: best.task,
    index: best.index,
    reasons,
    blocksCount: blocksN,
    isConditionalPick,
  };
}
