console.log('Loading Six Javascript SDK')

import './polyfills'

import { DEFAULT_ENDPOINT } from './defaults'
import session, { authenticateWithCredentials } from './session'
import internal from './internal'

export default {
  _internal: internal,
  connect: function connect (token, endpoint = DEFAULT_ENDPOINT) {
    const s = session(token,endpoint)
    s.debug = this.debug
    return s
  }
}
