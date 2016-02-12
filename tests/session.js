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

})
