const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const ReplaceInFileWebpackPlugin = require('replace-in-file-webpack-plugin');

const packageJson = require('./package.json');
const pluginJson = require('./src/plugin.json');

module.exports = {
  node: {
    fs: 'empty',
  },
  context: path.join(__dirname, 'src'),
  entry: {
    'module': './module.ts',
  },
  devtool: 'source-map',
  output: {
    filename: '[name].js',
    path: path.join(__dirname, 'dist'),
    libraryTarget: 'amd',
  },
  externals: [
    'lodash', 'moment',
    function(context, request, callback) {
      var prefix = 'grafana/';
      if (request.indexOf(prefix) === 0) {
        console.log(request);
        return callback(null, request.substr(prefix.length));
      }
      callback();
    },
  ],
  plugins: [
    new CleanWebpackPlugin('dist', {allowExternal: true}),
    new webpack.optimize.OccurrenceOrderPlugin(),
    new CopyWebpackPlugin([
      {from: 'plugin.json', to: '.'},
      {from: '../README.md', to: '.'},
      {from: '../LICENSE', to: '.'},
      {from: 'partials/*', to: '.'},
      {from: 'img/*', to: '.'},
    ]),
    new ReplaceInFileWebpackPlugin([{
      dir: path.join(__dirname, 'dist'),
      files: ['plugin.json'],
      rules: [{
        search: '%VERSION%',
        replace: packageJson.version,
      }, {
        search: '%TODAY%',
        replace: (new Date()).toISOString().substring(0, 10),
      }],
    }]),
    new ReplaceInFileWebpackPlugin([{
      dir: path.join(__dirname, 'dist'),
      files: ['README.MD'],
      rules: [{
        search: /\(src\/img/g,
        replace: '(/public/plugins/' + pluginJson.id + '/img',
      }],
    }]),
  ],
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loaders: [
          {
            loader: 'babel-loader',
            options: {presets: ['env']},
          },
          'ts-loader',
        ],
        exclude: /(node_modules)/,
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: 'style-loader',
          },
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1,
              sourceMap: true,
            },
          },
        ],
      },
    ],
  },
};
