import { expect } from 'chai';
import sinon from 'sinon';
import jsdom from 'mocha-jsdom'

import FakeXMLHttpRequest from './fake-xml-http-request'
import { fetch } from '../src/fetch';

const error = '{' +
  '"requestId" : "5d269742-8311-4065-84dd-6493b287fad6",' +
  '"httpStatusCode" : 500,' +
  '"code" : "GENERAL_INTERNAL_ERROR",' +
  '"title" : "General error",' +
  '"description" : "A general internal server error occured. "' +
'}'

describe('when receiving error from api', function api_errors() {
  const xhr = global.XMLHttpRequest
  const token = 'token'
  const endpoint = 'http://endpoint'
  const url = '/some-resource'
  const context = {}
  beforeEach(function setup() {
    global.XMLHttpRequest = FakeXMLHttpRequest()
  })
  afterEach(function teardown() {
    global.XMLHttpRequest = xhr
  })

  it('should add details to the error object', function test_has_details_on_error_object(done) {
    let subject = fetch(token, url, endpoint, context)
    subject.then(function success (data) {
      assert.fail('This should have failed')
    })
    subject.catch(function failed (err) {
      expect(err.details).to.exist
      expect(err.details.status).to.equal(500)
      expect(err.requestId).to.equal('5d269742-8311-4065-84dd-6493b287fad6')
      done()
    })
    XMLHttpRequest.respondWith(error, 500)

  })
})
