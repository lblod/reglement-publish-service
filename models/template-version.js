import {
  sparqlEscapeUri,
  uuid as uuidv4,
  sparqlEscapeDateTime,
  sparqlEscapeString,
  query,
  update,
} from "mu";
import fs from "fs";

export default class TemplateVersion {
  /** @type {string} */
  id;
  /** @type {string} */
  uri;
  /** @type {title} */
  title;
  /** @type {string} */
  derivedFrom;
  /** @type {Date | undefined} */
  validThrough;

  /**
   *
   * @param {{uri: string, id: string, title: string, derivedFrom: string, validThrough?: Date}}
   */
  constructor({ uri, id, title, derivedFrom, validThrough }) {
    this.uri = uri;
    this.id = id;
    this.title = title;
    this.derivedFrom = derivedFrom;
    this.validThrough = validThrough;
  }

  /**
   *
   * @param {{ derivedFrom: string, title: string, content: string }}
   */
  static async create({ derivedFrom, title, content }) {
    const now = new Date();
    const fileUuid = uuidv4();
    const fileName = `${fileUuid}.html`;
    const filePath = `/share/${fileName}`;
    fs.writeFileSync(filePath, content);
    const fileSize = fs.statSync(filePath).size;
    const physicalFileUuid = uuidv4();
    const physicalFileUri = `share://${fileName}`;

    const id = uuidv4();
    const uri = `http://data.lblod.info/template-versies/${id}`;
    const createTemplateQuery = `
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX gn: <http://data.lblod.info/vocabularies/gelinktnotuleren/>
      PREFIX nfo: <http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#>
      PREFIX dct: <http://purl.org/dc/terms/>
      PREFIX dbpedia: <http://dbpedia.org/ontology/>
      PREFIX prov: <http://www.w3.org/ns/prov#>
      PREFIX nie: <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#>

      INSERT DATA {
        ${sparqlEscapeUri(uri)} 
          a gn:TemplateVersie;
          a nfo:FileDataObject;
          mu:uuid ${sparqlEscapeString(id)};
          dct:title ${sparqlEscapeString(title)};
          nfo:fileName ${sparqlEscapeString(fileName)};
          dct:format ${sparqlEscapeString("application/html")};
          nfo:fileSize ${fileSize};
          dbpedia:extension ${sparqlEscapeString("html")};
          nfo:fileCreated ${sparqlEscapeDateTime(now)};
          prov:wasDerivedFrom ${sparqlEscapeUri(derivedFrom)}.

        ${sparqlEscapeUri(physicalFileUri)} 
          a nfo:FileDataObject;
          mu:uuid ${sparqlEscapeString(physicalFileUuid)};
          nfo:fileName ${sparqlEscapeString(fileName)};
          dct:format ${sparqlEscapeString("application/html")};
          nfo:fileSize ${fileSize};
          dbpedia:extension ${sparqlEscapeString("html")};
          nfo:fileCreated ${sparqlEscapeDateTime(now)};
          nie:dataSource ${sparqlEscapeUri(uri)}.
      }`;
    await update(createTemplateQuery);
    return new TemplateVersion({
      uri,
      id,
      title,
      derivedFrom,
    });
  }

  static fromBinding(binding) {
    return new TemplateVersion({
      uri: binding.uri.value,
      id: binding.id.value,
      title: binding.title.value,
      derivedFrom: binding.derivedFrom.value,
      validThrough:
        binding.validThrough?.value && new Date(binding.validThrough.value),
    });
  }
  /**
   *
   * @param {({ derivedFrom: string } | { uri: string } | { id: string })} queryOptions
   */
  static async query(queryOptions) {
    const bindStatement =
      "uri" in queryOptions
        ? `BIND(${sparqlEscapeUri(queryOptions.uri)} AS ?uri)`
        : "id" in queryOptions
          ? `BIND(${sparqlEscapeUri(queryOptions.id)} AS ?id)`
          : `BIND(${sparqlEscapeUri(queryOptions.derivedFrom)} AS ?derivedFrom)`;

    const myQuery = `
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX gn: <http://data.lblod.info/vocabularies/gelinktnotuleren/>
      PREFIX prov: <http://www.w3.org/ns/prov#>
      PREFIX dct: <http://purl.org/dc/terms/>
      PREFIX schema: <http://schema.org/>

      SELECT ?id ?uri ?title ?derivedFrom ?validThrough WHERE {
        ${bindStatement}
        ?uri a gn:TemplateVersie;
             mu:uuid ?id;
             dct:title ?title;
             prov:wasDerivedFrom ?derivedFrom.
        OPTIONAL {
          ?uri schema:validThrough ?validThrough.
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

  async markAsExpired() {
    const now = new Date();
    const myQuery = `
      PREFIX schema: <http://schema.org/>

      INSERT DATA {
        ${sparqlEscapeUri(this.uri)} schema:validThrough ${sparqlEscapeDateTime(now)}.
      }
    `;
    await update(myQuery);
  }
}
