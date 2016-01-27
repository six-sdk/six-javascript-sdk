console.log('Loading SDK')

import connection, {authenticateWithCredentials} from './connection'

function connect (token, endpoint) {
  console.log('connect with token', token, endpoint)
  return connection(token,endpoint)
}

export default {
  connect: connect,
  _internal: {
    authenticateWithCredentials: authenticateWithCredentials
  }
}
