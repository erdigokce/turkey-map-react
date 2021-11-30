const path = require('path');

module.exports = {
  mode: 'development',
  entry: './src/index.tsx',
  output: {
    path: path.resolve('./lib'),
    filename: 'index.js',
    libraryTarget: 'commonjs2',
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
              test: './src/data.ts',
              compact: true,
            }],
          },
        },
      },
      {
        test: /\.css$/,
        exclude: /(node_modules)/,
        use: [
          'style-loader',
          {
            loader: 'css-loader', // generating unique classname
            options: {
              importLoaders: 1, // if specifying more loaders
              sourceMap: false,
              modules: {
                localIdentName: '[path]___[name]__[local]___[hash:base64:5]', // babel-plugin-css-module format
              },
            },
          },
        ],
      },
    ],
  },
};
