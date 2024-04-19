import EditorDocument from "./editor-document";
import { sparqlEscapeUri } from "mu";
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
    const currentVersion = EditorDocument.create({
      uri: binding.currentVersion_uri,
      id: binding.currentVersion_id,
      content: binding.currentVersion_content,
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
        ? `BIND(${sparqlEscapeUri(id)} AS ?id)`
        : "";

    const myQuery = `
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX pav: <http://purl.org/pav/>
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
      
      SELECT ?id ?uri ?derivedFrom WHERE {
        ${bindStatement}
        ?uri a ext:DocumentContainer;
             mu:uuid ?id.
             pav:hasCurrentVersion ?currentVersion_uri.
        ?currentVersion_uri mu:uuid ?currentVersion_id;
                            ext:content ?currentVersion_content.
        }
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
