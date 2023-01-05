/* eslint-env node */

import HtmlWebpackPlugin from 'html-webpack-plugin';
import * as path from 'path';
import webpack from 'webpack';
import { Configuration as WebpackConfiguration } from 'webpack';
import { Configuration as WebpackDevServerConfiguration } from 'webpack-dev-server';

interface Configuration extends WebpackConfiguration {
  devServer?: WebpackDevServerConfiguration;
}

const config: Configuration = {
  mode: 'development',
  entry: './index.tsx',
  context: path.resolve(__dirname, 'src'),
  output: {
    path: path.resolve(__dirname, 'dist-standalone'),
    filename: '[name]-bundle.js',
    chunkFilename: '[name]-chunk.js',
    publicPath: '/',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.(jsx?|tsx?)$/,
        exclude: /node_modules/,
        use: [
          '@jsdevtools/coverage-istanbul-loader',
          {
            loader: 'ts-loader',
            options: {
              configFile: path.resolve(__dirname, 'tsconfig.json'),
            },
          },
        ],
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg|woff2?|ttf|eot|otf)(\?.*$|$)/,
        type: 'asset/resource',
        generator: {
          filename: 'assets/[name].[ext]',
        },
      },
      {
        test: /\.m?js/,
        resolve: {
          fullySpecified: false,
        },
      },
    ],
  },
  devServer: {
    static: './dist-standalone',
    historyApiFallback: true,
    port: 9003,
    // Allow bridge running in a container to connect to the plugin dev server.
    allowedHosts: 'all',
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers':
        'X-Requested-With, Content-Type, Authorization',
    },
    devMiddleware: {
      writeToDisk: true,
    },
  },
  devtool: 'source-map',
  optimization: {
    chunkIds: 'named',
    minimize: false,
  },
  plugins: [
    new webpack.NormalModuleReplacementPlugin(/dynamic-plugin-sdk/, function (
      resource,
    ) {
      resource.request = path.resolve(__dirname, 'mockModules/dummy');
    }),
    new HtmlWebpackPlugin({
      template: path.join(__dirname, 'src', 'index.html'),
    }),
  ],
};

export default config;
