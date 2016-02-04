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

  it('fetches from API',(done) => {
    session.subscribe('/listings/848',(err,data) => {
      expect(data).to.exist
      expect(data.id).to.equal('848')
      done()
    })

    XMLHttpRequest.respondWith(response)
  })

  it('sends correct auth headers',() => {
    session.subscribe('/listings/848',() => {})
    let request = XMLHttpRequest.requests[0]
    expect(request.headers).to.exist
    expect(request.headers['Authorization']).to.equal('Bearer '+TOKEN)
  })

  it('sends uses correct endpoint',() => {
    let session = SDK.connect(TOKEN,'custom.endpoint')
    session.subscribe('/resource',() => {})
    let request = XMLHttpRequest.requests[0]
    expect(request.url).to.exist
    expect(request.url).to.equal('custom.endpoint/resource')
  })

  it('propagates errors',(done) => {
    session.subscribe('/listings/848',(err,data) => {
      expect(data).to.not.exist
      expect(err).to.exist
      expect(err.code).to.equal('AJAX_ERROR')
      done()
    })

    XMLHttpRequest.respondWithError({})
  })

  it('unsubscribes OK')
  it('fetches from Cache')
})
