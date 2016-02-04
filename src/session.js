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
      console.log('unsubscribe', id, subscription)
      delete subscriptions[id]

      // remove resource -> subscription mapping
      resourceToSubscription[subscription.resource] = resourceToSubscription[subscription.resource].filter(s => !(s.id == id))

      // const subs = resourceToSubscription[subscription.resource]
      // let index =
      // for (let i=0; i < subs.length; i += 1) {
      //   if (subs[i].id === id) {
      //     index = i
      //     break
      //   }
      // }
      //
      // console.log('found index',index,subs)
      //
      // if (index > -1) {
      //   subs.splice(index,1)
      // }

      // TODO: remove entity -> subscription mapping
    }
  }

  // merges new data into the cache
  const merge = function(resource,data) {
    console.log('merge',resource,data)
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

    // merge into resourceCache
    // TODO: only cache exact mapping? Or should we cut the query part
    cached = deepMerge(resourceCache[resource],data)
    resourceCache[resource] = cached

    return cached
  }

  return {
    _internal: {
      publish: function(resource,data,err) {
        // on errors, *only* notify all subscriptions for original resource
        if (err) {
          let subscriptions = resourceToSubscription[resource]
          console.log('notify all subscriptions for original resource',subscriptions)
          if (subscriptions) {
            subscriptions.forEach(s => s.callback(err,data,s.unsubscribeFn))
          }
          return
        }

        //merge data into cache
        data = merge(resource,data)
        console.log('merge done',resource,data)

        // TODO: is there any incitaments to optimize so we don't call callbacks more than once/publish?

        // notify all subscriptions for original resource
        let subscriptions = resourceToSubscription[resource]
        console.log('notify all subscriptions for original resource',subscriptions)
        if (subscriptions) {
          subscriptions.forEach(s => s.callback(err,data,s.unsubscribeFn))
        }

        // notify all subscriptions that have mapping (via entityToResource) to any of the entities
        const entities = data.items ? data.items : (data.url ? [data] : [])
        console.log('notify all subscriptions that have mapping to any of the enitities',entities)

        entities.forEach(entity => {
          const resources = entityToResource[entity.url]
          console.log('notify for entity',entity.url,resources)
          if (resources) {
            resources.forEach(r => {
              const response = resourceCache[r]
              subscriptions = resourceToSubscription[r]
              if (subscriptions) {
                subscriptions.forEach(s => s.callback(err,response,s.unsubscribeFn))
              }
            })
          }
        })

      },
    },

    subscribe: function subscribe (resource, callback) {
      console.log('subscribe', token, resource, endpoint)
      const sub = {id: nextId(), resource, callback}

      console.log('sub',sub)

      // create an Fn to unsubscribe
      sub.unsubscribeFn = () => unsubscribe(sub.id)

      // subscription.id -> subscription (for unsubscribe)
      subscriptions[sub.id] = sub

      // resource -> subscription (exact mapping)
      resourceToSubscription[resource] = resourceToSubscription[resource] || []
      resourceToSubscription[resource].push(sub)

      console.log('resourceToSubscription',resourceToSubscription)

      if (resourceCache[resource]) {
        console.log("resource found in cache, notify direct")
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
      console.log('clearCache')
      for (var prop in entityCache)       { if (entityCache.hasOwnProperty(prop))       { delete entityCache[prop] } }
      for (var prop in resourceCache)     { if (resourceCache.hasOwnProperty(prop))     { delete resourceCache[prop] } }
      for (var prop in entityToResource)  { if (entityToResource.hasOwnProperty(prop))  { delete entityToResource[prop] } }
    }
  }
}
