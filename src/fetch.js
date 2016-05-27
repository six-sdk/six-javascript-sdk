// function createXHR() {
//   var xhr = new XMLHttpRequest();
//   if ("withCredentials" in xhr) {
//     // Most browsers.
//   } else if (typeof XDomainRequest != "undefined") {
//     // IE8 & IE9
//     xhr = new XDomainRequest();
//   }
//   return xhr;
// }

export const fetch = function fetch (token, url, endpoint, context, {method, body} = {method: 'GET', body: null}) {
  return new Promise(function (resolve, reject) {
    let req = new XMLHttpRequest()

    req.onerror = (event) => {
      reject({
        code: 'AJAX_ERROR',
        title: 'Request to endpoint failed',
        description: 'The request failed. Check that the endpoint is valid?',
        details: {
          endpoint,
          url,
          status: req.status
        }
      })
    }

    req.ontimeout = (event) => {
      reject({
        code: 'AJAX_ERROR',
        title: 'Request to endpoint timed out',
        description: 'The request timed out. Check that the endpoint is valid?',
        details: {
          endpoint,
          url,
          status: req.status
        }
      })
    }

    req.onload = () => {
      // Content-Type
      const contentType = req.getResponseHeader('Content-Type') || 'text/plain'

      // status OK?
      if (req.status >= 200 && req.status < 400) {
        // The 204 response MUST NOT include a message-body ...
        if (req.status === 204) {
          resolve(null)
        }

        try {
          if (contentType.startsWith('text/plain')) {
            resolve(req.responseText)
          } else {
            resolve(JSON.parse(req.responseText))
          }
        } catch (e) {
          reject({
            code: 'INVALID_RESPONSE',
            title: "Response isn't valid JSON",
            description: "The response couldn't be parsed into an Javascript object. Check that the endpoint is valid?",
            details: {
              endpoint,
              url,
              responseText: req.responseText,
              status: req.status
            }
          })
        }
      } else {
        try {
          if (contentType.startsWith('text/plain')) {
            reject(req.responseText)
          } else {
            reject(JSON.parse(req.responseText))
          }
        } catch (e) {
          reject({
            code: 'INVALID_RESPONSE',
            title: "Response isn't valid JSON",
            description: "The response couldn't be parsed into an Javascript object. Check that the endpoint is valid?",
            details: {
              endpoint,
              url,
              responseText: req.responseText,
              status: req.status
            }
          })
        }
      }
    }

    req.open(method, endpoint + url, true)
    req.setRequestHeader('Content-Type', 'application/json')

    if (token) {
      req.setRequestHeader('Authorization', 'Bearer ' + token)
    }

    if (context) {
      req.setRequestHeader('Context', window.btoa(JSON.stringify(context)))
    }

    if (body) {
      let content = (Object.prototype.toString.call(body) === '[object String]') ? body : JSON.stringify(body)
      req.send(content)
    } else {
      req.send()
    }
  })
}

export const createFetch = function createFetch (token, url, endpoint, context, {method, body} = {method: 'GET', body: null}) {
  return function savedFetch () {
    return fetch(token, url, endpoint, context, {method, body})
  }
}
