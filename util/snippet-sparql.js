import {
  sparqlEscapeDateTime,
  sparqlEscapeString,
  sparqlEscapeUri,
  uuid,
} from "mu";
import { updateSudo as update } from "@lblod/mu-auth-sudo";

import { deletePublishedVersion } from "./common-sparql";

export const insertPublishedSnippetContainer = async ({
  documentContainer,
  editorDocument,
  snippetList,
  title,
  content,
  publishingTaskUri,
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
              ext:fromSnippetList ${sparqlEscapeUri(snippetList.value)};
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

export const updatePublishedSnippetContainer = async ({
  editorDocument,
  snippetList,
  title,
  content,
  publishingTaskUri,
  publishedVersionResults,
}) => {
  await deletePublishedVersion(publishedVersionResults);

  const templateUri =
    publishedVersionResults.results.bindings[0].template.value;
  const previousVersionUri =
    publishedVersionResults.results.bindings[0].currentVersion.value;

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

            ${sparqlEscapeUri(templateUri)} pav:hasCurrentVersion ${sparqlEscapeUri(publishedSnippetUri)};
                                                      pav:hasVersion ${sparqlEscapeUri(publishedSnippetUri)};
                                                      ext:fromSnippetList ${sparqlEscapeUri(snippetList.value)}.

            ${sparqlEscapeUri(publishedSnippetUri)} a ext:PublishedSnippet;
                                                    mu:uuid ${sparqlEscapeString(snippetUuid)};
                                                    dct:title ${sparqlEscapeString(title.value)};
                                                    ext:editorDocumentContent ${sparqlEscapeString(content.value)};
                                                    pav:createdOn ${sparqlEscapeDateTime(now)};
                                                    pav:previousVersion ${sparqlEscapeUri(previousVersionUri)};
                                                    prov:derivedFrom ${sparqlEscapeUri(editorDocument.value)}.
          }
        }
      `;

  await update(updatePublishedVersionQuery);
};
