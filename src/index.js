console.log('Loading Six Javascript SDK')

import './polyfills'

import {DEFAULT_ENDPOINT} from './defaults'
import session, {authenticateWithCredentials} from './session'
import internal from './internal'

function connect (token, endpoint = DEFAULT_ENDPOINT) {
  return session(token,endpoint)
}

export default {
  connect: connect,
  _internal: internal
}
