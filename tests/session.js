import { expect } from 'chai';
import sinon from 'sinon';
import jsdom from 'mocha-jsdom'

import FakeXMLHttpRequest from './fake-xml-http-request'

import SDK from '../src'

// test the mock first
describe('FakeXMLHttpRequest', () => {})

describe('subscribe(resource,[callback])',() => {
  const TOKEN = 'fake-token'
  const response = {id: '848', url: '/listing/848'}
  let session = null
  let clock

  // restore xhr
  const xhr = global.XMLHttpRequest

  beforeEach(() => {
    session = SDK.connect(TOKEN)
    global.XMLHttpRequest = FakeXMLHttpRequest()
  });

  afterEach(() => {
    global.XMLHttpRequest = xhr
  });

  it('should fetch from API',(done) => {
    session.subscribe('/listings/848',(err,data) => {
      expect(data).to.exist
      expect(data.id).to.equal('848')
      done()
    })

    XMLHttpRequest.respondWith(response)
  })

  it('should send correct auth headers',() => {
    session.subscribe('/listings/848',() => {})
    let request = XMLHttpRequest.requests[0]
    expect(request.headers).to.exist
    expect(request.headers['Authorization']).to.equal('Bearer '+TOKEN)
  })

  it('should use correct endpoint',() => {
    let session = SDK.connect(TOKEN,'custom.endpoint')
    session.subscribe('/resource',() => {})
    let request = XMLHttpRequest.requests[0]
    expect(request.url).to.exist
    expect(request.url).to.equal('custom.endpoint/resource')
  })

  it('should propagate errors',(done) => {
    session.subscribe('/listings/848',(err,data) => {
      expect(data).to.not.exist
      expect(err).to.exist
      expect(err.code).to.equal('AJAX_ERROR')
      done()
    })

    XMLHttpRequest.respondWithError({})
  })

  it('should propagate errors to session error handlers',(done) => {
    const errorSpy = sinon.spy((error) => {
      expect(error).to.exist
      expect(error.code).to.equal('AJAX_ERROR')
      done()
    })
    session.subscribe('error', errorSpy)
    session.subscribe('/listings/848',(err,data) => {
      expect(data).to.not.exist
      expect(err).to.exist
      expect(err.code).to.equal('AJAX_ERROR')
    })

    XMLHttpRequest.respondWithError({})
  })

  it('refresh', (done) => {
    let calls = 0
    session.subscribe('/listings/848',(err,data) => {
      calls++
      expect(data).to.exist
      expect(data.id).to.equal('848')
      if (calls == 2) done()
    })

    XMLHttpRequest.respondWith(response)

    session.refresh('/listings/848')
    XMLHttpRequest.respondWith(response)
  })


  it('should unsubscribe OK', (done) => {
    XMLHttpRequest.respondWith(response)
    XMLHttpRequest.respondWith(response)

    session.subscribe('/listings/848',(err,data,unsubscribe) => {
      expect(data).to.exist
      expect(data.id).to.equal('848')
      unsubscribe()
      done()
    })

    session.refresh('/listings/848')
  })

  describe('retries', () => {
    it('should retry on failure',(done) => {
      global.MAX_RETRIES = 1
      global.RETRY_START_TIMEOUT = 1
      global.RETRY_TIMEOUT_INCREMENT = 1
      const errorSpy = sinon.spy((error) => {
        expect(error).to.exist
        expect(error.code).to.equal('GENERAL_INTERNAL_ERROR')
      })
      session.subscribe('error', errorSpy)
      const callback = sinon.spy()
      session.subscribe('/listings/848', callback)

      XMLHttpRequest.respondWith('{  "requestId" : "5d269742-8311-4065-84dd-6493b287fad6",  "httpStatusCode" : 500,  "code" : "GENERAL_INTERNAL_ERROR",  "title" : "General error",  "description" : "A general internal server error occured. "}', 500)
      XMLHttpRequest.respondWith(response)

      setTimeout(() => {
        // request successful
        expect(callback.called).to.be.true
        expect(errorSpy.calledOnce).to.be.true
        expect(callback.calledTwice).to.be.true
        done()
      }, 15)
    })

    it('should abort retry on unsubscribe',(done) => {
      global.MAX_RETRIES = 10
      global.RETRY_START_TIMEOUT = 1
      global.RETRY_TIMEOUT_INCREMENT = 1
      let errorCalls = 0;
      const errorSpy = sinon.spy((error) => {
        errorCalls++
        expect(error).to.exist
        if (errorCalls === 1) {
          expect(error.code).to.equal('GENERAL_INTERNAL_ERROR')
        } else if (errorCalls === 2) {
          expect(error.code).to.equal('ABORTED')
        } else {
          assert.fail(error, null, 'Too many error calls')
        }
      })
      session.subscribe('error', errorSpy)
      const callback = sinon.spy()
      const unsub = session.subscribe('/listings/848', callback)
      XMLHttpRequest.respondWith('{  "requestId" : "5d269742-8311-4065-84dd-6493b287fad6",  "httpStatusCode" : 500,  "code" : "GENERAL_INTERNAL_ERROR",  "title" : "General error",  "description" : "A general internal server error occured. "}', 500)
      setTimeout(() => {
        unsub()
        XMLHttpRequest.respondWith('{  "requestId" : "5d269742-8311-4065-84dd-6493b287fad6",  "httpStatusCode" : 500,  "code" : "GENERAL_INTERNAL_ERROR",  "title" : "General error",  "description" : "A general internal server error occured. "}', 500)
      }, 0)

      setTimeout(() => {
        expect(callback.called).to.be.true
        expect(errorSpy.calledOnce).to.be.false
        done()
      }, 15)
    })

    it('should not retry on user error',(done) => {
      global.MAX_RETRIES = 1
      global.RETRY_START_TIMEOUT = 1
      global.RETRY_TIMEOUT_INCREMENT = 1
      const errorSpy = sinon.spy((error) => {
        expect(error).to.exist
        expect(error.code).to.equal('AJAX_ERROR')
      })
      session.subscribe('error', errorSpy)
      const callback = sinon.spy()
      session.subscribe('/listings/848', callback)

      // bad request
      XMLHttpRequest.respondWithError({}, 400)

      // this request should not be executed
      XMLHttpRequest.respondWith(response)

      setTimeout(() => {
        // request failed
        expect(callback.calledOnce).to.be.true
      }, 2)
      setTimeout(() => {
        // no new request
        expect(callback.calledTwice).to.be.false
        expect(errorSpy.calledOnce).to.be.true
        done()
      }, 10)
    })
  })

  describe('onSessionExpired', () => {
    it('should call onSessionExpired on 401 errors',(done) => {
      session.subscribe('session-expired', (err, data) => {
        session.setToken('new-token')
        expect(data).to.not.exist
        expect(err).to.exist
        expect(err.code).to.equal('AJAX_ERROR')
      })
      session.subscribe('/listings/848',(err,data) => {
        expect(data).to.not.exist
        expect(err).to.exist
        expect(err.code).to.equal('AJAX_ERROR')
      })

      XMLHttpRequest.respondWithError({}, 401)

      setTimeout(() => {
        expect(session._internal.getToken()).to.equal('new-token')
        done()
      }, 0)
    })

    it('should set the token in all instances',(done) => {
      const newContext = session.withContext({})
      session.subscribe('session-expired', (err, data) => {
        session.setToken('new-token')
        expect(data).to.not.exist
        expect(err).to.exist
        expect(err.code).to.equal('AJAX_ERROR')
      })
      session.subscribe('/listings/848',(err,data) => {
        expect(data).to.not.exist
        expect(err).to.exist
        expect(err.code).to.equal('AJAX_ERROR')
      })

      XMLHttpRequest.respondWithError({}, 401)

      setTimeout(() => {
        expect(session._internal.getToken()).to.equal('new-token')
        expect(newContext._internal.getToken()).to.equal('new-token')
        done()
      }, 0)
    })
  })
})
