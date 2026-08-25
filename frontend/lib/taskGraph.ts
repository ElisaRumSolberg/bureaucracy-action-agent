import type { Task } from "@/lib/api";

export function isDone(task: Task): boolean {
  return task.status === "done";
}

export function isBlocked(tasks: Task[], index: number): boolean {
  const task = tasks[index];
  return task.dependencies.some((depIndex) => !isDone(tasks[depIndex]));
}

export function blockingCount(tasks: Task[], index: number): number {
  return tasks.filter((t) => t.dependencies.includes(index)).length;
}

const PRIORITY_RANK: Record<Task["priority"], number> = { high: 0, medium: 1, low: 2 };

export interface NextBestAction {
  task: Task;
  index: number;
  /** priority_reason as-is, plus how many other tasks this one blocks — the
   * UI layer builds the final sentence so it can localize the join word and
   * the "blocks N tasks" phrase. */
  priorityReason: string;
  blocksCount: number;
  mentionsBlockingAlready: boolean;
}

export function getNextBestAction(tasks: Task[]): NextBestAction | null {
  const eligible = tasks
    .map((task, index) => ({ task, index }))
    .filter(({ task, index }) => !isDone(task) && !isBlocked(tasks, index));

  if (eligible.length === 0) return null;

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

  return {
    task: best.task,
    index: best.index,
    priorityReason,
    blocksCount: blockingCount(tasks, best.index),
    mentionsBlockingAlready: priorityReason.toLowerCase().includes("block"),
  };
}
