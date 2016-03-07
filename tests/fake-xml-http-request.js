// moch XMLHttpRequest (so, sinon have it's own fake XMLHttpRequest and server, but this is so much simpler)
function FakeXMLHttpRequest() {
  let requests = []
  let responses = []

  return class  {
    static requests = requests;

    open(method,url) {
      requests.push({method,url,instance: this})
    }

    send() {
      // any pending responses?
      let response = responses.shift()
      if (response) response(requests.shift())
    }

    setRequestHeader(header,value) {
      let request = requests[requests.length-1]
      request.headers = request.headers || {}
      request.headers[header] = request.headers[header] ? [request.headers[header],value] : value
    }

    static respondWith(response = {}, status = 200) {
      responses.push(function(request) {
        request.instance.responseText = (typeof response === 'string' || response instanceof String) ? response : JSON.stringify(response)
        request.instance.status = status
        request.instance.onload({})
      })

      // any pending requests ?
      let request = requests.shift()
      if (request) responses.shift()(request)
    }

    static respondWithError(response = {}, status = 500) {
      responses.push(function(request) {
        request.instance.responseText = (typeof response === 'string' || response instanceof String) ? response : JSON.stringify(response)
        request.instance.status = status
        request.instance.onerror({})
      })

      // any pending requests ?
      let request = requests.shift()
      if (request) responses.shift()(request)
    }
  }
}

// nodejs fill for btoa
global.btoa = function (str) {return new Buffer(str).toString('base64');};

export default FakeXMLHttpRequest
