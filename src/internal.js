import {fetch} from './fetch'
import {DEFAULT_ENDPOINT} from './defaults'

export default {
  authenticateWithCredentials: function authenticateWithCredentials (client_id, client_secret, callback, endpoint = DEFAULT_ENDPOINT) {
    console.warn('Never bundle your credentials with your browser code!','endpoint',endpoint)
    fetch(null, '/authorization/token', endpoint, {method: 'POST', body: {client_id: client_id, client_secret: client_secret}})
      .then(({access_token}) => {
        window.TOKEN = access_token
        console.log('got token ', access_token)
        if (callback) {
          callback(access_token)
        }
      })
      .catch((err) => {
        console.error(err)
        callback(null,err)
        window.setTimeout(() => callback(null,err), 0)
      })
  }
}
