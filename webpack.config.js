const path = require('path');
module.exports = {
  mode: 'production',
  entry: './src/index.tsx',
  output: {
    path: path.resolve('./lib'),
    filename: 'index.js',
    libraryTarget: 'commonjs2'
  },
  resolve: {
    extensions: ['.js', '.ts', '.tsx'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /(node_modules)/,
        use: {
          loader: 'babel-loader',
          options: {
            overrides: [{
              test: "./src/data.ts",
              compact: true,
            }],
          }
        }
      },
    ]
  }
}
