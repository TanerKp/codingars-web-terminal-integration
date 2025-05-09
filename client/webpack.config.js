const path = require('path');

module.exports = {
  entry: './client/client.js',
  output: {
    filename: 'client.js',
    path: path.resolve(__dirname, 'dist'),
  },
};