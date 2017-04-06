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
    const LISTING = {url: '/listings/848'}

    // queue up some responses
    XMLHttpRequest.respondWith(LISTING)

    let called = 0
    session.subscribe('/listings/848',(e,listing) => {
      session.subscribe('/listings/848',(e,listing2) => {
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

  describe("should give deep equal objects to subscribers for population + entity resource", () => {

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
          expect(population.items[0]).to.deep.equal(listing2)
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
          expect(population.items[0]).to.deep.equal(listing2)
          done()
        })
      })
    })
  })

  describe("should give same object to subscribers for favorites + entity resource", () => {

    // TODO: favorites don't look like this
    it('favorites then entity', (done) => {
      const LISTING = {url: '/listings/848', foo: 'bar'}
      const FAVORITES = {
        url: '/pop',
        favorites:[ {url: '/listings/848'}, {url: '/listings/847'}]
      }

      // queue up some responses
      XMLHttpRequest.respondWith(FAVORITES)
      XMLHttpRequest.respondWith(LISTING)

      let called = 0
      session.subscribe('/pop',(e,favorites) => {
        session.subscribe('/listings/848',(e,listing2) => {
          if (called++) return // ignore second call
          expect(favorites).to.exist
          expect(listing2).to.exist
          // expect(favorites.favorites[0] === listing2).to.be.true
          expect(favorites.favorites[0]).to.deep.equal(listing2)
          done()
        })
      })
    })

    it('entity then resource', (done) => {
      const LISTING = {url: '/listings/848', foo: 'bar'}
      const FAVORITES = {
        url: '/pop',
        favorites:[ {url: '/listings/848'}, {url: '/listings/847'}]
      }

      // queue up some responses
      XMLHttpRequest.respondWith(LISTING)
      XMLHttpRequest.respondWith(FAVORITES)

      let called = 0
      session.subscribe('/listings/848',(e,listing2) => {
        session.subscribe('/pop',(e,favorites) => {
          if (called++) return // ignore second call
          expect(favorites).to.exist
          expect(listing2).to.exist
          //expect(favorites.favorites[0] === listing2).to.be.true
          expect(favorites.favorites[0]).to.deep.equal(listing2)
          done()
        })
      })
    })
  })

  describe("should give same object to subscribers for search + entity resource", () => {

    it('favorites then entity', (done) => {
      const LISTING = {url: '/listings/848', foo: 'bar'}
      const SEARCH = {
        url: '/pop',
        search: { EQUITY: [ {url: '/listings/848'}, {url: '/listings/847'}] },
      }

      // queue up some responses
      XMLHttpRequest.respondWith(SEARCH)
      XMLHttpRequest.respondWith(LISTING)

      let called = 0
      session.subscribe('/pop',(e,search) => {
        session.subscribe('/listings/848',(e,listing2) => {
          if (called++) return // ignore second call
          expect(search).to.exist
          expect(listing2).to.exist
          //expect(search.search.EQUITY[0] === listing2).to.be.true
          expect(search.search.EQUITY[0]).to.deep.equal(listing2)
          done()
        })
      })
    })

    it('entity then resource', (done) => {
      const LISTING = {url: '/listings/848', foo: 'bar'}
      const SEARCH = {
        url: '/pop',
        search: { EQUITY: [ {url: '/listings/848'}, {url: '/listings/847'}] },
      }

      // queue up some responses
      XMLHttpRequest.respondWith(LISTING)
      XMLHttpRequest.respondWith(SEARCH)

      let called = 0
      session.subscribe('/listings/848',(e,listing2) => {
        session.subscribe('/pop',(e,search) => {
          if (called++) return // ignore second call
          expect(search).to.exist
          expect(listing2).to.exist
          //expect(search.search.EQUITY[0] === listing2).to.be.true
          expect(search.search.EQUITY[0]).to.deep.equal(listing2)
          done()
        })
      })
    })
  })

  it('should give same object to subscriber for entity and  entity/relation', (done) => {
    const QUOTES = {url: '/listings/848/quotes', foo: 'bork'}
    const LISTING = {url: '/listings/848', quotes: QUOTES}

    // queue up some responses
    XMLHttpRequest.respondWith(LISTING)
    XMLHttpRequest.respondWith(QUOTES)

    let listing = null
    //session.subscribe('/listing/848',(e,data) => listing = data)
    session.subscribe('/listing/848',(e,data) => {
      listing = data
    })


    session.subscribe('/listing/848/quotes',(e,quotes) => {
      expect(listing).to.exist
      expect(quotes).to.exist
      expect(listing.quotes).to.deep.equal(quotes)
      done()
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
        expect(listing).to.deep.equal(listing2)

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
          lastUpdated: '2017-03-17T15:34:31+01:00',
          askPrice: 10,
          bidPrice: 20,
        },
        orderbook: {
          lastUpdated: '2017-03-17T15:34:32+01:00',
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
          lastUpdated: '2017-03-17T15:34:31+01:00',
          askPrice: 10,
          bidPrice: 20
        }})
      XMLHttpRequest.respondWith({
        lastUpdated: '2017-03-17T15:34:32+01:00',
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

      let listing = null
      session.subscribe('/listing/848',(e,data) => listing = data)

      session.subscribe('/listing/848/orderbook',(e,orderbook) => {
        expect(listing).to.exist
        expect(listing.orderbook).to.exist
        expect(listing.orderbook).to.deep.equal(orderbook)
        expect(listing.orderbook.levels[0].bidPrice).to.equal(listing.quotes.bidPrice)
        expect(listing.orderbook.levels[0].askPrice).to.equal(listing.quotes.askPrice)

        done()
      })
    })

    it('handle listing (no orderbook ref), orderbook ()', (done) => {
      // queue up some responses
      XMLHttpRequest.respondWith({
        url: '/listings/848',
        quotes: {
          lastUpdated: '2017-03-17T15:34:31+01:00',
          askPrice: 10,
          bidPrice: 20
        }})
      XMLHttpRequest.respondWith({
        lastUpdated: '2017-03-17T15:34:32+01:00',
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

      let listing = null
      session.subscribe('/listing/848',(e,data) => listing = data)

      session.subscribe('/listing/848/orderbook',(e,orderbook) => {
        expect(listing).to.exist
        expect(orderbook.levels[0].bidPrice).to.equal(listing.quotes.bidPrice)
        expect(orderbook.levels[0].askPrice).to.equal(listing.quotes.askPrice)

        done()
      })
    })

    it('handle listing (fields=orderbook), orderbook', (done) => {
      // queue up some responses
      XMLHttpRequest.respondWith({
        url: '/listings/848',
        quotes: {
          lastUpdated: '2017-03-17T15:34:31+01:00',
          askPrice: 10,
          bidPrice: 20
        },
        orderbook: {
          lastUpdated: '2017-03-17T15:34:32+01:00',
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
        lastUpdated: '2017-03-17T15:34:33+01:00',
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

      let listing = null
      session.subscribe('/listing/848',(e,data) => listing = data)

      session.subscribe('/listing/848/orderbook',(e,orderbook) => {
        expect(listing).to.exist
        expect(listing.orderbook).to.exist
        expect(listing.orderbook).to.deep.equal(orderbook)
        expect(listing.orderbook.levels[0].bidPrice).to.equal(listing.quotes.bidPrice)
        expect(listing.orderbook.levels[0].askPrice).to.equal(listing.quotes.askPrice)
        done()
      })
    })

    // orderbook + quote
    it('handle orderbook, listing', (done) => {
      // queue up some responses
      XMLHttpRequest.respondWith({
        lastUpdated: '2017-03-17T15:34:31+01:00',
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
          lastUpdated: '2017-03-17T15:34:32+01:00',
          askPrice: 10,
          bidPrice: 20
        },
        orderbook: {
          url: '/listings/848/orderbook'
        }
      })

      let orderbook = null
      session.subscribe('/listing/848/orderbook',(e,data) => orderbook = data)

      session.subscribe('/listing/848',(e,listing) => {
        expect(listing).to.exist
        expect(listing.orderbook).to.exist
        expect(listing.orderbook).to.deep.equal(orderbook)
        expect(listing.orderbook.levels[0].bidPrice).to.equal(listing.quotes.bidPrice)
        expect(listing.orderbook.levels[0].askPrice).to.equal(listing.quotes.askPrice)

        done()
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
          lastUpdated: '2017-03-17T15:34:31+01:00',
          askPrice: 10,
          bidPrice: 20
        }})

      XMLHttpRequest.respondWith({
        lastUpdated: '2017-03-17T15:34:32+01:00',
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
            lastUpdated: '2017-03-17T15:34:33+01:00',
            askPrice: 100,
            bidPrice: 200
          }})


      let listing = null
      session.subscribe('/listings/848',(e,data) => { listing = data })

      let calls = 0
      session.subscribe('/listings/848/orderbook',(e,orderbook) => {
        calls++

        expect(listing).to.exist
        expect(listing.orderbook).to.exist
        expect(listing.orderbook).to.deep.equal(orderbook)
        expect(listing.orderbook.levels[0].bidPrice).to.equal(listing.quotes.bidPrice)
        expect(listing.orderbook.levels[0].askPrice).to.equal(listing.quotes.askPrice)

        if (calls == 1) {
          session.refresh('/listings/848')
          return
        }

        done()
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



  // SIXWID-384
  it.only('handle quote/orderbook sync for streaming use case I', () => {
      // streaming message
      const incoming = [
        {
          resource: '/listings/4727',
          data: {
            url: '/listings/4727',
            orderbook: {
              url: '/listings/4727/orderbook'
            },
            quotes: {
              url: '/listings/4727/quotes',
            }
          }
        },
        {"data":{"lastUpdated":"2017-04-05T13:35:04+02:00","levels":[{"level":1,"askPrice":null,"bidPrice":42.0,"askVolume":null,"bidVolume":300.0,"askOrders":null,"bidOrders":1}]},"resource":"/listings/4727/orderbook","type":"DATA"},
        {"data":{"lastUpdated":"2017-04-05T13:35:04+02:00","askPrice":null,"bidPrice":42.0},"resource":"/listings/4727/quotes","type":"DATA"},
        {"data":{"lastUpdated":"2017-04-05T13:35:04+02:00","levels":[{"level":1,"askPrice":42.2,"bidPrice":42.0,"askVolume":589.0,"bidVolume":1800.0,"askOrders":2,"bidOrders":2}]},"resource":"/listings/4727/orderbook","type":"DATA"},
        {"data":{"lastUpdated":"2017-04-05T13:35:04+02:00","askPrice":42.2,"bidPrice":42.0},"resource":"/listings/4727/quotes","type":"DATA"},
      ]

      incoming.forEach(message => {
        message.data.url = message.resource
        session._internal.publish(message.resource,message.data)
      })

      //console.log('session._internal.resourceCache',JSON.stringify(session._internal._resourceCache,null,2))

      // validate cache
      const quotes = session._internal._resourceCache['/listings/4727'].quotes
      const orderbook = session._internal._resourceCache['/listings/4727'].orderbook

      expect(orderbook.levels[0].bidPrice).to.equal(quotes.bidPrice)
      expect(orderbook.levels[0].askPrice).to.equal(quotes.askPrice)

      expect(orderbook.levels[0].bidPrice).to.equal(42.0)
      expect(orderbook.levels[0].askPrice).to.equal(42.2)
  })

})
