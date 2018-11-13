const baseWebpackConfig = require('./webpack.config');
const ngAnnotatePlugin = require('ng-annotate-webpack-plugin');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');

var conf = baseWebpackConfig;
conf.mode = 'production';

conf.plugins.push(new ngAnnotatePlugin());
conf.optimization = {
  minimizer: [new UglifyJSPlugin({
    sourceMap: false,
    uglifyOptions: {
      mangle: false,
    },
  })],
};

module.exports = conf;
