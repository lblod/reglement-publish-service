import EditorDocument from "./editor-document";
import { sparqlEscapeUri, sparqlEscapeString } from "mu";
import { querySudo as query } from "@lblod/mu-auth-sudo";

export default class DocumentContainer {
  /** @type {string} */
  id;
  /** @type {string} */
  uri;
  /** @type {string} */
  folder;
  /** @type {EditorDocument} */
  currentVersion;

  /**
   *
   * @param {{uri: string, id: string, folder: string, currentVersion: EditorDocument}}
   */
  constructor({ uri, id, folder, currentVersion }) {
    this.uri = uri;
    this.id = id;
    this.folder = folder;
    this.currentVersion = currentVersion;
  }

  static fromBinding(binding) {
    const currentVersion = new EditorDocument({
      uri: binding.currentVersion_uri.value,
      id: binding.currentVersion_id.value,
      content: binding.currentVersion_content.value,
    });
    return new DocumentContainer({
      uri: binding.uri.value,
      id: binding.id.value,
      folder: binding.folder.value,
      currentVersion,
    });
  }
  /**
   *
   * @param {({ uri?: string, id?: string })} queryOptions
   */
  static async query(queryOptions) {
    const { uri, id } = queryOptions;
    let bindStatement = uri
      ? `BIND(${sparqlEscapeUri(uri)} AS ?uri)`
      : id
        ? `BIND(${sparqlEscapeString(id)} AS ?id)`
        : "";

    const myQuery = `
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX pav: <http://purl.org/pav/>
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
      
      SELECT ?id ?uri ?folder ?currentVersion_uri ?currentVersion_id ?currentVersion_content WHERE {
        ${bindStatement}
        ?uri a ext:DocumentContainer;
             mu:uuid ?id;
             ext:editorDocumentFolder ?folder;
             pav:hasCurrentVersion ?currentVersion_uri.
        ?currentVersion_uri mu:uuid ?currentVersion_id;
                            ext:editorDocumentTemplateVersion ?currentVersion_content.
      }
    `;
    const result = await query(myQuery);
    if (result.results.bindings.length) {
      return this.fromBinding(result.results.bindings[0]);
    } else {
      return;
    }
  }
}
