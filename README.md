# About
SDK for api.six.se
Contact info

## Usage

```javascript
// for testing you can get token with:
// Six._internal.authenticateWithCredentials(client_id,client_secreat)
var TOKEN = 'token-authenticated-in-backend'

/* Six.connect(TOKEN,[endpoint]) */
var session = Six.connect(TOKEN)

/* session.subscribe(resource,callbackFn(error,data)) */
var unsubscribe = session.subscribe('/listings/848',function(err,data) {
  console.log('data',data,err)
})
```

## Getting started
## Installing from NPM
## Installing from CDN

## API
- connect
- subscribe
- refresh
- create/update/remove
- clearCache

## Caching

## Contact

## License
