import {app, sparqlEscapeString, sparqlEscapeUri, sparqlEscapeDateTime, errorHandler, uuid} from 'mu';
import {querySudo as query, updateSudo as update} from '@lblod/mu-auth-sudo';
import fs from 'fs';
import Task, {
  TASK_STATUS_FAILURE,
  TASK_STATUS_RUNNING,
  TASK_STATUS_SUCCESS,
  TASK_TYPE_REGLEMENT_PUBLISH,
  TASK_TYPE_SNIPPET_PUBLISH
} from './models/task';
import {ensureTask} from './util/task-utils';

const getPublishedVersion = async (documentContainerUri) => {
  const publishedVersionQuery = `
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
      PREFIX pav: <http://purl.org/pav/>
      PREFIX prov: <http://www.w3.org/ns/prov#>
      SELECT ?publishedContainer ?currentVersion
      WHERE {
        ?publishedContainer prov:derivedFrom ${sparqlEscapeUri(documentContainerUri)}.
        ?publishedContainer  pav:hasCurrentVersion ?currentVersion.
      }
    `;

  return await query(publishedVersionQuery);
};

const hasPublishedVersion = (publishedVersionResults) => publishedVersionResults.results.bindings[0] && publishedVersionResults.results.bindings[0].publishedContainer;

const deletePublishedVersion = async (publishedVersionResults) => {
  const publishedContainerUri = publishedVersionResults.results.bindings[0].publishedContainer.value;

  const deleteCurrentVersionQuery = `
        PREFIX pav: <http://purl.org/pav/>
        DELETE WHERE {
          GRAPH <http://mu.semte.ch/graphs/public> {
            ${sparqlEscapeUri(publishedContainerUri)} pav:hasCurrentVersion ?currentVersion.
          }
        }
      `;

  await update(deleteCurrentVersionQuery);
};

app.post('/regulatory-attachment-publication-tasks', async (req, res, next) => {
  let documentContainerUri;
  let editorDocumentUri;
  let template;
  let publishingTask;
  let title;
  try {
    const reglementUuid = req.body.data.relationships['document-container'].data.id;
    var myQuery = `
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
      PREFIX pav: <http://purl.org/pav/>
      PREFIX dct: <http://purl.org/dc/terms/>
      SELECT ?content ?documentContainer ?editorDocument ?graph ?title
      WHERE {
        GRAPH ?graph {
          ?documentContainer mu:uuid ${sparqlEscapeString(reglementUuid)};
            pav:hasCurrentVersion ?editorDocument.
          ?editorDocument ext:editorDocumentTemplateVersion ?content.
          ?editorDocument dct:title ?title.
        }
      }
    `;
    const result = await query(myQuery);
    const bindings = result.results.bindings[0];
    template = bindings.content.value;
    documentContainerUri = bindings.documentContainer.value;
    editorDocumentUri = bindings.editorDocument.value;
    title = bindings.title.value;

    publishingTask = await ensureTask(documentContainerUri, TASK_TYPE_REGLEMENT_PUBLISH);

    res.json({data: {id: publishingTask.id, status: "accepted", type: publishingTask.type}});
  } catch (err) {
    console.log(err);
    const error = new Error(
      `An error occurred while publishing the reglement ${
        req.params.uuid
      }: ${err}`
    );
    return next(error);
  }
  try {
    await publishingTask.updateStatus(TASK_STATUS_RUNNING);

    // Create a new file in the share folder with the template
    const fileUuid = uuid();
    const fileName = `${fileUuid}.html`;
    const filePath = `/share/${fileName}`;
    fs.writeFileSync(filePath, template);
    const fileSize = fs.statSync(filePath).size;
    const physicalFileUuid = uuid();
    const physicalFileUri = `share://${fileName}`;

    const publishedVersionResults = await getPublishedVersion(documentContainerUri);

    let insertPublishedVersionQuery;

    if (hasPublishedVersion(publishedVersionResults)) {
      const publishedContainerUri = publishedVersionResults.results.bindings[0].publishedContainer.value;
      const currentVersionUri = publishedVersionResults.results.bindings[0].currentVersion.value;
      const publishedRegulatoryAttachmentUuid = uuid();
      const publishedRegulatoryAttachmentUri = `http://data.lblod.info/published-regulatory-attachment/${publishedRegulatoryAttachmentUuid}`;
      const now = new Date();

      await deletePublishedVersion(publishedVersionResults);

      insertPublishedVersionQuery = `
        PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
        PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
        PREFIX pav: <http://purl.org/pav/>
        PREFIX nfo: <http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#>
        PREFIX nie: <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#>
        PREFIX dct: <http://purl.org/dc/terms/>
        PREFIX dbpedia: <http://dbpedia.org/ontology/>
        PREFIX prov: <http://www.w3.org/ns/prov#>
        PREFIX gn: <http://data.lblod.info/vocabularies/gelinktnotuleren/>
        PREFIX schema: <http://schema.org/>
        INSERT DATA {
          GRAPH <http://mu.semte.ch/graphs/public> {
            ${sparqlEscapeUri(publishingTask.uri)} ext:publishedVersion ${sparqlEscapeUri(publishedRegulatoryAttachmentUri)}.
            ${sparqlEscapeUri(publishedContainerUri)} pav:hasCurrentVersion ${sparqlEscapeUri(publishedRegulatoryAttachmentUri)}.
            ${sparqlEscapeUri(publishedContainerUri)} pav:hasVersion ${sparqlEscapeUri(publishedRegulatoryAttachmentUri)}.
            ${sparqlEscapeUri(currentVersionUri)} schema:validThrough ${sparqlEscapeDateTime(now)}.
            ${sparqlEscapeUri(publishedRegulatoryAttachmentUri)} a gn:ReglementaireBijlageTemplateVersie.
            ${sparqlEscapeUri(publishedRegulatoryAttachmentUri)} a nfo:FileDataObject;
              mu:uuid ${sparqlEscapeString(publishedRegulatoryAttachmentUuid)};
              dct:title ${sparqlEscapeString(title)};
              pav:previousVersion ${sparqlEscapeUri(currentVersionUri)};
              nfo:fileName ${sparqlEscapeString(fileName)};
              dct:format ${sparqlEscapeString('application/html')};
              nfo:fileSize ${fileSize};
              dbpedia:extension ${sparqlEscapeString('html')};
              nfo:fileCreated ${sparqlEscapeDateTime(now)};
              prov:derivedFrom ${sparqlEscapeUri(editorDocumentUri)}.
            ${sparqlEscapeUri(physicalFileUri)} a nfo:FileDataObject;
              mu:uuid ${sparqlEscapeString(physicalFileUuid)};
              nfo:fileName ${sparqlEscapeString(fileName)};
              dct:format ${sparqlEscapeString('application/html')};
              nfo:fileSize ${fileSize};
              dbpedia:extension ${sparqlEscapeString('html')};
              nfo:fileCreated ${sparqlEscapeDateTime(now)};
              nie:dataSource ${sparqlEscapeUri(publishedRegulatoryAttachmentUri)}.
          }
        }
      `;
    } else {
      const publishedRegulatoryAttachmentContainerUuid = uuid();
      const publishedRegulatoryAttachmentContainerUri = `http://data.lblod.info/published-regulatory-attachment-container/${publishedRegulatoryAttachmentContainerUuid}`;
      const publishedRegulatoryAttachmentUuid = uuid();
      const publishedRegulatoryAttachmentUri = `http://data.lblod.info/published-regulatory-attachment/${publishedRegulatoryAttachmentUuid}`;
      const now = new Date();
      //Little hack we insert the publishedVersion uri in both graphs to use it in the frontend with the organization graph and in the publisher with the public graph
      insertPublishedVersionQuery = `
        PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
        PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
        PREFIX pav: <http://purl.org/pav/>
        PREFIX nfo: <http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#>
        PREFIX nie: <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#>
        PREFIX dct: <http://purl.org/dc/terms/>
        PREFIX dbpedia: <http://dbpedia.org/ontology/>
        PREFIX prov: <http://www.w3.org/ns/prov#>
        PREFIX gn: <http://data.lblod.info/vocabularies/gelinktnotuleren/>
        INSERT DATA {
          GRAPH <http://mu.semte.ch/graphs/public> {
            ${sparqlEscapeUri(publishingTask.uri)} ext:publishedVersion ${sparqlEscapeUri(publishedRegulatoryAttachmentUri)}.
            ${sparqlEscapeUri(publishedRegulatoryAttachmentContainerUri)} a gn:ReglementaireBijlageTemplate;
              mu:uuid ${sparqlEscapeString(publishedRegulatoryAttachmentContainerUuid)};
              pav:hasCurrentVersion ${sparqlEscapeUri(publishedRegulatoryAttachmentUri)};
              pav:hasVersion ${sparqlEscapeUri(publishedRegulatoryAttachmentUri)};
              prov:derivedFrom ${sparqlEscapeUri(documentContainerUri)}.
            ${sparqlEscapeUri(publishedRegulatoryAttachmentUri)} a gn:ReglementaireBijlageTemplateVersie.
            ${sparqlEscapeUri(publishedRegulatoryAttachmentUri)} a nfo:FileDataObject;
              mu:uuid ${sparqlEscapeString(publishedRegulatoryAttachmentUuid)};
              dct:title ${sparqlEscapeString(title)};
              nfo:fileName ${sparqlEscapeString(fileName)};
              dct:format ${sparqlEscapeString('application/html')};
              nfo:fileSize ${fileSize};
              dbpedia:fileExtension ${sparqlEscapeString('html')};
              nfo:fileCreated ${sparqlEscapeDateTime(now)};
              prov:derivedFrom ${sparqlEscapeUri(editorDocumentUri)}.
            ${sparqlEscapeUri(physicalFileUri)} a nfo:FileDataObject;
              mu:uuid ${sparqlEscapeString(physicalFileUuid)};
              nfo:fileName ${sparqlEscapeString(fileName)};
              dct:format ${sparqlEscapeString('application/html')};
              nfo:fileSize ${fileSize};
              dbpedia:fileExtension ${sparqlEscapeString('html')};
              nfo:fileCreated ${sparqlEscapeDateTime(now)};
              nie:dataSource ${sparqlEscapeUri(publishedRegulatoryAttachmentUri)}.
          }
        }
      `;
    }

    await query(insertPublishedVersionQuery);
    await publishingTask.updateStatus(TASK_STATUS_SUCCESS);
  } catch (err) {
    console.log(err);
    publishingTask.updateStatus(TASK_STATUS_FAILURE, err.message);
  }
});

app.get('/regulatory-attachment-publication-tasks/:id', async function (req, res) {
  const taskUuid = req.params.id;
  const task = await Task.find(taskUuid);
  if (task) {
    res.status(200).send({
      data: {
        id: task.id,
        status: task.status,
        type: task.type,
        taskType: task.type,
        relationships: {
          "regulatory-attachment": task.regulatoryAttachmentPublication,
        }
      }
    });
  } else {
    res.status(404).send(`task with id ${taskUuid} was not found`);
  }
});

/**
 * @param {string} documentContainerUuid
 */
const getEditorDocument = async (documentContainerUuid) => {
  const documentContainerQuery = `
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
      PREFIX pav: <http://purl.org/pav/>
      PREFIX dct: <http://purl.org/dc/terms/>
      SELECT ?documentContainer ?editorDocument ?graph ?title ?content
      WHERE {
        GRAPH ?graph {
          ?documentContainer mu:uuid ${sparqlEscapeString(documentContainerUuid)};
            pav:hasCurrentVersion ?editorDocument.
          ?editorDocument dct:title ?title ;
              ext:editorDocumentContent ?content ;
              pav:createdOn ?createdOn .
        }
      }
    `;

  const result = await query(documentContainerQuery);
  return result.results.bindings[0];
};


const insertPublishedSnippetContainer = async ({
  documentContainer,
  editorDocument,
  title,
  content,
  publishingTaskUri
}) => {
  const snippetContainerUuid = uuid();
  const snippetContainerUri = `http://lblod.data.gift/published-snippet-containers/${snippetContainerUuid}`;

  const snippetUuid = uuid();
  const publishedSnippetUri = `http://lblod.data.gift/published-snippets/${snippetUuid}`;
  const now = new Date();

  const insertPublishedVersionQuery = `
        PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
        PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
        PREFIX pav: <http://purl.org/pav/>
        PREFIX dct: <http://purl.org/dc/terms/>
        PREFIX prov: <http://www.w3.org/ns/prov#>
        INSERT DATA {
          GRAPH <http://mu.semte.ch/graphs/public> {
            ${sparqlEscapeUri(publishingTaskUri)} ext:publishedVersion ${sparqlEscapeUri(publishedSnippetUri)}.
            ${sparqlEscapeUri(snippetContainerUri)} a ext:PublishedSnippetContainer;
              mu:uuid ${sparqlEscapeString(snippetContainerUuid)};
              pav:hasCurrentVersion ${sparqlEscapeUri(publishedSnippetUri)};
              pav:hasVersion ${sparqlEscapeUri(publishedSnippetUri)};
              prov:derivedFrom ${sparqlEscapeUri(documentContainer.value)}.
            ${sparqlEscapeUri(publishedSnippetUri)} a ext:PublishedSnippet;
              mu:uuid ${sparqlEscapeString(snippetUuid)};
              dct:title ${sparqlEscapeString(title.value)};
              ext:editorDocumentContent ${sparqlEscapeString(content.value)};
              pav:createdOn ${sparqlEscapeDateTime(now)};
              prov:derivedFrom ${sparqlEscapeUri(editorDocument.value)}.
          }
        }
      `;

  await update(insertPublishedVersionQuery);
};

const updatePublishedSnippetContainer = async ({
  editorDocument,
  title,
  content,
  publishingTaskUri,
  publishedVersionResults,
}) => {
  await deletePublishedVersion(publishedVersionResults);

  const publishedContainerUri = publishedVersionResults.results.bindings[0].publishedContainer.value;

  const snippetUuid = uuid();
  const publishedSnippetUri = `http://lblod.data.gift/published-snippets/${snippetUuid}`;
  const now = new Date();

  const updatePublishedVersionQuery = `
        PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
        PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
        PREFIX pav: <http://purl.org/pav/>
        PREFIX dct: <http://purl.org/dc/terms/>
        PREFIX prov: <http://www.w3.org/ns/prov#>
        INSERT DATA {
          GRAPH <http://mu.semte.ch/graphs/public> {
            ${sparqlEscapeUri(publishingTaskUri)} ext:publishedVersion ${sparqlEscapeUri(publishedSnippetUri)}.
            ${sparqlEscapeUri(publishedContainerUri)} pav:hasCurrentVersion ${sparqlEscapeUri(publishedSnippetUri)}.
            ${sparqlEscapeUri(publishedContainerUri)} pav:hasVersion ${sparqlEscapeUri(publishedSnippetUri)}.
            ${sparqlEscapeUri(publishedSnippetUri)} a ext:PublishedSnippet;
              mu:uuid ${sparqlEscapeString(snippetUuid)};
              dct:title ${sparqlEscapeString(title.value)};
              ext:editorDocumentContent ${sparqlEscapeString(content.value)};
              pav:createdOn ${sparqlEscapeDateTime(now)};
              prov:derivedFrom ${sparqlEscapeUri(editorDocument.value)}.
          }
        }
      `;

  await update(updatePublishedVersionQuery);
};


app.post('/snippet-list-publication-tasks', async (req, res, next) => {
  const documentContainerUuid = req.body.data.relationships['document-container'].data.id;

  let publishingTask;

  try {
    const editorDocument = await getEditorDocument(documentContainerUuid);
    const documentContainerUri = editorDocument.documentContainer.value;

    const publishingTask = await ensureTask(documentContainerUri, TASK_TYPE_SNIPPET_PUBLISH);

    await publishingTask.updateStatus(TASK_STATUS_RUNNING);
    const publishedVersionResults = await getPublishedVersion(documentContainerUri);

    if (hasPublishedVersion(publishedVersionResults)) {
      await updatePublishedSnippetContainer({
        ...editorDocument,
        publishedVersionResults,
        publishingTaskUri: publishingTask.uri
      });
    } else {
      await insertPublishedSnippetContainer({...editorDocument, publishingTaskUri: publishingTask.uri});
    }

    await publishingTask.updateStatus(TASK_STATUS_SUCCESS);

    res.json({data: {id: publishingTask.id, status: "accepted", type: publishingTask.type}});
  } catch (error) {
    console.log(error);
    if (publishingTask) {
      publishingTask.updateStatus(TASK_STATUS_FAILURE, error.message);
    }
    next(error);
  }
});

app.get('/snippet-list-publication-tasks/:id', async function (req, res) {
  const taskUuid = req.params.id;
  const task = await Task.find(taskUuid);

  if (task) {
    res.status(200).send({
      data: {
        id: task.id,
        status: task.status,
        type: task.type,
        taskType: task.type,
        relationships: {
          "document-container": task.regulatoryAttachmentPublication,
        }
      }
    });
  } else {
    res.status(404).send(`task with id ${taskUuid} was not found`);
  }
});


app.use(errorHandler);
