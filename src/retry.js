const MAX_RETRIES = 100
const MAX_RETRY_TIMEOUT = 900000// 15 minutes
const RETRY_START_TIMEOUT = 5000
const RETRY_TIMEOUT_INCREMENT = 25000

export const retry = function retry (fetchFunc, failFunc, abortFunc) {
  let retryTimeout = window.RETRY_START_TIMEOUT || RETRY_START_TIMEOUT
  let retries = 0
  return new Promise(function (resolve, reject) {
    function doRetry (err) {
      if (abortFunc && abortFunc()) {
        reject(Object.assign({}, err, {
          code: 'ABORTED',
          title: 'Request was aborted',
          description: 'The request was aborted'
        }))
      } else {
        const status = err.details.status
        // status 0 should be transport errors and 5xx server errors
        if ((status === 0 || (status >= 500 && status < 600)) && retries < (window.MAX_RETRIES || MAX_RETRIES)) {
          failFunc(err)
          setTimeout(() => {
            retries++
            if (retryTimeout < (window.MAX_RETRY_TIMEOUT || MAX_RETRY_TIMEOUT)) {
              retryTimeout = retryTimeout + (window.RETRY_TIMEOUT_INCREMENT || RETRY_TIMEOUT_INCREMENT)
            }
            fetchFunc().then(resolve).catch(doRetry)
          }, retryTimeout)
        } else {
          reject(err)
        }
      }
    }
    fetchFunc().then(resolve).catch(doRetry)
  })
}
