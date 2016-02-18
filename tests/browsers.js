import { expect } from 'chai';
import sinon from 'sinon';
import jsdom from 'mocha-jsdom'


import SDK from '../src'

// only run "live" test when we have CLIENT_ID and CLIENT_SECRET env
if (process.env.CLIENT_ID && process.env.CLIENT_SECRET) {
  // Running a couple of real requests against the API so we
  // can test our XHR in different browsers
  describe('SDK Live Requests', () => {

    jsdom()

    let session = false

    beforeEach((done) => {
      console.log('here..')
      SDK._internal.authenticateWithCredentials(process.env.CLIENT_ID,process.env.CLIENT_SECRET, (token,err) => {
        console.log('here.. 2')
        session = SDK.connect(token)
        console.log('session ready',token,err)
        done()
      })
    })

    it('should authenticate OK', () => {
      console.log('here.. 3')
      expect(window.TOKEN).to.exist
    })

    it('should be able to fetch /listings/848', (done) => {
      console.log('here.. 4')
      session.subscribe('/listings/848',(err,listing) => {
        expect(listing.id).to.equal('848')
        expect(listing.name).to.equal('ERIC B')
        done()
      })
    })
  })

} else {
  console.log("Missing CLIENT_Id and CLIENT_SECRET from env, so we skip the \"Live\" tests")
}
