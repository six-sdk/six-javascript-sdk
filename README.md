# About
Javascript SDK for api.six.se
<!-- TODO: add Contact info -->

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
Install ```six-sdk``` in project
```bash
# npm install six-sdk
```

Require the module as usual:

```javascript
var Six = require('six-sdk')
var session = Six.connect('token-from-backend')
```

## Installing from CDN
```html
<html>
  <body>
    <script type="text/javascript" src="https://cdn.six.se/js/six-sdk/0/six-sdk.js"></script>
    <script type="text/javascript">
      // the SDK is installed as 'Six' in the global scope
      var session = Six.connect('token-from-backend')
    </script>
  </body>
</html>
```

### Global scope

When using the SDK from *cdn.six.se* the SDK is installed as ```Six``` in the global scope. If there is a risk that this name will clash with some other var, you can change the name of the global by setting ```SIX_GLOBAL_NAMESPACE``` **before loading the SDK**:

```html
<html>
  <body>
    <script type="text/javascript">
      // install the SDK as VendorSix
      window.SIX_GLOBAL_NAMESPACE = 'VendorSix'
    </script>
    <script type="text/javascript" src="https://cdn.six.se/js/six-sdk/0/six-sdk.js"></script>
    <script type="text/javascript">
      var session = VendorSix.connect('token-from-backend')
    </script>
  </body>
</html>
```

## API
Before using the any of the methods in the SDK you must retrieve an authentication token from api.six.se (see the documentation for the API). This is usually done in some backend system and provided as an global var in the HTML document returned to the browser.

## Session

All methods to retrive data from the API is attached to the Session object.

- subscribe(resource,callback(error,data,unsubsribe)) -> unsubscribeFn
- refresh(resource)
- create(resource,data) -> Promise
- update(resource,data) -> Promise
- remove(resource) -> Promise
- clearCache()
- setToken()


### Create a session

To create a new session object:

```javascript
var session = Six.connect(TOKEN)
```

Some of the functionality and analytics in the API requires some additional context (ie userid, entitlement groups etc).

To create a session with additional context:

```javascript
var session = Six.connect(TOKEN).withContext({userId: '16ef65e39e6114fa6d9510042ad83472c9db756a'})
```
For more information about session contexts, see the API documentation.

The session provides syntactic sugar for the common case of setting **locale** in the context:

```javascript
var session = Six.connect(TOKEN).withLocale('sv-SE')
```


### Getting data from the API

The primary way to retrive data from api is via ```subscribe(resource,callbackFn)```

The ```subscribe``` method takes a resource (relative to the API endpoint, ie ```/markets/SEE``` not ```https://api.six.se/v2/markets/SSE```) and a callback function.

The callback function will be called anytime there is new data available for the resource from the SDK (some other component have called ```refresh``` etc). The callback *may* be called **more than once**.

The callback can also first be called with an error object, and later with data.

The callback will be called with the arguments:
- **error** is provided if the request for data couldn't be fullfilled (see section on errors below)
- **data** the data provided by the api
- **unsubscribeFn** a function that, when called, unsubscribes the callback from future updates

**unsubscribeFn** is also returned from the ```subscribe``` call itself

```javascript
// retrive the reference data for an listing with id 848
var unsubscribeFn = session.subscribe('/listings/848',function(error,listing, unsubscribeFn) {
  //  this callback can be called more then once  
})
```

#### Error objects
Errors returned from the SDK methods is of the same structure as error responses from the API.

```javascript
{
  code: "AJAX_ERROR",
  title: "Request to endpoint failed",
  description: "The request failed. Check that the endpoint is valid?",
  details: {
    endpoint: 'https://api.six.se/v2/'
  }
}
```

#### error
All errors are sent to a 'error' subscription.

```javascript
// register an error handler with the session
session.subscribe('error', function logErrors (error) {
  // this callback can be called more then once
})
```

#### session-expired and setToken
To listen to when the session has expired the 'session-expired' resource can be subscribed to.
The resource will be called when the api responds with a access denied.
It is then possible to set a new token with the setToken method

**Subscribe to session-expired and set a new token**
```javascript
session.subscribe('session-expired', function refreshToken(error, data) {
  // This callback will be called for every request that receives session expired
  session.setToken(getNewTokenFromMyBackend())
})
```

**Refresh token every hour**
```javascript
// You can set a new token any time
var ONE_HOUR = 1000 * 60 * 60
setInterval(function updateToken() {
  session.setToken(fetchNewToken())
}, ONE_HOUR)
```

### Caching

The SDK caches all resources fetched from the API, and all subscribers for the same resource will receive the same data when new data arrives.This means that multiple components on a page using the same underlying data will be kept in sync.

Data is cached until the session is destroyed (typically the next pageview) or ```session.clearCache()``` is called.

<!-- TODO: something about entities and matching in populations -->

### Refreshing data

To populate the cache with new data, there is a method ```session.refresh(resource)```. The API will be called and all subscribers for the resource will have their callbacks called.

```javascript
session.refresh('/listings/848')
```

## Contact

## License

The MIT License (MIT)

Copyright (c) 2016 SIX Financial Information

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
