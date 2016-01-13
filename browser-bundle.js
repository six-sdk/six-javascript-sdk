// require('babel-polyfill')
//var SDK = require('./src')
import SDK from './src'

var NAMESPACE = global['SIX_GLOBAL_NAMESPACE'] || 'Six'
global[NAMESPACE] = SDK
