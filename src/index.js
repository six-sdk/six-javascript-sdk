console.log('Loading SDK')

import connection, {authenticateWithCredentials} from './connection'

window.connection = connection
window.authenticateWithCredentials = authenticateWithCredentials

export function connect (token) {
  console.log('connect with token', token)
  return connection(token)
}
