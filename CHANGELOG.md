# Changelog
All notable changes to this project will be documented in this file.

This project adheres to [Semantic Versioning](http://semver.org/),
where **Major.Minor.Patch** is interpreted as **Breaking.Feature.Fix**.

## [1.0.8]
- ES6 Promise polyfill updated

## [1.0.7]
- Subscribe has been extended to support POST requests

## [1.0.6]
- Performance improvements mainly aimed at Internet Explorer and Microsoft Edge

## [1.0.5]
- Subscribe will always refresh the resource

## [1.0.4]
- Null updates are merged into the cache

## [1.0.3]
- Fix for session.clearCache() being slow on certain browsers

## [1.0.2]
- Tweaks for batching updates to subscribers
- Fixes for syncing of orderbooks and quotes

## [1.0.1]
- Adds polyfill for Object.assign

## [1.0.0]
- Stable release

## [0.7.0]
- Cache merge code rewrite
- Adds replace option to session.refresh(resource,replace)

## [Pre-release] First pre-release version
- Basic connection API complete (connect, withContext)
- Basic Session API complete (subscribe,refresh, create, update, remove)
- Caching layer works on entity level
- Bid/Ask sync between Orderbooks and Quotes implemented
- Retries with back-off


[1.0.0]: https://github.com/six-sdk/six-javascript-sdk/compare/v1.0.0...HEAD
[0.7.0]: https://github.com/six-sdk/six-javascript-sdk/compare/v0.7.0...HEAD
[Unreleased]: https://github.com/six-sdk/six-javascript-sdk/compare/v0.7.0...HEAD
[Pre-release]: https://github.com/six-sdk/six-javascript-sdk/compare/v0.7.0...HEAD
