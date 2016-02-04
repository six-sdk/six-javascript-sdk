// moch XMLHttpRequest (so, sinon have it's own fake XMLHttpRequest and server, but this is so much simpler)
function FakeXMLHttpRequest() {
  let requests = [];

  return class  {
    static requests = requests;

    open(method,url) {
      requests.push({method,url,instance: this})
    }

    send() {}

    setRequestHeader(header,value) {
      let request = requests[requests.length-1]
      request.headers = request.headers || {}
      request.headers[header] = request.headers[header] ? [request.headers[header],value] : value
    }

    static respondWith(response = {}, status = 200) {
      let request = requests.shift()
      if (!request) throw new Error("No pending requests")
      request.instance.responseText = (typeof response === 'string' || response instanceof String) ? response : JSON.stringify(response)
      request.instance.status = status
      request.instance.onload({})
    }

    static respondWithError(response = {}, status = 500) {
      let request = requests.shift()
      if (!request) throw new Error("No pending requests")
      request.instance.responseText = (typeof response === 'string' || response instanceof String) ? response : JSON.stringify(response)
      request.instance.status = status
      request.instance.onerror({})
    }
  }
}

export default FakeXMLHttpRequest
