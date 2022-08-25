import { app, sparqlEscapeString, sparqlEscapeUri, sparqlEscapeDateTime, errorHandler, uuid } from 'mu';
import { querySudo as query, updateSudo as update } from '@lblod/mu-auth-sudo';
import fs from 'fs';
import path from 'path'


app.get('/', function( req, res ) {
  res.send('Hello mu-javascript-template');
} );


app.post('/publish/:uuid', async (req,res) => {
  const reglementUuid = req.params.uuid;
  var myQuery = `
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    PREFIX pav: <http://purl.org/pav/>
    SELECT ?content ?reglement
    WHERE {
      ?reglement mu:uuid ${sparqlEscapeString(reglementUuid)};
        ext:hasDocumentContainer ?documentContainer.
      ?documentContainer pav:hasCurrentVersion ?editorDocument.
      ?editorDocument ext:editorDocumentTemplateVersion ?content.
    }
  `;
  const result = await query(myQuery);
  const bindings = result.results.bindings[0];
  const template = bindings.content.value;
  const reglementUri = bindings.reglement.value;
  var publishedVersionQuery = `
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    PREFIX pav: <http://purl.org/pav/>
    SELECT ?publishedContainer
    WHERE {
      ${sparqlEscapeUri(reglementUri)} ext:publishedVersion ?publishedContainer .
    }
  `;
  
  const fileUuid = uuid();
  const fileName = `${fileUuid}.html`
  const filePath = `/share/${fileName}`
  console.log(filePath)
  fs.writeFileSync(filePath, template);
  const fileSize = fs.statSync(filePath).size
  const virtualFileUuid = uuid()
  const virtualFileUri = `http://data.lblod.info/files/${virtualFileUuid}`
  const physicalFileUri = `share://${fileName}`
  const publishedVersionResults = await query(publishedVersionQuery);
  let insertPublishedVersionQuery;
  if(publishedVersionResults.results.bindings[0] && publishedVersionResults.results.bindings[0].publishedContainer) {
    insertPublishedVersionQuery = `
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
      PREFIX pav: <http://purl.org/pav/>
      SELECT ?publishedContainer
      WHERE {
        ?publishedContainer ext:publishedVersion ${sparqlEscapeUri(reglementUri)}.
      }
    `;
  } else {
    const publishedRegulatoryAttachmentContainerUuid = uuid();
    const publishedRegulatoryAttachmentContainerUri = `http://data.lblod.info/published-regulatory-attachment-container/${publishedRegulatoryAttachmentContainerUuid}`;
    const publishedRegulatoryAttachmentUuid = uuid();
    const publishedRegulatoryAttachmentUri = `http://data.lblod.info/published-regulatory-attachment/${publishedRegulatoryAttachmentUuid}`;
    const now = new Date()
    insertPublishedVersionQuery = `
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
      PREFIX pav: <http://purl.org/pav/>
      PREFIX nfo: <http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#>
      PREFIX nie: <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#>
      PREFIX dct: <http://purl.org/dc/terms/>
      PREFIX dbpedia: <http://dbpedia.org/ontology/>
      INSERT DATA {
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
    `;
  }

  await query(insertPublishedVersionQuery);
    
  res.end('Success')
})


app.get('/query', function( req, res ) {
  var myQuery = `
    SELECT *
    WHERE {
      GRAPH <http://mu.semte.ch/application> {
        ?s ?p ?o.
      }
    }`;

    query( myQuery )
    .then( function(response) {
      res.send( JSON.stringify( response ) );
    })
    .catch( function(err) {
      res.send( "Oops something went wrong: " + JSON.stringify( err ) );
    });
} );

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