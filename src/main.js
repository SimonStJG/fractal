// https://en.wikipedia.org/wiki/Fractal_flame
// http://flam3.com/flame.pdf

const bmp = require('bmp-js');
const fs = require('fs');
const uuid = require('uuid');

const flameFunctions = require('./flameFunctions');
const generator = require('./generator');
const config = ((baseConfig) => {
  baseConfig.INTERNAL_WIDTH = baseConfig.WIDTH * baseConfig.SUPERSAMPLING_RATIO;
  baseConfig.INTERNAL_HEIGHT = baseConfig.HEIGHT * baseConfig.SUPERSAMPLING_RATIO;
  baseConfig.flameFunctions = flameFunctions;
  return baseConfig;
})(require('./config'));

process.stdout.write(`Running with config:\n${JSON.stringify(config)}\n`);
const [histogramBuffer, outOfBoundsCount] = generator.runChaosGame(config);
process.stdout.write(`Out of bounds ratio: ${outOfBoundsCount / config.ITERATIONS}\n`);
const renderedBuffer = generator.renderHistogram(config, histogramBuffer);
const blurredBuffer = generator.guassianBlur(config, renderedBuffer);

const outputFile = `output/${uuid.v4()}.bmp`;
process.stdout.write(`Writing output to:\n${outputFile}\n`);
fs.writeFileSync(outputFile, bmp.encode({
  data: blurredBuffer.buffer,
  width: config.WIDTH,
  height: config.HEIGHT,
}).data);
fs.writeFileSync(`${outputFile}.config`, JSON.stringify(config));
