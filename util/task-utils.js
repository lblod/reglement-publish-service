import Task from "../models/task";

/**
 * @param {string} involves
 * @param {string} taskType
 * */
export async function ensureTask(involves, taskType) {
  let task = await Task.query({involves: involves, taskType});

  if (!task) {
    task = await Task.create(involves, taskType);
  }

  return task;
}
