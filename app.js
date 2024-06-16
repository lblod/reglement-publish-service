import { app, errorHandler } from "mu";
import Task, {
  TASK_STATUS_FAILURE,
  TASK_STATUS_RUNNING,
  TASK_STATUS_SUCCESS,
  TASK_TYPE_REGLEMENT_PUBLISH,
  TASK_TYPE_SNIPPET_PUBLISH,
} from "./models/task";
import {
  getEditorDocument,
  getPublishedVersion,
  getSnippetList,
  hasPublishedVersion,
} from "./util/common-sparql";
import {
  insertPublishedSnippetContainer,
  updatePublishedSnippetContainer,
} from "./util/snippet-sparql";
import { DECISION_FOLDER, RS_FOLDER } from "./constants";
import Template from "./models/template";
import TemplateVersion from "./models/template-version";
import DocumentContainer from "./models/document-container";

app.post("/publish-template/:documentContainerId", async (req, res, next) => {
  const documentContainerId = req.params.documentContainerId;
  let publishingTask, documentContainer;
  try {
    documentContainer = await DocumentContainer.query({
      id: documentContainerId,
    });
    if (!documentContainer) {
      throw new Error(`Provided document container not found`);
    }
    publishingTask = await Task.ensure({
      involves: documentContainer.uri,
      taskType: TASK_TYPE_REGLEMENT_PUBLISH,
    });
    res.json({
      data: {
        id: publishingTask.id,
        status: publishingTask.status,
        type: publishingTask.type,
      },
    });
  } catch (err) {
    console.log(err);
    const error = new Error(
      `An error occurred while publishing the template for document-container with id ${documentContainerId}: ${err}`,
    );
    return next(error);
  }
  try {
    await publishingTask.updateStatus(TASK_STATUS_RUNNING);

    const templateType =
      documentContainer.folder === DECISION_FOLDER
        ? "decision"
        : documentContainer.folder === RS_FOLDER
          ? "regulatory-statement"
          : null;
    if (!templateType) {
      throw new Error(
        `Provided document container does not belong to a decision or regulatory statement template`,
      );
    }

    const templateVersion = await TemplateVersion.create({
      derivedFrom: documentContainer.currentVersion.uri,
      title: documentContainer.currentVersion.title,
      content: documentContainer.currentVersion.content,
    });
    const template = await Template.ensure({
      documentContainerUri: documentContainer.uri,
      templateType,
    });
    if (template.currentVersion) {
      await template.currentVersion.markAsExpired();
    }
    await template.setCurrentVersion(templateVersion);
    await publishingTask.updateStatus(TASK_STATUS_SUCCESS);
  } catch (err) {
    console.log(err);
    publishingTask.updateStatus(TASK_STATUS_FAILURE, err.message);
  }
});

app.post("/snippet-list-publication-tasks", async (req, res, next) => {
  const documentContainerUuid =
    req.body.data.relationships["document-container"].data.id;
  const snippetListUuid = req.body.data.relationships["snippet-list"].data.id;

  let publishingTask;

  try {
    const editorDocument = await getEditorDocument(documentContainerUuid);
    const documentContainerUri = editorDocument.documentContainer.value;

    publishingTask = await Task.ensure({
      involves: documentContainerUri,
      taskType: TASK_TYPE_SNIPPET_PUBLISH,
    });

    await publishingTask.updateStatus(TASK_STATUS_RUNNING);
    const publishedVersionResults =
      await getPublishedVersion(documentContainerUri);
    const snippetList = await getSnippetList(snippetListUuid);

    if (hasPublishedVersion(publishedVersionResults)) {
      await updatePublishedSnippetContainer({
        ...snippetList,
        ...editorDocument,
        publishedVersionResults,
        publishingTaskUri: publishingTask.uri,
      });
    } else {
      await insertPublishedSnippetContainer({
        ...snippetList,
        ...editorDocument,
        publishingTaskUri: publishingTask.uri,
      });
    }

    await publishingTask.updateStatus(TASK_STATUS_SUCCESS);

    res.json({
      data: {
        id: publishingTask.id,
        status: "accepted",
        type: publishingTask.type,
      },
    });
  } catch (error) {
    console.log(error);
    if (publishingTask) {
      publishingTask.updateStatus(TASK_STATUS_FAILURE, error.message);
    }
    next(error);
  }
});

app.get("/tasks/:id", async function (req, res) {
  const taskId = req.params.id;
  const task = await Task.find(taskId);
  if (task) {
    res.status(200).send({
      data: {
        id: task.id,
        status: task.status,
        type: task.type,
      },
    });
  } else {
    res.status(404).send(`task with id ${taskId} was not found`);
  }
});

app.use(errorHandler);
