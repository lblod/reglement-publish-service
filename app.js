import { app, sparqlEscapeString, sparqlEscapeUri, sparqlEscapeDateTime, errorHandler, uuid } from 'mu';
import { querySudo as query, updateSudo as update } from '@lblod/mu-auth-sudo';
import fs from 'fs';
import Task, { 
  TASK_STATUS_FAILURE,
  TASK_STATUS_RUNNING,
  TASK_STATUS_SUCCESS
} from './models/task';
import { ensureTask } from './util/task-utils';

app.post('/regulatory-attachment-publication-tasks', async (req,res, next) => {
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
    publishingTask = await ensureTask(documentContainerUri);
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
      PREFIX prov: <http://www.w3.org/ns/prov#>
      SELECT ?publishedContainer ?currentVersion
      WHERE {
        ?publishedContainer prov:derivedFrom ${sparqlEscapeUri(documentContainerUri)}.
        ?publishedContainer  pav:hasCurrentVersion ?currentVersion.
      }
    `;
    
    const fileUuid = uuid();
    const fileName = `${fileUuid}.html`;
    const filePath = `/share/${fileName}`;
    fs.writeFileSync(filePath, template);
    const fileSize = fs.statSync(filePath).size;
    const physicalFileUuid = uuid();
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
        PREFIX pav: <http://purl.org/pav/>
        DELETE WHERE {
          GRAPH <http://mu.semte.ch/graphs/public> {
            ${sparqlEscapeUri(publishedContainerUri)} pav:hasCurrentVersion ?currentVersion.
          }
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
  }
  else {
    res.status(404).send(`task with id ${taskUuid} was not found`);
  }
});

app.use(errorHandler);
