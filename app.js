import { app, errorHandler } from "mu";
import { isAfter } from "date-fns/isAfter";
import Task, { JOB_STATUSES, TASK_TYPE_REGLEMENT_PUBLISH } from "./models/task";
import { DECISION_FOLDER, RS_FOLDER } from "./constants";
import Template from "./models/template";
import TemplateVersion from "./models/template-version";
import DocumentContainer from "./models/document-container";
import { validateUser } from "./middleware";

app.use(validateUser);

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
      involves: documentContainer.currentVersion.uri,
      taskType: TASK_TYPE_REGLEMENT_PUBLISH,
    });
    res.json({
      data: {
        id: publishingTask.id,
        attributes: {
          status: publishingTask.status,
          type: publishingTask.type,
        },
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
    await publishingTask.updateStatus(JOB_STATUSES.busy);

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
      const validThrough = template.currentVersion.validThrough;
      if (!validThrough || isAfter(validThrough, Date.now())) {
        await template.currentVersion.markAsExpired();
      }
    }
    await template.setCurrentVersion(templateVersion);
    await publishingTask.updateStatus(JOB_STATUSES.success);
  } catch (err) {
    console.log(err);
    publishingTask.updateStatus(JOB_STATUSES.failure, err.message);
  }
});

app.use(errorHandler);
