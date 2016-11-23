import {createFetch} from './fetch'
import {retry} from './retry'
import {deepMerge, findAllEntitiesIn} from './merge'
import VersionInfo from './meta-version'

const nextId = (function generateNextId () {
  let id = 0
  return function incrementId () {
    id += 1
    return id
  }
}())

export default function (token, endpoint) {
  let currentToken = token

  const subscriptions = {}
  const resourceToSubscription = {}

  // cache
  const entityCache = {} // entity.url -> entity
  const resourceCache = {} // resource -> response
  const entityToResource = {} // entity.url -> resource

  const unsubscribe = function (id) {
    const subscription = subscriptions[id]
    if (subscription) {
      delete subscriptions[id]

      // remove resource -> subscription mapping
      resourceToSubscription[subscription.resource] = resourceToSubscription[subscription.resource].filter(s => !(s.id === id))
    }
  }

  return {
    _internal: {
      _endpoint: endpoint,
      _subscriptions: subscriptions,
      _resourceToSubscription: resourceToSubscription,
      _entityCache: entityCache,
      _resourceCache: resourceCache,
      _entityToResource: entityToResource,
      _context: { sdk: VersionInfo.version },

      getToken: function getToken () {
        return currentToken
      },

      publishError: function publishError (resource, data, err) {
        // Access denied
        if (err.details.status === 401) {
          const sessionExpiredSubscriptions = resourceToSubscription['session-expired']
          if (sessionExpiredSubscriptions) {
            const called = Object.create(null)
            sessionExpiredSubscriptions.forEach(s => {
              if (!called[s.id]) {
                s.callback(err, data, s.unsubscribeFn)
                called[s.id] = true
              }
            })
          }
        }
        const errorSubscriptions = resourceToSubscription['error']
        if (errorSubscriptions) {
          const called = Object.create(null)
          errorSubscriptions.forEach(s => {
            if (!called[s.id]) {
              setTimeout(() => { s.callback(err, data, s.unsubscribeFn) })
              called[s.id] = true
            }
          })
        }
        let subscriptions = resourceToSubscription[resource]
        if (subscriptions) {
          subscriptions.forEach(s => s.callback(err, data, s.unsubscribeFn))
        }
      },

      publish: function publish (resource, data, err, replace) {
        // on errors, notify all subscriptions *only* for original resource
        if (err) {
          this.publishError(resource, data, err)
          return
        }

        // domain specific, make sure 'naked' orderbooks are referenced
        // from their root listing.
        // !! Note this is only for compat reasons, it fails if /listing/x is
        // merged before /listing/x/orderbook. Any resource interested in quotes
        // should always include 'orderbook.url'
        if (data.url && data.url.endsWith('/orderbook')) {
          const entityUrl = data.url.substring(0, data.url.length - '/orderbook'.length)
          const listing = entityCache[entityUrl]
          if (listing && (!listing.orderbook)) {
            listing.orderbook = data
          }
        }

        // find all entities (recursivly) in resource
        const entities = findAllEntitiesIn(data)

        // merge entities into cache
        Object.values(entities).forEach(entity => {
          entityCache[entity.url] = deepMerge(entityCache[entity.url], entity, replace)
        })

        // merge cache -> entities
        Object.values(entities).forEach(entity => {
          Object.assign(entity, entityCache[entity.url])
        })

        // resolve all entity references, with entity object instances from the cache
        Object.values(entities).forEach(entity => {
          for (var field in entity) {
            if (entity.hasOwnProperty(field)) {
              if (typeof entity[field] === 'object') {
                if (entity[field].url) {
                  entity[field] = entityCache[entity[field].url] || entity[field]
                }
              }
            }
          }
        })

        // find all entities (recursivly) in the cache with a reference to any
        // of the entities in the resource we want to publish
        // TODO: remove this if not needed anymore
        const affectedEntities = Object.assign({}, entities)
        // Object.values(entities).forEach(entity => {
        //   Object.assign(affectedEntities, findAllWithReferenceTo(entityCache, entity))
        // })

        // console.log('entities', entities)
        // console.log('affectedEntities', affectedEntities)

        // entityToResource cache
        Object.values(affectedEntities).forEach(entity => {
          entityToResource[entity.url] = entityToResource[entity.url] || {}
          entityToResource[entity.url][resource] = true
        })

        // cache resource
        if (data.url) {
          resourceCache[resource] = affectedEntities[data.url]
        } else {
          resourceCache[resource] = deepMerge(resourceCache[resource], data, replace)
        }

        // Domain specific, fixup level 1 in all cached listings with orderbooks
        Object.values(entityCache).forEach(e => {
          if (e.orderbook && e.orderbook.levels && e.orderbook.levels.length > 0) {
            if (e.quotes && e.quotes.bidPrice) {
              e.orderbook.levels[0].bidPrice = e.quotes.bidPrice
            }
            if (e.quotes && e.quotes.askPrice) {
              e.orderbook.levels[0].askPrice = e.quotes.askPrice
            }
          }
        })

        // fetch all resources to notify
        const resourcesToNotify = Object.create(null) // in lieu of Set
        Object.values(affectedEntities).forEach(entity => {
          Object.keys(entityToResource[entity.url]).forEach(r => (resourcesToNotify[r] = true))
        })

        // always notify all subscriptions for original resource
        // (not all responses contains an .url field we can map to entities)
        resourcesToNotify[resource] = true

        // Optimize so we don't call callbacks more than once per publish.
        // Not strictly necessary, but helps in tests and debugging
        const called = Object.create(null) // in lieu of Set

        // notify all subscriptions
        Object.keys(resourcesToNotify).forEach(r => {
          const subscriptions = resourceToSubscription[r]
          if (subscriptions) {
            subscriptions.forEach(subscription => {
              this.debug && console.log('calling subscription', subscription)
              if (!called[subscription.id]) {
                // TODO: should we give all subscribers a copy of the data so they don't pollute the cache by misstake?
                subscription.callback(err, resourceCache[r], subscription.unsubscribeFn)
                called[subscription.id] = true
              }
            })
          }
        })

        return
      },

      fetch: function fetch (resource, callback) {
        this.debug && console.log('fetch', resource)
        const errFunc = (err) => { this._internal.publishError(resource, null, err) }
        const promise = retry(createFetch(currentToken, resource, endpoint, this._context), errFunc, () => { return !this.hasSubscriptions(resource) })
        promise.catch(errFunc)
        return promise
      }
    },

    hasSubscriptions: function hasSubscriptions (resource) {
      const subscriptions = resourceToSubscription[resource]
      return subscriptions && subscriptions.length > 0
    },

    subscribe: function subscribe (resource, callback) {
      this.debug && console.log('subscribe', currentToken, resource, endpoint)
      const sub = {id: nextId(), resource, callback}

      // create an Fn to unsubscribe
      sub.unsubscribeFn = () => unsubscribe(sub.id)

      // subscription.id -> subscription (for unsubscribe)
      subscriptions[sub.id] = sub

      // resource -> subscription (exact mapping)
      resourceToSubscription[resource] = resourceToSubscription[resource] || []
      resourceToSubscription[resource].push(sub)
      // console.log('resourceToSubscription',resourceToSubscription)

      // check cache for this resource
      if (resourceCache[resource]) {
        // console.log("resource found in cache, notify direct")
        callback(null, resourceCache[resource], sub.unsubscribeFn)
        return sub.unsubscribeFn
      }

      // if not found in cache, we call refresh to fetch from the API
      // (only for API resources, i.e starting with a /)
      if (resource[0] === '/') {
        this.refresh(resource)
      }

      // return the unsubscribe function
      return sub.unsubscribeFn
    },

    refresh: function refresh (resource, replace) {
      this.debug && console.log('refresh', resource)
      const errFunc = (err) => { this._internal.publishError(resource, null, err) }
      retry(createFetch(currentToken, resource, endpoint, this._internal._context), errFunc, () => { return !this.hasSubscriptions(resource) })
      .then((response) => setTimeout(() => this._internal.publish(resource, response, null, replace), 0))
      .catch(errFunc)
    },

    create: function create (resource, content) {
      this.debug && console.log('refresh', resource, content)
      const errFunc = (err) => { this._internal.publishError(resource, null, err) }
      let promise = retry(createFetch(currentToken, resource, endpoint, this._internal._context, {method: 'POST', body: content}), errFunc, () => { return !this.hasSubscriptions(resource) })
      promise.then((response) => setTimeout(() => {
        if (response && response.url) {
          this._internal.publish(response.url, response, null)
        }
      }
      , 0))
      promise.catch(errFunc)
      return promise
    },

    update: function update (resource, content) {
      this.debug && console.log('update', resource, content)
      const errFunc = (err) => { this._internal.publishError(resource, null, err) }
      let promise = retry(createFetch(currentToken, resource, endpoint, this._internal._context, {method: 'PUT', body: content}), errFunc, () => { return !this.hasSubscriptions(resource) })
      promise.then((response) => setTimeout(() => this._internal.publish(resource, response, null), 0))
      promise.catch(errFunc)
      return promise
    },

    remove: function remove (resource) {
      this.debug && console.log('remove', resource)
      const errFunc = (err) => { this._internal.publishError(resource, null, err) }
      let promise = retry(createFetch(currentToken, resource, endpoint, this._internal._context, {method: 'DELETE', body: null}), errFunc, () => { return !this.hasSubscriptions(resource) })

      promise.then((response) => setTimeout(() => {
        delete resourceCache[resource]
        this._internal.publish(resource, {}, null, true)
      }, 0))
      promise.catch(errFunc)

      return promise
    },

    clearCache: function clearCache () {
      /* eslint no-multi-spaces: 0 */
      for (let prop in entityCache)       { if (entityCache.hasOwnProperty(prop))       { delete entityCache[prop] } }
      for (let prop in resourceCache)     { if (resourceCache.hasOwnProperty(prop))     { delete resourceCache[prop] } }
      for (let prop in entityToResource)  { if (entityToResource.hasOwnProperty(prop))  { delete entityToResource[prop] } }
    },

    withContext: function withContext (context) {
      let newSession = Object.create(this)
      newSession._internal = Object.create(this._internal)
      newSession._internal._context = Object.assign({}, this._internal._context, context)
      return newSession
    },

    withLocale: function withLocale (locale) {
      return this.withContext({locale: locale})
    },

    setToken: function setToken (newToken) {
      currentToken = newToken
    }
  }
}
