import {fetch} from './fetch'

const deepMerge = function deepMerge (target, source) {
  if (!target) return source
  if (!source) return target

  for (var prop in source) {
      if (source.hasOwnProperty(prop)) {
          if (target[prop] && typeof source[prop] === 'object') {
              deepMerge(target[prop], source[prop]);
          }
          // TODO: handle arrays?
          else {
              target[prop] = source[prop];
          }
      }
  }
  return target;
}

const mergeIntoArray = function mergeIntoArray (arr,item) {
  if (!arr) return [item]
  let i = arr.indexOf(item)
  if (i == -1) arr.push(item)
  return arr
}

const nextId = function() {
  let id = 0
  return function() {
    id += 1
    return id
  }
}()

export default function (token, endpoint) {
  //TODO: can we use Map?
  const subscriptions = {}
  const resourceToSubscription = {}

  // cache
  const entityCache = {} // entity.url -> entity
  const resourceCache = {} // resource -> response
  const entityToResource = {} // entity.url -> resource

  window.subscriptions = subscriptions
  window.resourceToSubscription = resourceToSubscription
  window.entityCache = entityCache
  window.resourceCache = resourceCache
  window.entityToResource = entityToResource

  const unsubscribe = function (id) {
    const subscription = subscriptions[id]
    if (subscription) {
      delete subscriptions[id]

      // remove resource -> subscription mapping
      resourceToSubscription[subscription.resource] = resourceToSubscription[subscription.resource].filter(s => !(s.id == id))
    }
  }

  // merges new data into the cache
  const merge = function(resource,data) {
    let cached = data

    // merge into entityCache
    if (data && data.items) {
      data.items = data.items.map(item => {
        if (item.url) {
          item = deepMerge(entityCache[item.url],item)
          entityCache[item.url] = item
          entityToResource[item.url] = mergeIntoArray(entityToResource[item.url],resource)
        }
        return item
      })
    }

    if (data && data.url) {
      cached = deepMerge(entityCache[data.url],data)
      entityCache[data.url] = cached
      entityToResource[data.url] = mergeIntoArray(entityToResource[data.url],resource)
    }

    // resolve connections with related domain objects
    cached = mergeRelations(cached)

    // domain specific merge (bid/ask)
    cached = mergeDomain(cached)

    // merge into resourceCache
    // TODO: only cache exact mapping? Or should we cut the query part
    cached = deepMerge(resourceCache[resource],cached)
    resourceCache[resource] = cached

    return cached
  }

  // merges a cached domain object with the rest of the domain
  // i.e resolves all relations
  const mergeRelations = function mergeRelations(obj) {
    if (!obj) return obj

    // de-reference all subresouces
    for (var field in obj) {
      if (obj.hasOwnProperty(field) && typeof obj[field] === 'object') {
        if (obj[field] && obj[field].url) {
          let cached = entityCache[obj[field].url]
          if (!cached) entityCache[obj[field].url] = obj[field]
          obj[field] =  cached || obj[field]
        }
      }
    }

    return obj
  }

  // domain-specific merge function, handles Bid/Ask syncing etc
  const mergeDomain = function mergeDomain(obj) {
    if (!obj) return obj

    // Orderbooks Level 1 Bid/Ask should match Quotes Bid/Ask
    let listingWithOrderbook = obj.orderbook ? obj: null
    if (obj.url && obj.url.endsWith("/orderbook")) {
      listingWithOrderbook = entityCache[obj.url.substr(0,"/orderbook".length)]
    }

    if (listingWithOrderbook) {
      if (listingWithOrderbook.quotes && listingWithOrderbook.quotes.bidPrice) {
        listingWithOrderbook.orderbook.levels[0].bidPrice = listingWithOrderbook.quotes.bidPrice
      }
      if (listingWithOrderbook.quotes && listingWithOrderbook.quotes.askPrice) {
        listingWithOrderbook.orderbook.levels[0].askPrice = listingWithOrderbook.quotes.askPrice
      }
    }

    return obj
  }

  return {
    _internal: {
      publish: function(resource,data,err) {
        // on errors, *only* notify all subscriptions for original resource
        if (err) {
          let subscriptions = resourceToSubscription[resource]
          //console.log('notify all subscriptions for original resource',subscriptions)
          if (subscriptions) {
            subscriptions.forEach(s => s.callback(err,data,s.unsubscribeFn))
          }
          return
        }

        //merge data into cache
        data = merge(resource,data)

        // Optimize so we don't call callbacks more than once/publish.
        // Not strictly neccesary, but helps in tests and debugging
        const called = Object.create(null) // in lieu of Set

        // TODO: should we give all subscribers a copy of the data so they don't pollute the cache by misstake?
        // data = Object.create(data)

        // notify all subscriptions for original resource
        let subscriptions = resourceToSubscription[resource]
        //console.log('notify all subscriptions for original resource',subscriptions)
        if (subscriptions) {
          subscriptions.forEach(s => {
            if (!called[s.id]) {
              s.callback(err,data,s.unsubscribeFn)
              called[s.id] = true
            }
          })
        }

        // notify all subscriptions that have mapping (via entityToResource) to any of the entities
        const entities = data.items ? data.items : (data.url ? [data] : [])
        //console.log('notify all subscriptions that have mapping to any of the enitities',entities)

        entities.forEach(entity => {
          const resources = entityToResource[entity.url]
          //console.log('notify for entity',entity.url,resources)
          if (resources) {
            resources.forEach(r => {
              const response = resourceCache[r]
              subscriptions = resourceToSubscription[r]
              subscriptions.forEach(s => {
                if (!called[s.id]) {
                  s.callback(err,response,s.unsubscribeFn)
                  called[s.id] = true
                }
              })
            })
          }
        })

      },
    },

    subscribe: function subscribe (resource, callback) {
      console.log('subscribe', token, resource, endpoint)
      const sub = {id: nextId(), resource, callback}

      // create an Fn to unsubscribe
      sub.unsubscribeFn = () => unsubscribe(sub.id)

      // subscription.id -> subscription (for unsubscribe)
      subscriptions[sub.id] = sub

      // resource -> subscription (exact mapping)
      resourceToSubscription[resource] = resourceToSubscription[resource] || []
      resourceToSubscription[resource].push(sub)

      //console.log('resourceToSubscription',resourceToSubscription)

      if (resourceCache[resource]) {
        //console.log("resource found in cache, notify direct")
        callback(null,resourceCache[resource],sub.unsubscribeFn)
        return sub.unsubscribeFn
      }

      // if not found in cache, we call refresh to fetch from the API
      this.refresh(resource)

      // return the unsubscribe function
      return sub.unsubscribeFn
    },

    refresh: function refresh (resource) {
      console.log('refresh', resource)
      fetch(token, resource, endpoint)
      .then((response) => setTimeout(() => this._internal.publish(resource,response,null), 0))
      .catch((err) => setTimeout(() => this._internal.publish(resource,null,err), 0))
    },

    clearCache: function clearCache () {
      for (var prop in entityCache)       { if (entityCache.hasOwnProperty(prop))       { delete entityCache[prop] } }
      for (var prop in resourceCache)     { if (resourceCache.hasOwnProperty(prop))     { delete resourceCache[prop] } }
      for (var prop in entityToResource)  { if (entityToResource.hasOwnProperty(prop))  { delete entityToResource[prop] } }
    }
  }
}
