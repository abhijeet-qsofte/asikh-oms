// This file extends the Create React App webpack configuration
// It will be automatically merged with the default configuration

module.exports = {
  // Ignore source map warnings from html5-qrcode
  ignoreWarnings: [
    {
      module: /html5-qrcode/,
      message: /Failed to parse source map/,
    },
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        enforce: 'pre',
        use: ['source-map-loader'],
        exclude: /node_modules\/html5-qrcode/,
      },
    ],
  },
};
