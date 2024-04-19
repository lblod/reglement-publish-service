export default class EditorDocument {
  /** @type {string} */
  id;
  /** @type {string} */
  uri;
  /** @type {string} */
  content;

  /**
   *
   * @param {{uri: string, id: string, content: string}}
   */
  constructor({ uri, id, content }) {
    this.uri = uri;
    this.id = id;
    this.content = content;
  }
}
