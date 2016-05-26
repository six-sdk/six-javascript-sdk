import {createFetch} from './fetch'
import VersionInfo from './meta-version'

const MAX_RETRIES = 100
const MAX_RETRY_TIMEOUT = 900000// 15 minutes
const RETRY_START_TIMEOUT = 5000
const RETRY_TIMEOUT_INCREMENT = 25000

const retry = function retry (fetchFunc, failFunc) {
  let retryTimeout = global.RETRY_START_TIMEOUT || RETRY_START_TIMEOUT
  let retries = 0
  return new Promise(function (resolve, reject) {
    function doRetry (err) {
      const status = err.details.status
      // status 0 should be transport errors and 5xx server errors
      if ((status === 0 || (status >= 500 && status < 600)) && retries < (global.MAX_RETRIES || MAX_RETRIES)) {
        failFunc(err)
        setTimeout(() => {
          retries++
          if (retryTimeout < (global.MAX_RETRY_TIMEOUT || MAX_RETRY_TIMEOUT)) {
            retryTimeout = retryTimeout + (global.RETRY_TIMEOUT_INCREMENT || RETRY_TIMEOUT_INCREMENT)
          }
          fetchFunc().then(resolve).catch(doRetry)
        }, retryTimeout)
      } else {
        reject(err)
      }
    }
    fetchFunc().then(resolve).catch(doRetry)
  })
}

const deepMerge = function deepMerge (target, source) {
  if (!target) return source
  if (!source) return target

  for (var prop in source) {
    if (source.hasOwnProperty(prop)) {
      if (Array.isArray(source[prop])) {
        target[prop] = source[prop]
      } else if (target[prop] && typeof source[prop] === 'object') {
        deepMerge(target[prop], source[prop])
      } else {
        target[prop] = source[prop]
      }
    }
  }
  return target
}

const mergeIntoArray = function mergeIntoArray (arr, item) {
  if (!arr) return [item]
  let i = arr.indexOf(item)
  if (i === -1) arr.push(item)
  return arr
}

const nextId = (function generateNextId () {
  let id = 0
  return function incrementId () {
    id += 1
    return id
  }
}())

export default function (token, endpoint) {
  let currentToken = token
  // TODO: can we use Map?
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

  // merges new data into the cache
  const merge = function merge (resource, data) {
    let cached = data

    // handle paginated data
    if (data && data.items) {
      // merge items into entityCache
      data.items = data.items.map(item => {
        if (item.url) {
          item = deepMerge(entityCache[item.url], item)
          entityCache[item.url] = item
          entityToResource[item.url] = mergeIntoArray(entityToResource[item.url], resource)
        }
        return item
      })
    } else {
      // merge into entityCache
      if (data && data.url) {
        cached = deepMerge(entityCache[data.url], data)
        entityCache[data.url] = cached
        entityToResource[data.url] = mergeIntoArray(entityToResource[data.url], resource)
      }

      // TODO: below must be done also for items in paginated responses

      // resolve connections with related domain objects
      cached = mergeRelations(cached)

      // domain specific merge (bid/ask)
      cached = mergeDomain(cached)
    }

    // merge into resourceCache
    cached = deepMerge(resourceCache[resource], cached)
    resourceCache[resource] = cached

    return cached
  }

  // merges a cached domain object with the rest of the domain
  // i.e resolves all relations
  const mergeRelations = function mergeRelations (obj) {
    if (!obj) return obj

    // dereference all subresources
    for (var field in obj) {
      if (obj.hasOwnProperty(field) && typeof obj[field] === 'object') {
        if (obj[field] && obj[field].url) {
          let cached = entityCache[obj[field].url]
          if (!cached) {
            entityCache[obj[field].url] = obj[field]
          }
          obj[field] = cached || obj[field]

          // connect subresources back to parent
          if (obj.url) {
            obj[field]._parent = obj.url
          }
        }
      }
    }

    return obj
  }

  // domain-specific merge function, handles Bid/Ask syncing etc
  const mergeDomain = function mergeDomain (obj) {
    if (!obj) return obj

    // Orderbooks Level 1 Bid/Ask should match Quotes Bid/Ask
    let listingWithOrderbook = obj.orderbook ? obj : null

    // special handling for "naked" orderbooks
    if (obj.url && obj.url.endsWith('/orderbook')) {
      let entityUrl = obj.url.substring(0, obj.url.length - '/orderbook'.length)
      listingWithOrderbook = entityCache[entityUrl]

      if (listingWithOrderbook && (!listingWithOrderbook.orderbook)) {
        listingWithOrderbook.orderbook = obj
      }
    }

    if (listingWithOrderbook) {
      if (listingWithOrderbook.quotes && listingWithOrderbook.quotes.bidPrice && listingWithOrderbook.orderbook.levels) {
        listingWithOrderbook.orderbook.levels[0].bidPrice = listingWithOrderbook.quotes.bidPrice
      }
      if (listingWithOrderbook.quotes && listingWithOrderbook.quotes.askPrice && listingWithOrderbook.orderbook.levels) {
        listingWithOrderbook.orderbook.levels[0].askPrice = listingWithOrderbook.quotes.askPrice
      }
    }

    return obj
  }

  return {
    _internal: {
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

      publish: function publish (resource, data, err) {
        // on errors, notify all subscriptions *only* for original resource
        if (err) {
          this.publishError(resource, data, err)
          return
        }

        // merge data into cache
        data = merge(resource, data)

        // Optimize so we don't call callbacks more than once/publish.
        // Not strictly necessary, but helps in tests and debugging
        const called = Object.create(null) // in lieu of Set

        // TODO: should we give all subscribers a copy of the data so they don't pollute the cache by misstake?

        // notify all subscriptions for original resource
        // (not all responses contains an .url field we can map to entities)
        const subscriptions = resourceToSubscription[resource]
        if (subscriptions) {
          subscriptions.forEach(subscription => {
            if (!called[subscription.id]) {
              subscription.callback(err, data, subscription.unsubscribeFn)
              called[subscription.id] = true
            }
          })
        }

        // we need to find the 'root' entity to figure out who to notify
        // i.e publish(/listings/848/orderbook) should notify subscribers of
        // /listings/848 <-- This is the root
        // /listings/848/quotes
        // /listings/848/orderbok
        // etc
        //
        // We find the root by looking for an _parent reference
        const rootEntity = data && (data._parent || data.url)

        if (rootEntity) {
          const root = entityCache[rootEntity]
          if (root && root.url) {
            // notify all subscribers for the root entity itself
            const resources = entityToResource[root.url]
            if (resources) {
              resources.forEach(r => {
                const response = resourceCache[r]
                const subscriptions = resourceToSubscription[r]
                if (subscriptions) {
                  subscriptions.forEach(s => {
                    if (!called[s.id]) {
                      s.callback(err, response, s.unsubscribeFn)
                      called[s.id] = true
                    }
                  })
                }
              })
            }

            // next we traverse the root object looking for references to entities
            // (fields containing object with .url fields)
            // for each reference found we notify any subscribers
            Object.keys(root).forEach(field => {
              if (root[field].url) {
                const resources = entityToResource[root[field].url]
                if (resources) {
                  resources.forEach(resource => {
                    let subscriptions = resourceToSubscription[resource]
                    if (subscriptions) {
                      subscriptions.forEach(subscription => {
                        if (!called[subscription.id]) {
                          subscription.callback(err, resourceCache[resource], subscription.unsubscribeFn)
                          called[subscription.id] = true
                        }
                      })
                    }
                  })
                }
              }
            })
          }
        }

        // if we are publishing a collection-like (population) resource, we need to iterate over
        // all the contained entities and notify all subscribers
        if (data) {
          const entities = data.items ? data.items : (data.url ? [data] : [])

          entities.forEach(entity => {
            const resources = entityToResource[entity.url]
            if (resources) {
              resources.forEach(r => {
                const response = resourceCache[r]
                let subscriptions = resourceToSubscription[r]
                if (subscriptions) {
                  subscriptions.forEach(s => {
                    if (!called[s.id]) {
                      s.callback(err, response, s.unsubscribeFn)
                      called[s.id] = true
                    }
                  })
                }
              })
            }
          })
        }
      },

      fetch: function fetch (resource, callback) {
        this.debug && console.log('fetch', resource)
        const errFunc = (err) => { this._internal.publishError(resource, null, err) }
        const promise = retry(createFetch(currentToken, resource, endpoint, this._context), errFunc)
        promise.catch(errFunc)
        return promise
      }
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

    refresh: function refresh (resource) {
      this.debug && console.log('refresh', resource)
      const errFunc = (err) => { this._internal.publishError(resource, null, err) }
      retry(createFetch(currentToken, resource, endpoint, this._internal._context), errFunc)
      .then((response) => setTimeout(() => this._internal.publish(resource, response, null), 0))
      .catch(errFunc)
    },

    create: function create (resource, content) {
      this.debug && console.log('refresh', resource, content)
      const errFunc = (err) => { this._internal.publishError(resource, null, err) }
      let promise = retry(createFetch(currentToken, resource, endpoint, this._internal._context, {method: 'POST', body: content}), errFunc)
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
      let promise = retry(createFetch(currentToken, resource, endpoint, this._internal._context, {method: 'PUT', body: content}), errFunc)
      promise.then((response) => setTimeout(() => this._internal.publish(resource, response, null), 0))
      promise.catch(errFunc)
      return promise
    },

    remove: function remove (resource) {
      this.debug && console.log('remove', resource)
      const errFunc = (err) => { this._internal.publishError(resource, null, err) }
      let promise = retry(createFetch(currentToken, resource, endpoint, this._internal._context, {method: 'DELETE', body: null}), errFunc)

      promise.then((response) => setTimeout(() => {
        delete resourceCache[resource]
        this._internal.publish(resource, null, null)
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

    setToken: function setToken (newToken) {
      currentToken = newToken
    }
  }
}
