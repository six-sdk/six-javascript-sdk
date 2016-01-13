console.log('Loading SDK')

import connection, {authenticateWithCredentials} from './connection'

function connect (token, version) {
  console.log('connect with token', token, version)
  return connection(token)
}

export default {
  connect: connect,
  _internal: {
    authenticateWithCredentials: authenticateWithCredentials
  }
}
