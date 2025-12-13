const path = require('path');
const WebpackObfuscator = require('webpack-obfuscator');

module.exports = {
  entry: './dist/lib/index.js',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
  },
  mode: 'production',
  target: 'web',
  
  plugins: [
    new WebpackObfuscator({
      rotateStringArray: true,
      reservedStrings: ['\s*'],
      compact: true,
      controlFlowFlattening: false,
      deadCodeInjection: false,
      identifierNamesGenerator: 'hexadecimal'
    }, [])
  ],
  
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ],
  },
  
  resolve: {
    extensions: ['.js', '.json'],
    alias: {
      // Handle relative imports
      './ref': path.resolve(__dirname, 'dist/lib/ref.js')
    }
  },
  
  optimization: {
    minimize: true,
  },
  
  devtool: false,
};