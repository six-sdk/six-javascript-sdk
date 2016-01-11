const ENDPOINT = 'https://api.six.se/v1'

let fetch = function (token, url, {method, body} = {method: 'GET', body: null}) {
  return new Promise(function (resolve, reject) {
    let req = new XMLHttpRequest()

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

export function authenticateWithCredentials (client_id, client_secret) {
  console.warn('never bundle your credentials with your browser code!')
  fetch(null, '/authorization/token', {method: 'POST', body: {client_id: client_id, client_secret: client_secret}})
    .then(({access_token}) => {
      window.TOKEN = access_token
      console.log('got token ', access_token)
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
        .then((response) => callback(null, response, unsubFn))
        .catch((err) => callback(err, null, unsubFn))
    }
  }
}

// cache
// refresh
// unsubscribe
// mergeFn
