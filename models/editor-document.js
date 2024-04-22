export default class EditorDocument {
  /** @type {string} */
  id;
  /** @type {string} */
  uri;
  /** @type {string} */
  title;
  /** @type {string} */
  content;

  /**
   *
   * @param {{uri: string, id: string, title: string, content: string}}
   */
  constructor({ uri, id, title, content }) {
    this.uri = uri;
    this.id = id;
    this.title = title;
    this.content = content;
  }
}
