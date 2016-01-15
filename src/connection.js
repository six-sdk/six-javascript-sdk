const ENDPOINT = 'https://api.six.se/v1'

let fetch = function (token, url, {method, body} = {method: 'GET', body: null}) {
  return new Promise(function (resolve, reject) {
    let req = new window.XMLHttpRequest()

    req.onerror = (event) => reject(req)
    req.onload = () => {
      if (req.status >= 200 && req.status < 400) {
        resolve(JSON.parse(req.responseText))
      } else {
        reject(req)
      }
    }

    req.open(method, ENDPOINT + url, true)
    req.setRequestHeader('Content-Type', 'application/json')
    if (token) {
      req.setRequestHeader('Authorization', 'Bearer ' + token)
    }
    if (body) {
      req.send(JSON.stringify(body))
    } else {
      req.send()
    }
  })
}

export function authenticateWithCredentials (client_id, client_secret, callback) {
  console.warn('never bundle your credentials with your browser code!')
  fetch(null, '/authorization/token', {method: 'POST', body: {client_id: client_id, client_secret: client_secret}})
    .then(({access_token}) => {
      window.TOKEN = access_token
      console.log('got token ', access_token)
      if (callback) {
        callback(access_token)
      }
    })
}

export default function (token) {
  // const subscriptions = {}

  const unsubscribe = function (id) {
    console.log('unsubscribe', id)
  }

  return {
    subscribe: function subscribe (resource, callback) {
      console.log('subscribe', token, resource)

      const unsubFn = () => unsubscribe('foo')

      fetch(token, resource)
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
