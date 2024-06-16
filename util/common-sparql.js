import { sparqlEscapeUri, sparqlEscapeString } from "mu";
import { querySudo as query, updateSudo as update } from "@lblod/mu-auth-sudo";

export const getPublishedVersion = async (documentContainerUri) => {
  const publishedVersionQuery = `
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
      PREFIX pav: <http://purl.org/pav/>
      PREFIX prov: <http://www.w3.org/ns/prov#>

      SELECT ?template ?currentVersion
      WHERE {
        ?template prov:derivedFrom ${sparqlEscapeUri(documentContainerUri)};
                  pav:hasCurrentVersion ?currentVersion.
      }
    `;

  return await query(publishedVersionQuery);
};

export const hasPublishedVersion = (publishedVersionResults) =>
  publishedVersionResults.results.bindings[0] &&
  publishedVersionResults.results.bindings[0].template;

export const deletePublishedVersion = async (publishedVersionResults) => {
  const templateUri =
    publishedVersionResults.results.bindings[0].template.value;

  const deleteCurrentVersionQuery = `
        PREFIX pav: <http://purl.org/pav/>

        DELETE WHERE {
          GRAPH <http://mu.semte.ch/graphs/public> {
            ${sparqlEscapeUri(templateUri)} pav:hasCurrentVersion ?currentVersion.
          }
        }
      `;

  await update(deleteCurrentVersionQuery);
};

/**
 * @param {string} documentContainerUuid
 */
export const getEditorDocument = async (documentContainerUuid) => {
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

/**
 * @param {string} snippetListUuid
 */
export const getSnippetList = async (snippetListUuid) => {
  const snippetListQuery = `
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>

      SELECT ?snippetList
      WHERE {
          ?snippetList a ext:SnippetList;
		                   mu:uuid ${sparqlEscapeString(snippetListUuid)}.
      }
    `;

  const result = await query(snippetListQuery);
  return result.results.bindings[0];
};
