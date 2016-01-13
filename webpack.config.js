var path = require('path');
var webpack = require('webpack');

module.exports = {
  entry: [
    './browser-bundle.js'
  ],
  output: {
      publicPath: '/',
      path: path.join(__dirname,'dist'),
      filename: 'six-sdk.js'
  },
  debug: false,
  devtool: 'source-map',
  module: {
    loaders: [
      {
        test: /\.js$/,
        include: [
          path.join(__dirname, 'src'),
          path.join(__dirname, 'browser-bundle.js'),
        ],
        loader: 'babel-loader',
        query: {
          presets: ['es2015']
        }
      }
    ]
  }
};
