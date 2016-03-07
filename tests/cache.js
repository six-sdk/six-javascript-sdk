import { expect } from 'chai';
import sinon from 'sinon';
import jsdom from 'mocha-jsdom'

import FakeXMLHttpRequest from './fake-xml-http-request'

import SDK from '../src'

// enable global debug logging
//SDK.debug = true

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
        expect(e).to.be.null
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

  it('resources with query strings', (done) => {
    // queue up some diffrent responses
    XMLHttpRequest.respondWith({xyz: 'abc'})
    XMLHttpRequest.respondWith({foo: 'bar'})

    let called = 0
    session.subscribe('/resource?filter=foo',(e,listing) => {
      session.subscribe('/resource?filter=bar',(e,listing2) => {
        if (called++) return // ignore second call
        expect(listing).to.exist
        expect(listing.xyz).to.exist
        expect(listing.foo).to.not.exist

        expect(listing2).to.exist
        expect(listing2.foo).to.exist
        expect(listing2.xyz).to.not.exist

        expect(listing === listing2).to.be.false
        done()
      })
    })
  })

  it('resources with query strings for the same entity', (done) => {
    // queue up some diffrent responses
    XMLHttpRequest.respondWith({xyz: 'abc', url: '/resource'})
    XMLHttpRequest.respondWith({foo: 'bar', url: '/resource'})

    let called = 0
    session.subscribe('/resource?filter=foo',(e,listing) => {
      session.subscribe('/resource?filter=bar',(e,listing2) => {
        if (called++) return // ignore second call
        expect(listing === listing2).to.be.true

        expect(listing).to.exist
        expect(listing2).to.exist

        expect(listing2.foo).to.exist
        expect(listing2.xyz).to.exist

        done()
      })
    })
  })


  describe('bid/ask orderbooks should have synced Bid/Ask with Level 1', () => {
    // listing with both quote + orderbook
    it('listing with both quotes + orderbook', (done) => {
      // queue up some responses
      XMLHttpRequest.respondWith({
        url: '/listings/848',
        orderbook: {
          url: '/listings/848/orderbook'
        },
        quotes: {
          askPrice: 10,
          bidPrice: 20
        },
        orderbook: {
          url: '/listings/848/orderbook',
          levels: [{
            level: 1,
            askPrice: 2,
            bidPrice: 3,
            askVolume: 9999,
            bidVolume: 9999,
            askOrders: 9,
            bidOrders: 9
          }]
        }
      })

      session.subscribe('/listing/848',(e,listing) => {
        expect(listing).to.exist
        expect(listing.orderbook).to.exist
        expect(listing.orderbook.levels[0].bidPrice).to.equal(listing.quotes.bidPrice)
        expect(listing.orderbook.levels[0].askPrice).to.equal(listing.quotes.askPrice)
        done()
      })
    })


    // quote + orderbook
    it('handle listing, orderbook', (done) => {
      // queue up some responses
      XMLHttpRequest.respondWith({
        url: '/listings/848',
        orderbook: {
          url: '/listings/848/orderbook'
        },
        quotes: {
          askPrice: 10,
          bidPrice: 20
        }})
      XMLHttpRequest.respondWith({
        url: '/listings/848/orderbook',
        levels: [{
          level: 1,
          askPrice: 2,
          bidPrice: 3,
          askVolume: 9999,
          bidVolume: 9999,
          askOrders: 9,
          bidOrders: 9
        }
        ]})

      session.subscribe('/listing/848',(e,listing) => {
        session.subscribe('/listing/848/orderbook',(e,orderbook) => {
          expect(listing).to.exist
          expect(listing.orderbook).to.exist
          expect(listing.orderbook === orderbook).be.true
          expect(listing.orderbook.levels[0].bidPrice).to.equal(listing.quotes.bidPrice)
          expect(listing.orderbook.levels[0].askPrice).to.equal(listing.quotes.askPrice)

          done()
        })
      })
    })

    it('handle listing (no orderbook ref), orderbook ()', (done) => {
      // queue up some responses
      XMLHttpRequest.respondWith({
        url: '/listings/848',
        quotes: {
          askPrice: 10,
          bidPrice: 20
        }})
      XMLHttpRequest.respondWith({
        url: '/listings/848/orderbook',
        levels: [{
          level: 1,
          askPrice: 2,
          bidPrice: 3,
          askVolume: 9999,
          bidVolume: 9999,
          askOrders: 9,
          bidOrders: 9
        }
        ]})

      session.subscribe('/listing/848',(e,listing) => {
        session.subscribe('/listing/848/orderbook',(e,orderbook) => {
          expect(listing).to.exist
          expect(listing.orderbook).to.exist
          expect(listing.orderbook === orderbook).be.true
          expect(listing.orderbook.levels[0].bidPrice).to.equal(listing.quotes.bidPrice)
          expect(listing.orderbook.levels[0].askPrice).to.equal(listing.quotes.askPrice)

          done()
        })
      })
    })

    it('handle listing (fields=orderbook), orderbook', (done) => {
      // queue up some responses
      XMLHttpRequest.respondWith({
        url: '/listings/848',
        quotes: {
          askPrice: 10,
          bidPrice: 20
        },
        orderbook: {
          url: '/listings/848/orderbook',
          levels: [{
            level: 1,
            askPrice: 11,
            bidPrice: 22,
            askVolume: 9999,
            bidVolume: 9999,
            askOrders: 9,
            bidOrders: 9
          }
          ]}
      })

      XMLHttpRequest.respondWith({
        url: '/listings/848/orderbook',
        levels: [{
          level: 1,
          askPrice: 2,
          bidPrice: 3,
          askVolume: 9999,
          bidVolume: 9999,
          askOrders: 9,
          bidOrders: 9
        }
        ]})

      session.subscribe('/listing/848',(e,listing) => {
        session.subscribe('/listing/848/orderbook',(e,orderbook) => {
          expect(listing).to.exist
          expect(listing.orderbook).to.exist
          expect(listing.orderbook === orderbook).be.true
          expect(listing.orderbook.levels[0].bidPrice).to.equal(listing.quotes.bidPrice)
          expect(listing.orderbook.levels[0].askPrice).to.equal(listing.quotes.askPrice)

          done()
        })
      })
    })

    // orderbook + quote
    it('handle orderbook, listing', (done) => {
      // queue up some responses
      XMLHttpRequest.respondWith({
        url: '/listings/848/orderbook',
        levels: [{
          level: 1,
          askPrice: 2,
          bidPrice: 3,
          askVolume: 9999,
          bidVolume: 9999,
          askOrders: 9,
          bidOrders: 9
        }
        ]})

      XMLHttpRequest.respondWith({
        url: '/listings/848',
        quotes: {
          askPrice: 10,
          bidPrice: 20
        },
        orderbook: {
          url: '/listings/848/orderbook'
        }
      })

      session.subscribe('/listing/848/orderbook',(e,orderbook) => {
        session.subscribe('/listing/848',(e,listing) => {
          expect(listing).to.exist
          expect(listing.orderbook).to.exist
          expect(listing.orderbook === orderbook).be.true
          expect(listing.orderbook.levels[0].bidPrice).to.equal(listing.quotes.bidPrice)
          expect(listing.orderbook.levels[0].askPrice).to.equal(listing.quotes.askPrice)

          done()
        })
      })
    })

    it('handle listing, orderbook, listing', (done) => {
      // queue up some responses
      XMLHttpRequest.respondWith({
        url: '/listings/848',
        orderbook: {
          url: '/listings/848/orderbook'
        },
        quotes: {
          askPrice: 10,
          bidPrice: 20
        }})

      XMLHttpRequest.respondWith({
        url: '/listings/848/orderbook',
        levels: [{
          level: 1,
          askPrice: 2,
          bidPrice: 3,
          askVolume: 9999,
          bidVolume: 9999,
          askOrders: 9,
          bidOrders: 9
        }
        ]})

        XMLHttpRequest.respondWith({
          url: '/listings/848',
          orderbook: {
            url: '/listings/848/orderbook'
          },
          quotes: {
            askPrice: 100,
            bidPrice: 200
          }})

      let calls = 0

      session.subscribe('/listings/848',(e,listing) => {
        session.subscribe('/listings/848/orderbook',(e,orderbook) => {
          calls++

          expect(listing).to.exist
          expect(listing.orderbook).to.exist
          expect(listing.orderbook === orderbook).be.true
          expect(listing.orderbook.levels[0].bidPrice).to.equal(listing.quotes.bidPrice)
          expect(listing.orderbook.levels[0].askPrice).to.equal(listing.quotes.askPrice)

          if (calls == 1) {
            session.refresh('/listings/848')
            return
          }

          done()
        })
      })
    })

    // listing + orderbook (with missing fields)
  })

  it('should propagate errors to all subscribers of the resource',(done) => {
    session.subscribe('/listings/848',(err,data) => {
      expect(data).to.not.exist
      expect(err).to.exist
      expect(err.code).to.equal('AJAX_ERROR')
      done()
    })

    XMLHttpRequest.respondWithError({})
  })

})
