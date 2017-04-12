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

  // queue used for batching UI updates
  const batchInterval = 200 // 200ms update interval is an informal SIX best-practice for display products
  let queue = {}
  setInterval(() => {
    // TODO: we can most likely do something more sofisticated here be timing the loop
    // and only publish X items per frame
    const items = Object.values(queue)
    for (let i = 0; i < items.length; i++) {
      items[i].call()
    }
    queue = {}
  }, batchInterval)

  // create a fn that unsubscribes a listener
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
      _entityCache: {}, // entity.url -> entity
      _resourceCache: {}, // resource -> response
      _entityToResource: {}, // entity.url -> resource
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
        const entityCache = this._entityCache
        const resourceCache = this._resourceCache
        const entityToResource = this._entityToResource

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

        // find all entities (recursivly) in the resource we publishing
        const entities = findAllEntitiesIn(data)

        // merge entities into cache
        Object.values(entities).forEach(entity => {
          if (entity.url === data.url) {
            entityCache[entity.url] = deepMerge(entityCache[entity.url], entity, replace)
          } else {
            entityCache[entity.url] = deepMerge(entityCache[entity.url], entity)
          }
        })

        // merge cache into entities
        Object.values(entities).forEach(entity => {
          Object.assign(entity, entityCache[entity.url])
        })

        // resolve all entity references, with entity object instances from the cache
        Object.values(entities).forEach(entity => {
          for (var field in entity) {
            if (entity.hasOwnProperty(field)) {
              if (entity[field] && typeof entity[field] === 'object') {
                if (entity[field].url) {
                  entity[field] = entityCache[entity[field].url] || entity[field]
                }
              }
            }
          }
        })

        // Domain specific, fixup level 1 in all cached listings with orderbooks
        Object.values(entityCache).forEach(e => {
          // check if this entity have quotes and orderbook
          if (e.orderbook && e.orderbook.lastUpdated && e.orderbook.levels && e.orderbook.levels.length > 0) {
            if (e.quotes && e.quotes.lastUpdated) {
              if (e.orderbook.levels[0].bidPrice !== e.quotes.bidPrice || e.orderbook.levels[0].askPrice !== e.quotes.askPrice) {
                // which of the orderbook and quotes have the latest lastUpdated
                if (new Date(e.orderbook.lastUpdated).getTime() > new Date(e.quotes.lastUpdated).getTime()) {
                  // copy orderbook to quotes
                  e.quotes.bidPrice = e.orderbook.levels[0].bidPrice
                  e.quotes.askPrice = e.orderbook.levels[0].askPrice
                  e.quotes.lastUpdated = e.orderbook.lastUpdated
                } else {
                  // copy quotes to orderbook
                  e.orderbook.levels[0].bidPrice = e.quotes.bidPrice
                  e.orderbook.levels[0].askPrice = e.quotes.askPrice
                  e.orderbook.lastUpdated = e.quotes.lastUpdated
                }
              }
            }
          }
        })

        // entityToResource mapping
        Object.values(entities).forEach(entity => {
          entityToResource[entity.url] = entityToResource[entity.url] || {}
          entityToResource[entity.url][resource] = true
        })

        // update the resourceCache not all resources are entities,
        // for them we just merge into the resourceCache
        if (data.url) {
          resourceCache[resource] = entities[data.url]
        } else {
          resourceCache[resource] = deepMerge(resourceCache[resource], data, replace)
        }

        // fixup all references from resourceCache to entityCache
        Object.keys(resourceCache).forEach(key => {
          if (resourceCache[key].url) {
            const cachedEntity = entityCache[resourceCache[key].url]
            if (cachedEntity) {
              resourceCache[key] = cachedEntity
            }
          }
        })

        // fetch all resources to notify subscribers for
        const resourcesToNotify = Object.create(null) // in lieu of Set
        Object.values(entities).forEach(entity => {
          Object.keys(entityToResource[entity.url]).forEach(r => (resourcesToNotify[r] = true))
        })

        // domain specific
        // if we are publishing quotes, make sure to notify subscribers of orderbook also
        if (resource.endsWith('/quotes')) {
          const listingUrl = resource.substring(0, resource.length - '/quotes'.length)
          Object.keys(resourceCache).forEach(resource => {
            if (resource.startsWith(listingUrl)) {
              resourcesToNotify[resource] = true
            }
          })
        }

        // domain specific
        // if we are publishing quotes, make sure to notify subscribers of orderbook also
        if (resource.endsWith('/orderbook')) {
          const listingUrl = resource.substring(0, resource.length - '/orderbook'.length)
          Object.keys(resourceCache).forEach(resource => {
            if (resource.startsWith(listingUrl)) {
              resourcesToNotify[resource] = true
            }
          })
        }

        // always notify all subscriptions for original resource
        // (not all responses contains an .url field we can map to entities)
        resourcesToNotify[resource] = true

        // Optimize so we don't call callbacks more than once per publish.
        // Not strictly necessary, but improves performance and unit tests
        const called = Object.create(null) // in lieu of Set

        // notify all subscriptions
        Object.keys(resourcesToNotify).forEach(r => {
          const subscriptions = resourceToSubscription[r]
          if (subscriptions) {
            subscriptions.forEach(subscription => {
              if (!called[subscription.id]) {
                queue[subscription.id] = () => subscription.callback(err, resourceCache[r], subscription.unsubscribeFn)
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
      const resourceCache = this._internal._resourceCache

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
        delete this._internal._resourceCache[resource]
        this._internal.publish(resource, {}, null, true)
      }, 0))
      promise.catch(errFunc)

      return promise
    },

    clearCache: function clearCache () {
      this._internal._entityCache = {}
      this._internal._resourceCache = {}
      this._internal._entityToResource = {}
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
