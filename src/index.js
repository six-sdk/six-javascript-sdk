import VersionInfo from './meta-version'
console.log(`Loading Six Javascript SDK ${VersionInfo.version} (${VersionInfo.git.short})`)

import './polyfills'

import { DEFAULT_ENDPOINT } from './defaults'
import session from './session'
import internal from './internal'

export default {
  _internal: internal,
  connect: function connect (token, endpoint = DEFAULT_ENDPOINT) {
    const s = session(token, endpoint)
    s.debug = this.debug
    return s
  }
}
