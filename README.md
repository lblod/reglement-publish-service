# reglement-publish-service
This service can be used to publish regulatory attachments

## Endpoints
It provides 5 endpoints

## `POST` /publish/regulatory-attachment/:uuid
A taskified enpoint which publishes the regulatory attachment with the provided uuid, the published info will have the following structure:
```
$reglementUri ext:publishedVersion ?publishedContainer.
?publishedContainer ext:currentVersion ?currentVersion.
?currentVersion a ext:PublishedRegulatoryAttachment;
              ext:content ?file;
              pav:createdOn ?date;
              pav:lastUpdateOn ?date;
              pav:previousVersion ?previousVersion;
              ext:container ?publishedContainer.
```
Being ?file the rdfa structure of a file per the file-service documentation

## /publication-tasks/:id
This endpoint checks the state of a task created by the previous endpoint

## /preview/regulatory-attachment/:uuid
Previews a published regulatory attachment, it just returns a json with the content of said regulatory attachment

## /preview/regulatory-attachment-container/:uuid
Previews a regulatory attachment container

## /invalidate/regulatory-attachment/:uuid
Invalidates the specified regulatory attachment, it just adds a `schema:validThrough` property with todays date to indicate that the publication is no longer valid

## Docker Compose Example
```
publisher:
    image: lblod/reglement-publish-service:0.0.1
    links:
      - database:database
    volumes:
      - ./data/files/:/share/
```


## Development

### Making a release

- make sure all relevant PRs have the appropriate labels according to [lerna-changelog](https://github.com/lerna/lerna-changelog#usage).
- `npm run release`
- check the changelog and follow the prompts. Say yes to tagging and creating a github release.
