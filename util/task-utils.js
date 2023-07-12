import Task from "../models/task";

/**
 * @param {string} documentContainerUri
 * @param {string} taskType
 * */
export async function ensureTask(documentContainerUri, taskType) {
  let task = await Task.query({reglementUri: documentContainerUri, taskType});

  if (!task) {
    task = await Task.create(documentContainerUri, taskType);
  }

  return task;
}
