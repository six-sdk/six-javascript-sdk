import {fetch} from './fetch'

export default function (token, endpoint) {
  // const subscriptions = {}

  const unsubscribe = function (id) {
    console.log('unsubscribe', id)
  }

  return {
    subscribe: function subscribe (resource, callback) {
      console.log('subscribe', token, resource, endpoint)

      const unsubFn = () => unsubscribe('foo')

      fetch(token, resource, endpoint)
      .then((response) => window.setTimeout(() => callback(null, response, unsubFn), 0))
      .catch((err) => window.setTimeout(() => callback(err, null, unsubFn), 0))

      return unsubFn
    },

    refresh: function refresh (resource) {
      console.log('refresh', resource)
    },

    clearCache: function clearCache () {
      console.log('clearCache')
    }
  }
}

// cache
// refresh
// unsubscribe
// mergeFn
