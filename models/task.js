import {
  uuid,
  sparqlEscapeUri,
  sparqlEscapeString,
  sparqlEscapeDateTime,
  // @ts-ignore
  sparqlEscapeInt} from 'mu';
import { querySudo as query, updateSudo as update } from '@lblod/mu-auth-sudo';

export const TASK_STATUS_FAILURE =  "http://lblod.data.gift/besluit-publicatie-melding-statuses/failure";
export const TASK_STATUS_CREATED =  "http://lblod.data.gift/besluit-publicatie-melding-statuses/created";
export const TASK_STATUS_SUCCESS =  "http://lblod.data.gift/besluit-publicatie-melding-statuses/success";
export const TASK_STATUS_RUNNING = "http://lblod.data.gift/besluit-publicatie-melding-statuses/ongoing";

export const TASK_TYPE_REGLEMENT_PUBLISH = "regulatory-attachment-publication-tasks";
export const TASK_TYPE_SNIPPET_PUBLISH = "snippet-list-publication-tasks";

export default class Task {
  static async create(involves, taskType = TASK_TYPE_REGLEMENT_PUBLISH) {
    const id = uuid();
    const uri = `http://lblod.data.gift/tasks/${id}`;
    const created = Date.now();
    const queryString = `
     PREFIX    mu: <http://mu.semte.ch/vocabularies/core/>
     PREFIX    nuao: <http://www.semanticdesktop.org/ontologies/2010/01/25/nuao#>
     PREFIX    task: <http://redpencil.data.gift/vocabularies/tasks/>
     PREFIX    dct: <http://purl.org/dc/terms/>
     PREFIX    adms: <http://www.w3.org/ns/adms#>
     INSERT DATA {
        ${sparqlEscapeUri(uri)} a task:Task;
                                                mu:uuid ${sparqlEscapeString(id)};
                                                adms:status ${sparqlEscapeUri(TASK_STATUS_CREATED)};
                                                task:numberOfRetries ${sparqlEscapeInt(0)};
                                                dct:created ${sparqlEscapeDateTime(created)};
                                                dct:modified ${sparqlEscapeDateTime(created)};
                                                dct:creator <http://lblod.data.gift/services/reglement-publish-service>;
                                                dct:type ${sparqlEscapeString(taskType)};
                                                nuao:involves ${sparqlEscapeUri(involves)}.
    }
  `;
    await update(queryString);

    return new Task({id, type: taskType, involves, created, modified: created, status: TASK_STATUS_CREATED, uri});
  }

  static async find(uuid) {
    const result = await query(`
     PREFIX    mu: <http://mu.semte.ch/vocabularies/core/>
     PREFIX    nuao: <http://www.semanticdesktop.org/ontologies/2010/01/25/nuao#>
     PREFIX    task: <http://redpencil.data.gift/vocabularies/tasks/>
     PREFIX    dct: <http://purl.org/dc/terms/>
     PREFIX    adms: <http://www.w3.org/ns/adms#>
     PREFIX    ext: <http://mu.semte.ch/vocabularies/ext/>
     SELECT ?uri ?uuid ?type ?involves ?status ?modified ?created  WHERE {
       BIND(${sparqlEscapeString(uuid)} AS ?uuid)
       ?uri a task:Task;
            mu:uuid ?uuid;
            dct:type ?type;
            dct:created ?created;
            dct:modified ?modified;
            nuao:involves ?involves;
            dct:creator <http://lblod.data.gift/services/reglement-publish-service>;
            adms:status ?status.
     }
   `);
    if (result.results.bindings.length) {
      return Task.fromBinding(result.results.bindings[0]);
    }
    else
      return null;
  }

  static async query({involves, taskType = TASK_TYPE_REGLEMENT_PUBLISH}) {
    const result = await query(`
     PREFIX    mu: <http://mu.semte.ch/vocabularies/core/>
     PREFIX    nuao: <http://www.semanticdesktop.org/ontologies/2010/01/25/nuao#>
     PREFIX    task: <http://redpencil.data.gift/vocabularies/tasks/>
     PREFIX    dct: <http://purl.org/dc/terms/>
     PREFIX    adms: <http://www.w3.org/ns/adms#>
     PREFIX    ext: <http://mu.semte.ch/vocabularies/ext/>
     SELECT ?uri ?uuid ?involves ?status ?modified ?created ?regulatoryAttachmentPublication WHERE {
       ?uri a task:Task;
            mu:uuid ?uuid;
            dct:created ?created;
            dct:modified ?modified;
            dct:type ${sparqlEscapeString(taskType)};
            nuao:involves ${sparqlEscapeUri(involves)};
            dct:creator <http://lblod.data.gift/services/reglement-publish-service>;
            adms:status ?status.
     }
   `);
    if (result.results.bindings.length) {
      return Task.fromBinding({...result.results.bindings[0],
        type: { value: taskType },
        involves: { value: involves }
      });
    }
    else
      return null;
  }

  static fromBinding(binding) {
    return new Task( {
      id: binding.uuid.value,
      uri: binding.uri.value,
      created: binding.created.value,
      modified: binding.modified.value,
      status: binding.status.value,
      involves: binding.involves.value,
      type: binding.type.value,
    });
  }

  constructor({id, uri, created, status, modified, type, involves}) {
    this.id = id;
    this.type = type;
    this.involves = involves;
    this.created = created;
    this.modified = modified;
    this.status = status;
    this.uri = uri;
  }

  async updateStatus(status, reason) {
    const queryString = `
     PREFIX    mu: <http://mu.semte.ch/vocabularies/core/>
     PREFIX    nuao: <http://www.semanticdesktop.org/ontologies/2010/01/25/nuao#>
     PREFIX    task: <http://redpencil.data.gift/vocabularies/tasks/>
     PREFIX    dct: <http://purl.org/dc/terms/>
     PREFIX adms: <http://www.w3.org/ns/adms#>
     PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

     DELETE {
       ?uri adms:status ?status.
     }
     INSERT {
       ?uri adms:status ${sparqlEscapeUri(status)}.
       ${reason ? `?uri rdfs:comment ${sparqlEscapeString(reason)}.` : ''}
     }
     WHERE {
         ?uri a task:Task;
              mu:uuid ${sparqlEscapeString(this.id)};
              adms:status ?status.
    }`;
    await update(queryString);
  }
}
