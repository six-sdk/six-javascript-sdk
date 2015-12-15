var SDK = require('./src');
var NAMESPACE = global['SIX_GLOBAL_NAMESPACE'] || 'Six';
global[NAMESPACE] = SDK;
