console.log('Loading Six Javascript SDK')

import {DEFAULT_ENDPOINT} from './defaults'
import session, {authenticateWithCredentials} from './session'
import internal from './internal'

function connect (token, endpoint = DEFAULT_ENDPOINT) {
  //console.log('connect with token', token, endpoint)
  return session(token,endpoint)
}

export default {
  connect: connect,
  _internal: internal
}
