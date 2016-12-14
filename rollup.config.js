export default {
  context: 'this',
  entry: 'dist/index.js',
  dest: 'dist/bundle/sully.umd.js',
  format: 'umd',
  moduleName: 'sully',
  indent: true,
  globals: {
    'ansi-styles': 'ansi'
  }
};
