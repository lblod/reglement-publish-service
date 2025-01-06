## 5.2.0

### Minor Changes

- [#21](https://github.com/lblod/reglement-publish-service/pull/21) [`62f3ad4`](https://github.com/lblod/reglement-publish-service/commit/62f3ad471609295d562f906008b752902ae2992e) Thanks [@elpoelma](https://github.com/elpoelma)! - Add authorization middleware

- [#21](https://github.com/lblod/reglement-publish-service/pull/21) [`f40ed9e`](https://github.com/lblod/reglement-publish-service/commit/f40ed9e5e199142b33595c043931d84f8dde640e) Thanks [@elpoelma](https://github.com/elpoelma)! - Replace mu-auth-sudo queries by queries with standard access rights

- [#19](https://github.com/lblod/reglement-publish-service/pull/19) [`6720a8a`](https://github.com/lblod/reglement-publish-service/commit/6720a8a75db947900be7adaadc49d58dd154aee6) Thanks [@elpoelma](https://github.com/elpoelma)! - Remove obsolete `snippet-list-publication-tasks` endpoint and related functions

### Patch Changes

- [#19](https://github.com/lblod/reglement-publish-service/pull/19) [`2e91cb5`](https://github.com/lblod/reglement-publish-service/commit/2e91cb5e7a56e0960991d06838e44612cfad0c28) Thanks [@elpoelma](https://github.com/elpoelma)! - Remove obsolete GET `/tasks` endpoint. This endpoint is replaced by a simple mu-cl-resources `/tasks` endpoint

- [#19](https://github.com/lblod/reglement-publish-service/pull/19) [`2c2b0fd`](https://github.com/lblod/reglement-publish-service/commit/2c2b0fdfc34322f58b864a909aee72f03f10b69b) Thanks [@elpoelma](https://github.com/elpoelma)! - Fix: link publication-task to `editor-document` instead of to `documentContainer`

- [#19](https://github.com/lblod/reglement-publish-service/pull/19) [`ce26046`](https://github.com/lblod/reglement-publish-service/commit/ce260467d026b4fd57c4261ec9aa617022b1967a) Thanks [@elpoelma](https://github.com/elpoelma)! - Ensure endpoint responses following the JSON:API spec

- [`3c074c4`](https://github.com/lblod/reglement-publish-service/commit/3c074c4b52112fd8d34cdfe57b74afe1cf510b7e) Thanks [@elpoelma](https://github.com/elpoelma)! - Set-up changesets release flow

## 5.1.0 (2024-12-10)

- [#18](https://github.com/lblod/reglement-publish-service/pull/18) Only expire template versions that are already expired ([@piemonkey](https://github.com/piemonkey))

## 5.0.1 (2024-07-16)

#### :bug: Bug Fix

- [#17](https://github.com/lblod/reglement-publish-service/pull/17) Fix crash when updating snippets from renamed SPARQL variable ([@piemonkey](https://github.com/piemonkey))

#### Committers: 1

- [@piemonkey](https://github.com/piemonkey)

## 5.0.0 (2024-06-16)

#### :boom: Breaking Change

- [#14](https://github.com/lblod/reglement-publish-service/pull/14) Restructure and support for decision templates ([@elpoelma](https://github.com/elpoelma))

#### :house: Internal

- [#13](https://github.com/lblod/reglement-publish-service/pull/13) Generalize `task` interface ([@elpoelma](https://github.com/elpoelma))
- [#15](https://github.com/lblod/reglement-publish-service/pull/15) Pin `semtech/mu-javascript-template` base-image to 1.8.0 ([@elpoelma](https://github.com/elpoelma))
- [#16](https://github.com/lblod/reglement-publish-service/pull/16) Move to woodpecker CI ([@elpoelma](https://github.com/elpoelma))

#### Committers: 1

- Elena Poelman ([@elpoelma](https://github.com/elpoelma))

## 4.1.0 (2024-04-19)

#### :rocket: Enhancement

- [#12](https://github.com/lblod/reglement-publish-service/pull/12) Introduce single `/tasks/:id` route used for fetching task information ([@elpoelma](https://github.com/elpoelma))

#### Committers: 1

- Elena Poelman ([@elpoelma](https://github.com/elpoelma))

## 4.0.0 (2023-08-28)

#### :rocket: Enhancement

- [#11](https://github.com/lblod/reglement-publish-service/pull/11) GN-4322: Connect Snippet List with Template ([@dkozickis](https://github.com/dkozickis))

#### Committers: 1

- Deniss Kozickis ([@dkozickis](https://github.com/dkozickis))

## 3.1.0 (2023-07-24)

#### :rocket: Enhancement

- [#10](https://github.com/lblod/reglement-publish-service/pull/10) GN-4323: Publish snippet to public space ([@dkozickis](https://github.com/dkozickis))

#### :memo: Documentation

- [#2](https://github.com/lblod/reglement-publish-service/pull/2) Add missing endpoint to readme ([@abeforgit](https://github.com/abeforgit))

#### Committers: 2

- Arne Bertrand ([@abeforgit](https://github.com/abeforgit))
- Deniss Kozickis ([@dkozickis](https://github.com/dkozickis))

## 3.0.2 (2022-11-09)

#### :bug: Bug Fix

- [#9](https://github.com/lblod/reglement-publish-service/pull/9) Prefix schema not defined ([@lagartoverde](https://github.com/lagartoverde))

#### Committers: 1

- Oscar Rodriguez Villalobos ([@lagartoverde](https://github.com/lagartoverde))

## 3.0.1 (2022-11-04)

#### :bug: Bug Fix

- [#8](https://github.com/lblod/reglement-publish-service/pull/8) add valid through to the old version when publishing a new one ([@lagartoverde](https://github.com/lagartoverde))

#### Committers: 1

- Oscar Rodriguez Villalobos ([@lagartoverde](https://github.com/lagartoverde))

## 3.0.0 (2022-11-03)

#### :rocket: Enhancement

- [#7](https://github.com/lblod/reglement-publish-service/pull/7) Feature/new rdfa model ([@lagartoverde](https://github.com/lagartoverde))

#### Committers: 1

- Oscar Rodriguez Villalobos ([@lagartoverde](https://github.com/lagartoverde))

## 2.0.0 (2022-10-20)

#### :rocket: Enhancement

- [#6](https://github.com/lblod/reglement-publish-service/pull/6) Feature: refactor and json api compliancy ([@elpoelma](https://github.com/elpoelma))

#### Committers: 1

- Elena Poelman ([@elpoelma](https://github.com/elpoelma))

## 1.2.1 (2022-10-04)

#### :bug: Bug Fix

- [#5](https://github.com/lblod/reglement-publish-service/pull/5) BUGFIX: Invalidate triple was not being written to the correct graph ([@lagartoverde](https://github.com/lagartoverde))

#### Committers: 1

- Oscar Rodriguez Villalobos ([@lagartoverde](https://github.com/lagartoverde))

## 1.2.0 (2022-10-03)

#### :rocket: Enhancement

- [#4](https://github.com/lblod/reglement-publish-service/pull/4) Add release-it config ([@abeforgit](https://github.com/abeforgit))
- [#3](https://github.com/lblod/reglement-publish-service/pull/3) Fail with a 404 when the reglement is not found ([@lagartoverde](https://github.com/lagartoverde))

#### Committers: 2

- Arne Bertrand ([@abeforgit](https://github.com/abeforgit))
- Oscar Rodriguez Villalobos ([@lagartoverde](https://github.com/lagartoverde))
