import { expect } from 'chai';
import sinon from 'sinon';
import jsdom from 'mocha-jsdom'
import FakeXMLHttpRequest from './fake-xml-http-request'

import connect from '../src/session';

window.requestAnimationFrame = (fn) => fn()


describe('merge', () => {
  let session;
  let population;
  let quoteUpdate;

  const xhr = global.XMLHttpRequest;

  beforeEach(() => {
    session = connect('fake-token');
    global.XMLHttpRequest = FakeXMLHttpRequest();
    population = {
      id: 'ERICSSON_POPULATION',
      items: [
        {
          id: '848',
          quotes: {
            lastPaid: 67.25,
            url: 'https://api.six.se/v2/listings/848/quotes'
          },
          url: 'https://api.six.se/v2/listings/848'
        }
      ],
      url: 'https://api.six.se/v2/population/ERICSSON_POPULATION'
    };
    quoteUpdate = {
      _parent: 'https://api.six.se/v2/listings/848',
      lastPaid: 30.599,
      url: 'https://api.six.se/v2/listings/848/quotes'
    };
  });

  afterEach(() => {
    global.XMLHttpRequest = xhr;
  });

  it('should merge quotes on listings in population correctly', (done) => {
    let counter = 0;
    session.subscribe('/population/ERICSSON_POPULATION',
      (err, data, unsub) => {
        counter++;
        if(counter === 1) {
          expect(data.items[0].quotes.lastPaid).to.equal(67.25);
        }
        if(counter === 2) {
          expect(data.items[0].quotes.lastPaid).to.equal(30.599);
          done();
        }
      }
    );
    session._internal.publish('/population/ERICSSON_POPULATION', population);
    setTimeout(() => session._internal.publish('/listings/848/quotes', quoteUpdate),300)
  });

  // it('should merge removed items correctly', (done) => {
  //   let counter = 0;
  //   session.subscribe('/collection',
  //     (err, data, unsub) => {
  //       console.log('sub /collection',err,data)
  //       counter++;
  //       if(counter === 1) {
  //         expect(data.id).to.equal('c1')
  //         expect(data.listings.EQUITY).to.exist
  //         expect(data.listings.EQUITY.length).to.equal(1);
  //       }
  //       if(counter === 2) {
  //         expect(data.id).to.equal('c1')
  //         expect(data.listings).to.not.exist
  //         done();
  //       }
  //     }
  //   );
  //   session._internal.publish('/collection', {
  //     url: '/collection',
  //     id: 'c1',
  //     listings: {
  //         EQUITY: [
  //           {
  //             url: '/collection/1'
  //           }
  //         ]
  //     }
  //   });
  //   session._internal.publish('/collection', {
  //     url: '/collection',
  //     id: 'c1',
  //     listings: {
  //         EQUITY: [
  //         ]
  //     }    });
  // });


  it('should merge removed items correctly (II)', (done) => {
    let counter = 0;
    session.subscribe('/collection',
      (err, data, unsub) => {
        counter++;
        if(counter === 1) {
          expect(data.id).to.equal('c1')
          expect(data.listings.EQUITY).to.exist
          expect(data.listings.EQUITY.length).to.equal(1);
        }
        if(counter === 2) {
          expect(data).to.deep.equal({})
          done();
        }
      }
    );
    session._internal.publish('/collection', {
      url: '/collection',
      id: 'c1',
      listings: {
          EQUITY: [
            {
              url: '/collection/1'
            }
          ]
      }
    });
    setTimeout(() => session._internal.publish('/collection', {}, null, true),300)
  });


  it('should merge population update into quote and notify subscribers', (done) => {
    let counter = 0;
    session.subscribe('/listings/848/quotes',
      (err, data, unsub) => {
        counter++;
        if(counter === 1) {
          expect(data.lastPaid).to.equal(30.599);
        }
        if(counter === 2) {
          expect(data.lastPaid).to.equal(67.25);
          done();
        }
      }
    );
    session.subscribe('/population/ERICSSON_POPULATION',(err, data, unsub) => {});

    session._internal.publish('/listings/848/quotes', quoteUpdate);
    setTimeout(() => session._internal.publish('/population/ERICSSON_POPULATION', population),300)
  });

  it('should merge population update into listing and notify subscribers', (done) => {
    let counter = 0;
    session.subscribe('/listings/848',
      (err, data, unsub) => {
        counter++;
        if(counter === 1) {
          expect(data.quotes.lastPaid).to.equal(30.599);
        }
        if(counter === 2) {
          expect(data.quotes.lastPaid).to.equal(67.25);
          done();
        }
      }
    );
    session.subscribe('/population/ERICSSON_POPULATION',(err, data, unsub) => {});

    session._internal.publish('/listings/848',{
      id: '848',
      quotes: JSON.parse(JSON.stringify(quoteUpdate)),
      url: 'https://api.six.se/v2/listings/848'
    });
    setTimeout(() => session._internal.publish('/population/ERICSSON_POPULATION', population),300)
  });
});

describe('merge options view', () => {
  let session;
  let optionsView;
  let quoteUpdate;
  const xhr = global.XMLHttpRequest;

  beforeEach(() => {
    session = connect('fake-token');
    global.XMLHttpRequest = FakeXMLHttpRequest();
    optionsView = {
      id: 'ERICSSON_POPULATION',
      options: [
        {
          id: '848',
          quotes: {
            lastPaid: 67.25,
            url: 'https://api.six.se/v2/listings/848/quotes'
          },
          url: 'https://api.six.se/v2/listings/848'
        }
      ],
      url: 'https://api.six.se/v2/population/ERICSSON_POPULATION'
    };
    quoteUpdate = {
      _parent: 'https://api.six.se/v2/listings/848',
      lastPaid: 30.599,
      url: 'https://api.six.se/v2/listings/848/quotes'
    };
  });

  afterEach(() => {
    global.XMLHttpRequest = xhr;
  });

  it('should merge quotes on listings in options view correctly', (done) => {
    let counter = 0;
    session.subscribe('/population/ERICSSON_POPULATION',
      (err, data, unsub) => {
        counter++;
        if(counter === 1) {
          expect(data.options[0].quotes.lastPaid).to.equal(67.25);
        }
        if(counter === 2) {
          expect(data.options[0].quotes.lastPaid).to.equal(30.599);
          done();
        }
      }
    );
    session._internal.publish('/population/ERICSSON_POPULATION', optionsView);
    setTimeout(() => session._internal.publish('/listings/848/quotes', quoteUpdate),300)
  });
});

describe('merge search result', () => {
  let session;
  let searchResult;
  let quoteUpdate;
  let searchConfig;
  const xhr = global.XMLHttpRequest;

  beforeEach(() => {
    searchConfig = {"pagination":{"limit":25,"offset":0},"fields":"*,groups.*.items.*.id,groups.*.items.*.longName,groups.*.items.*.name,groups.*.items.*.type,groups.*.items.*.subType,groups.*.items.*.currencyCode,groups.*.items.*.micCode,groups.*.items.*.underlyingListing,groups.*.items.*.issuer.id,groups.*.items.*.url,groups.*.items.*.quotes.lastPrice,groups.*.items.*.quotes.url,groups.*.items.*.quotes.lastValue,groups.*.items.*.quotes.midPrice,groups.*.items.*.quotes.midInterest,groups.*.items.*.quotes.changeDay,groups.*.items.*.quotes.changePercentDay,groups.*.items.*.quotes.tradedVolume,groups.*.items.*.quotes.lastUpdated","groups":[{"id":"equities","populationIds":["ALL_STOCKS"]},{"id":"swedbank-certificates","populationIds":["ALL_SWEDISH_WARRANTS_CERTIFICATE_SWEDBANK"]},{"id":"all"}],"query":"eric"};
    session = connect('fake-token');
    global.XMLHttpRequest = FakeXMLHttpRequest();
    searchResult = {
      "pagination" : {
        "limit" : 25,
        "offset" : 0
      },
      "groups" : [{
        "items" : [{
          "url" : "https://api.six.se/v2/listings/848",
          "id" : "848",
          "type" : "EQUITY",
          "currencyCode" : "SEK",
          "longName" : "Ericsson B",
          "name" : "ERIC B",
          "micCode" : "XSTO",
          "subType" : "STOCK",
          "issuer" : {
            "id" : "125"
          },
          "quotes" : {
            "url" : "https://api.six.se/v2/listings/848/quotes",
            "lastUpdated" : "2017-06-26T11:42:28+02:00",
            "lastPrice" : 63.9,
            "tradedVolume" : 2358715.0,
            "changeDay" : 0.05,
            "changePercentDay" : 0.078
          }
        },{
          "url" : "https://api.six.se/v2/listings/847",
          "id" : "847",
          "type" : "EQUITY",
          "currencyCode" : "SEK",
          "longName" : "Ericsson A",
          "name" : "ERIC A",
          "micCode" : "XSTO",
          "subType" : "STOCK",
          "issuer" : {
            "id" : "125"
          },
          "quotes" : {
            "url" : "https://api.six.se/v2/listings/847/quotes",
            "lastUpdated" : "2017-06-26T11:40:22+02:00",
            "lastPrice" : 63.2,
            "tradedVolume" : 9515.0,
            "changeDay" : 0.15,
            "changePercentDay" : 0.238
          }
        },{
          "url" : "https://api.six.se/v2/listings/86092",
          "id" : "86092",
          "type" : "EQUITY",
          "currencyCode" : "USD",
          "longName" : "Ericsson Sp ADS-B",
          "name" : "ERIC",
          "micCode" : "XNGS",
          "subType" : "STOCK",
          "issuer" : {
            "id" : "125"
          },
          "quotes" : {
            "url" : "https://api.six.se/v2/listings/86092/quotes",
            "lastUpdated" : "2017-06-26T11:41:50+02:00",
            "lastPrice" : 7.25,
            "changeDay" : 0.0,
            "changePercentDay" : 0.0
          }
        },{
          "url" : "https://api.six.se/v2/listings/108430",
          "id" : "108430",
          "type" : "EQUITY",
          "currencyCode" : "EUR",
          "longName" : "Ericsson B",
          "name" : "ERIBR",
          "micCode" : "XHEL",
          "subType" : "STOCK",
          "issuer" : {
            "id" : "125"
          },
          "quotes" : {
            "url" : "https://api.six.se/v2/listings/108430/quotes",
            "lastUpdated" : "2017-06-26T11:41:50+02:00"
          }
        }]
      }]
    };
    quoteUpdate = {
      lastPrice: 30.599,
      url: 'https://api.six.se/v2/listings/848/quotes',
    };
  });

  afterEach(() => {
    global.XMLHttpRequest = xhr;
  });

  it('should merge quotes on listings in search result correctly', (done) => {
    let counter = 0;
    session.subscribe('/search',
      (err, data) => {
        counter++;
        if(counter === 1) {
          expect(data.groups[0].items[0].quotes.lastPrice).to.equal(63.9);
        }
        if(counter === 2) {
          expect(data.groups[0].items[0].quotes.lastPrice).to.equal(30.599);
          done();
        }
      },
      searchConfig
    );
    session._internal.publish(`/search/${JSON.stringify(searchConfig)}`, searchResult);
    setTimeout(() => { session._internal.publish('/listings/848/quotes', quoteUpdate); }, 300);
  });
});
