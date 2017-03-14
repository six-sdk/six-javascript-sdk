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
