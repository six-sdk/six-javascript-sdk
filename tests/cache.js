import { expect } from 'chai';
import sinon from 'sinon';
import jsdom from 'mocha-jsdom'

import FakeXMLHttpRequest from './fake-xml-http-request'

import SDK from '../src'

global.window = global || {}

export const defer = function defer(fn) {
  window.setTimeout(fn, 10)
}

describe('cache',() => {
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

  it('should support two subscribers for same entity resource',(done) => {
    const QUOTES = {url: '/listings/848/quotes'}

    // queue up some responses
    XMLHttpRequest.respondWith(QUOTES)

    let called = 0
    session.subscribe('/listing/848',(e,listing) => {
      session.subscribe('/listing/848',(e,listing2) => {
        if (called++) return // ignore second call
        expect(listing).to.exist
        expect(listing2).to.exist
        expect(listing === listing2).to.be.true
        done()
      })
    })
  })

  it('should support two subscribers for same population resource', (done) => {
    const POPULATION = {
      url: '/pop',
      items:[ {url: '/listings/847'}, {url: '/listings/848'}]
    }

    // queue up some responses
    XMLHttpRequest.respondWith(POPULATION)

    let called = 0
    session.subscribe('/pop',(e,population) => {
      session.subscribe('/pop',(e,population2) => {
        if (called++) return // ignore second call
        expect(population).to.exist
        expect(population2).to.exist
        expect(population === population2).to.be.true
        done()
      })
    })
  })

  describe("should give same object to subscribers for population + entity resource", () => {

    it('population then entity', (done) => {
      const LISTING = {url: '/listings/848', foo: 'bar'}
      const POPULATION = {
        url: '/pop',
        items:[ {url: '/listings/848'}, {url: '/listings/847'}]
      }

      // queue up some responses
      XMLHttpRequest.respondWith(POPULATION)
      XMLHttpRequest.respondWith(LISTING)

      let called = 0
      session.subscribe('/pop',(e,population) => {
        session.subscribe('/listings/848',(e,listing2) => {
          if (called++) return // ignore second call
          expect(population).to.exist
          expect(listing2).to.exist
          expect(population.items[0] === listing2).to.be.true
          done()
        })
      })
    })

    it('entity then resource', (done) => {
      const LISTING = {url: '/listings/848', foo: 'bar'}
      const POPULATION = {
        url: '/pop',
        items:[ {url: '/listings/848'}, {url: '/listings/847'}]
      }

      // queue up some responses
      XMLHttpRequest.respondWith(LISTING)
      XMLHttpRequest.respondWith(POPULATION)

      let called = 0
      session.subscribe('/listings/848',(e,listing2) => {
        session.subscribe('/pop',(e,population) => {
          if (called++) return // ignore second call
          expect(population).to.exist
          expect(listing2).to.exist
          expect(population.items[0] === listing2).to.be.true
          done()
        })
      })
    })
  })

  it('should give same object to subscriber for entity and  entity/relation', (done) => {
    const QUOTES = {url: '/listings/848/quotes'}
    const LISTING = {url: '/listings/848', quotes: QUOTES}

    // queue up some responses
    XMLHttpRequest.respondWith(LISTING)
    XMLHttpRequest.respondWith(QUOTES)

    session.subscribe('/listing/848',(e,listing) => {
      session.subscribe('/listing/848/quotes',(e,quotes) => {
        expect(listing).to.exist
        expect(quotes).to.exist
        expect(listing.quotes === quotes).to.be.true
        done()
      })
    })
  })

  it('should support two subscribers for same entity resource with missing urls',(done) => {
    const QUOTES = {url: '/listings/848/quotes'}

    // queue up some responses
    XMLHttpRequest.respondWith({xyz: 'abc'})
    XMLHttpRequest.respondWith({foo: 'bar'})

    let called = 0
    session.subscribe('/listing/848',(e,listing) => {
      session.subscribe('/listing/848',(e,listing2) => {
        if (called++) return // ignore second call
        expect(listing).to.exist
        expect(listing2).to.exist
        expect(listing === listing2).to.be.true
        done()
      })
    })
  })

  it('missing urls')
  it('missing urls, same resource')
  it('resources with query strings')
  it('bid/ask orderbooks')

  // it('should propagate errors to all subscribers of the resource',(done) => {
  //   session.subscribe('/listings/848',(err,data) => {
  //     expect(data).to.not.exist
  //     expect(err).to.exist
  //     expect(err.code).to.equal('AJAX_ERROR')
  //     done()
  //   })
  //
  //   XMLHttpRequest.respondWithError({})
  // })

})
