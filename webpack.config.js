const path = require('path');
module.exports = {
  mode: 'production',
  entry: './src/index.tsx',
  output: {
    path: path.resolve('/'),
    filename: 'index.js',
    libraryTarget: 'commonjs2'
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /(node_modules)/,
        use: 'babel-loader'
      }
    ]
  }
}
