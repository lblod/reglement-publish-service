import Task from "../models/task";

/**
 * @param meeting
 * @param {string} taskType
 * @param {string} [userUri]
 * */
export async function ensureTask(reglementUri, userUri) {
  let task = userUri
    ? await Task.query({ reglementUri: reglementUri, userUri })
    : await Task.query({ reglementUri: reglementUri });
  if (!task) {
    task = await Task.create(meeting, taskType);
  }
  return task;
}
