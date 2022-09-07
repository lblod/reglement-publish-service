import { app, sparqlEscapeString, sparqlEscapeUri, sparqlEscapeDateTime, errorHandler, uuid } from 'mu';
import { querySudo as query, updateSudo as update } from '@lblod/mu-auth-sudo';
import fs from 'fs';
import Task, { 
  TASK_STATUS_FAILURE,
  TASK_STATUS_RUNNING,
  TASK_STATUS_SUCCESS
} from './models/task';
import { ensureTask } from './util/task-utils';

app.get('/preview/regulatory-attachment/:uuid', async (req,res) => {
  const reglementUuid = req.params.uuid;
  var myQuery = `
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    PREFIX pav: <http://purl.org/pav/>
    PREFIX nfo: <http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#>
    SELECT ?filename
    WHERE {
      ?reglement mu:uuid ${sparqlEscapeString(reglementUuid)}.
      ?reglement ext:publishedVersion ?publishedContainer .
      ?publishedContainer  ext:currentVersion ?currentVersion.
      ?currentVersion ext:content ?virtualFile.
      ?virtualFile nfo:fileName ?filename.
    }
  `;
  const result = await query(myQuery);
  const bindings = result.results.bindings[0];
  const filename = bindings.filename.value;
  const filePath = `/share/${filename}`;
  const content = fs.readFileSync(filePath, {encoding:'utf8', flag:'r'});
  res.json({content});
});


app.post('/publish/regulatory-attachment/:uuid', async (req,res, next) => {
  let reglementUri;
  let template;
  let publishingTask;
  let graphUri;
  try {
    const reglementUuid = req.params.uuid;
    var myQuery = `
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
      PREFIX pav: <http://purl.org/pav/>
      SELECT ?content ?reglement ?graph
      WHERE {
        GRAPH ?graph {
          ?reglement mu:uuid ${sparqlEscapeString(reglementUuid)};
            ext:hasDocumentContainer ?documentContainer.
          ?documentContainer pav:hasCurrentVersion ?editorDocument.
          ?editorDocument ext:editorDocumentTemplateVersion ?content.
        }
      }
    `;
    const result = await query(myQuery);
    const bindings = result.results.bindings[0];
    template = bindings.content.value;
    graphUri = bindings.graph.value;
    reglementUri = bindings.reglement.value;
    publishingTask = await ensureTask(reglementUri);
    res.json({ data: { id: publishingTask.id, status: "accepted" , type: publishingTask.type}});
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
    var publishedVersionQuery = `
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
      PREFIX pav: <http://purl.org/pav/>
      SELECT ?publishedContainer ?currentVersion
      WHERE {
        ${sparqlEscapeUri(reglementUri)} ext:publishedVersion ?publishedContainer .
        ?publishedContainer  ext:currentVersion ?currentVersion.
      }
    `;
    
    const fileUuid = uuid();
    const fileName = `${fileUuid}.html`;
    const filePath = `/share/${fileName}`;
    fs.writeFileSync(filePath, template);
    const fileSize = fs.statSync(filePath).size;
    const virtualFileUuid = uuid();
    const virtualFileUri = `http://data.lblod.info/files/${virtualFileUuid}`;
    const physicalFileUri = `share://${fileName}`;
    const publishedVersionResults = await query(publishedVersionQuery);
    let insertPublishedVersionQuery;
    if(publishedVersionResults.results.bindings[0] && publishedVersionResults.results.bindings[0].publishedContainer) {
      const publishedContainerUri = publishedVersionResults.results.bindings[0].publishedContainer.value;
      const currentVersionUri = publishedVersionResults.results.bindings[0].currentVersion.value;
      const publishedRegulatoryAttachmentUuid = uuid();
      const publishedRegulatoryAttachmentUri = `http://data.lblod.info/published-regulatory-attachment/${publishedRegulatoryAttachmentUuid}`;
      const now = new Date();
      const deleteCurrentVersionQuery = `
        PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
        DELETE WHERE {
          ${sparqlEscapeUri(publishedContainerUri)} ext:currentVersion ?currentVersion.
        }
      `;

      await update(deleteCurrentVersionQuery);

      insertPublishedVersionQuery = `
        PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
        PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
        PREFIX pav: <http://purl.org/pav/>
        PREFIX nfo: <http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#>
        PREFIX nie: <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#>
        PREFIX dct: <http://purl.org/dc/terms/>
        PREFIX dbpedia: <http://dbpedia.org/ontology/>
        INSERT DATA {
          GRAPH <http://mu.semte.ch/graphs/public> {
            ${sparqlEscapeUri(publishedContainerUri)} ext:currentVersion ${sparqlEscapeUri(publishedRegulatoryAttachmentUri)}.
            ${sparqlEscapeUri(publishedRegulatoryAttachmentUri)} a ext:PublishedRegulatoryAttachment;
              ext:content ${sparqlEscapeUri(virtualFileUri)};
              pav:createdOn ${sparqlEscapeDateTime(now)};
              pav:lastUpdateOn ${sparqlEscapeDateTime(now)};
              pav:previousVersion ${sparqlEscapeUri(currentVersionUri)};
              ext:container  ${sparqlEscapeUri(publishedContainerUri)}.
            ${sparqlEscapeUri(virtualFileUri)} a nfo:FileDataObject;
              mu:uuid ${sparqlEscapeString(virtualFileUuid)};
              nfo:fileName ${sparqlEscapeString(fileName)};
              dct:format ${sparqlEscapeString('application/html')};
              nfo:fileSize ${fileSize};
              dbpedia:fileExtension ${sparqlEscapeString('html')};
              dct:created ${sparqlEscapeDateTime(now)};
              nie:dataSource ${sparqlEscapeUri(physicalFileUri)}.
            ${sparqlEscapeUri(physicalFileUri)} a nfo:FileDataObject;
              mu:uuid ${sparqlEscapeString(virtualFileUuid)};
              nfo:fileName ${sparqlEscapeString(fileName)};
              dct:format ${sparqlEscapeString('application/html')};
              nfo:fileSize ${fileSize};
              dbpedia:fileExtension ${sparqlEscapeString('html')};
              dct:created ${sparqlEscapeDateTime(now)}.
          }
        }
      `;
    } else {
      const publishedRegulatoryAttachmentContainerUuid = uuid();
      const publishedRegulatoryAttachmentContainerUri = `http://data.lblod.info/published-regulatory-attachment-container/${publishedRegulatoryAttachmentContainerUuid}`;
      const publishedRegulatoryAttachmentUuid = uuid();
      const publishedRegulatoryAttachmentUri = `http://data.lblod.info/published-regulatory-attachment/${publishedRegulatoryAttachmentUuid}`;
      const now = new Date();
      insertPublishedVersionQuery = `
        PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
        PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
        PREFIX pav: <http://purl.org/pav/>
        PREFIX nfo: <http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#>
        PREFIX nie: <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#>
        PREFIX dct: <http://purl.org/dc/terms/>
        PREFIX dbpedia: <http://dbpedia.org/ontology/>
        INSERT DATA {
          GRAPH ${sparqlEscapeUri(graphUri)} {
            ${sparqlEscapeUri(reglementUri)} ext:publishedVersion ${sparqlEscapeUri(publishedRegulatoryAttachmentContainerUri)}.
          }
          GRAPH <http://mu.semte.ch/graphs/public> {
            ${sparqlEscapeUri(reglementUri)} ext:publishedVersion ${sparqlEscapeUri(publishedRegulatoryAttachmentContainerUri)}.
            ${sparqlEscapeUri(publishedRegulatoryAttachmentContainerUri)} a ext:PublishedRegulatoryAttachmentContainer;
              ext:currentVersion ${sparqlEscapeUri(publishedRegulatoryAttachmentUri)}.
            ${sparqlEscapeUri(publishedRegulatoryAttachmentUri)} a ext:PublishedRegulatoryAttachment;
              ext:content ${sparqlEscapeUri(virtualFileUri)};
              pav:createdOn ${sparqlEscapeDateTime(now)};
              pav:lastUpdateOn ${sparqlEscapeDateTime(now)};
              ext:container  ${sparqlEscapeUri(publishedRegulatoryAttachmentContainerUri)}.
            ${sparqlEscapeUri(virtualFileUri)} a nfo:FileDataObject;
              mu:uuid ${sparqlEscapeString(virtualFileUuid)};
              nfo:fileName ${sparqlEscapeString(fileName)};
              dct:format ${sparqlEscapeString('application/html')};
              nfo:fileSize ${fileSize};
              dbpedia:fileExtension ${sparqlEscapeString('html')};
              dct:created ${sparqlEscapeDateTime(now)};
              nie:dataSource ${sparqlEscapeUri(physicalFileUri)}.
            ${sparqlEscapeUri(physicalFileUri)} a nfo:FileDataObject;
              mu:uuid ${sparqlEscapeString(virtualFileUuid)};
              nfo:fileName ${sparqlEscapeString(fileName)};
              dct:format ${sparqlEscapeString('application/html')};
              nfo:fileSize ${fileSize};
              dbpedia:fileExtension ${sparqlEscapeString('html')};
              dct:created ${sparqlEscapeDateTime(now)}.
          }
        }
      `;
    }

    await query(insertPublishedVersionQuery);
    await publishingTask.updateStatus(TASK_STATUS_SUCCESS);
  } catch (err) {
    publishingTask.updateStatus(TASK_STATUS_FAILURE, err.message);
  }
});

app.post('/invalidate/regulatory-attachment/:uuid', async (req,res) => {
  const reglementUuid = req.params.uuid;
  var myQuery = `
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    PREFIX pav: <http://purl.org/pav/>
    SELECT ?content ?reglement ?graph
    WHERE {
        ?reglement mu:uuid ${sparqlEscapeString(reglementUuid)};
          ext:hasDocumentContainer ?documentContainer.
    }
  `;
  const result = await query(myQuery);
  const bindings = result.results.bindings[0];
  const reglementUri = bindings.reglement.value;
  const insertValidThroughQuery = `
    PREFIX schema: <http://schema.org/>
    INSERT DATA {
        ${sparqlEscapeUri(reglementUri)} schema:validThrough ${sparqlEscapeDateTime(new Date())}
    }
  `;
  await query(insertValidThroughQuery);
  res.json({status: 'success'});
});

app.get('/publication-tasks/:id', async function (req, res) {
  const taskUuid = req.params.id;
  const task = await Task.find(taskUuid);
  if (task) {
    res.status(200).send({
      data: {
        id: task.id,
        status: task.status,
        type: task.type,
        taskType: task.type,
      }
    });
  }
  else {
    res.status(404).send(`task with id ${taskUuid} was not found`);
  }
});

app.use(errorHandler);