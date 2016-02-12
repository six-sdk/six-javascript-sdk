import { expect } from 'chai';
import sinon from 'sinon';
import jsdom from 'mocha-jsdom'


import SDK from '../src'

// Running a couple of real requests against the API so we
// can test our XHR in different browsers
describe.skip('SDK Live Requests', () => {

  jsdom()

  let session = false

  beforeEach((done) => {
    SDK._internal.authenticateWithCredentials('','', (token,err) => {
      session = SDK.connect(token)
      console.log('session ready',token,err)
      done()
    })
  })

  it('should authenticate OK', () => {
    expect(window.TOKEN).to.exist
  })

  it('should be able to fetch /listings/848', (done) => {
    session.subscribe('/listings/848',(err,listing) => {
      expect(listing.id).to.equal('848')
      expect(listing.name).to.equal('ERIC B')
      done()
    })
  })
})
