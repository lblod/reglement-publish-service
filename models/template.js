import {
  sparqlEscapeUri,
  uuid as uuidv4,
  sparqlEscapeString,
  query,
  update,
} from "mu";
import TemplateVersion from "./template-version";

/**
 * @typedef {('decision' | 'regulatory-statement')} TemplateType
 */

export default class Template {
  /** @type {string} */
  id;
  /** @type {string} */
  uri;
  /** @type {string} */
  derivedFrom;
  /** @type {TemplateVersion | undefined} */
  currentVersion;

  /**
   *
   * @param {{uri: string, id: string, derivedFrom: string, currentVersion?: TemplateVersion}}
   */
  constructor({ uri, id, derivedFrom, currentVersion }) {
    this.uri = uri;
    this.id = id;
    this.derivedFrom = derivedFrom;
    this.currentVersion = currentVersion;
  }

  /**
   *
   * @param {{derivedFrom: string, templateType: TemplateType}}
   */
  static async create({ derivedFrom, templateType }) {
    const templateId = uuidv4();
    const templateUri = `http://data.lblod.info/templates/${templateId}`;
    const typeUri =
      templateType === "decision"
        ? "http://data.lblod.info/vocabularies/gelinktnotuleren/BesluitTemplate"
        : "http://data.lblod.info/vocabularies/gelinktnotuleren/ReglementaireBijlageTemplate";
    const createTemplateQuery = `
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX gn: <http://data.lblod.info/vocabularies/gelinktnotuleren/>
      PREFIX prov: <http://www.w3.org/ns/prov#>

      INSERT DATA {
        ${sparqlEscapeUri(templateUri)} a gn:Template;
                                        a ${sparqlEscapeUri(typeUri)};
                                        prov:wasDerivedFrom ${sparqlEscapeUri(derivedFrom)};
                                        mu:uuid ${sparqlEscapeString(templateId)}.
      }
    `;
    await update(createTemplateQuery);
    return new Template({
      uri: templateUri,
      id: templateId,
      derivedFrom,
    });
  }

  static fromBinding(binding) {
    let currentVersion;
    if (binding.currentVersion_uri) {
      currentVersion = new TemplateVersion({
        uri: binding.currentVersion_uri.value,
        id: binding.currentVersion_id.value,
        title: binding.currentVersion_title.value,
        derivedFrom: binding.currentVersion_derivedFrom.value,
        validThrough:
          binding.currentVersion_validThrough?.value &&
          new Date(binding.currentVersion_validThrough.value),
      });
    }
    return new Template({
      uri: binding.uri.value,
      id: binding.id.value,
      derivedFrom: binding.derivedFrom.value,
      currentVersion,
    });
  }
  /**
   *
   * @param {({ derivedFrom: string } | { uri: string } | { id: string })} queryOptions
   */
  static async query(queryOptions) {
    let bindStatement =
      "uri" in queryOptions
        ? `BIND(${sparqlEscapeUri(queryOptions.uri)} AS ?uri)`
        : "id" in queryOptions
          ? `BIND(${sparqlEscapeUri(queryOptions.id)} AS ?id)`
          : `BIND(${sparqlEscapeUri(queryOptions.derivedFrom)} AS ?derivedFrom)`;

    const myQuery = `
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX gn: <http://data.lblod.info/vocabularies/gelinktnotuleren/>
      PREFIX prov: <http://www.w3.org/ns/prov#>
      PREFIX pav: <http://purl.org/pav/>
      PREFIX dct: <http://purl.org/dc/terms/>
      PREFIX schema: <http://schema.org/>

      SELECT 
        ?id 
        ?uri 
        ?derivedFrom 
        ?currentVersion_uri 
        ?currentVersion_id 
        ?currentVersion_title
        ?currentVersion_derivedFrom 
        ?currentVersion_validThrough
      WHERE {
        ${bindStatement}
        ?uri a gn:Template;
             mu:uuid ?id;
             prov:wasDerivedFrom ?derivedFrom.
        OPTIONAL {
          ?uri pav:hasCurrentVersion ?currentVersion_uri.
          ?currentVersion_uri mu:uuid ?currentVersion_id;
                              dct:title ?currentVersion_title;
                              prov:wasDerivedFrom ?currentVersion_derivedFrom.
        }
        OPTIONAL {
          ?currentVersion_uri schema:validThrough ?currentVersion_validThrough.
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

  /**
   *
   * @param {{ documentContainerUri: string, templateType: TemplateType}}
   */
  static async ensure({ documentContainerUri, templateType }) {
    const template = await this.query({ derivedFrom: documentContainerUri });
    if (template) {
      return template;
    }
    return this.create({ derivedFrom: documentContainerUri, templateType });
  }

  /**
   *
   * @param {TemplateVersion} templateVersion
   */
  async setCurrentVersion(templateVersion) {
    const myQuery = `
      PREFIX pav: <http://purl.org/pav/>

      DELETE WHERE {
        ${sparqlEscapeUri(this.uri)} pav:hasCurrentVersion ?v.
      };

      INSERT DATA {
        ${sparqlEscapeUri(this.uri)} pav:hasCurrentVersion ${sparqlEscapeUri(templateVersion.uri)};
                    pav:hasVersion ${sparqlEscapeUri(templateVersion.uri)}.
      }
    `;
    await update(myQuery);
    this.currentVersion = templateVersion;
  }
}
