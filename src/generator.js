const Random = require('random-js');

const TruncatingBuffer = require('./truncatingBuffer');

const average = (a, b) => (a + b) / 2;

const colourAverage = (flameFunctionColour, r, g, b) => {
  if (flameFunctionColour !== null) {
    return [
      average(flameFunctionColour[0], r),
      average(flameFunctionColour[1], g),
      average(flameFunctionColour[2], b),
    ];
  }
  return [r, g, b];
};

function createIterationStep(flameFunctions) {
  let cumulativeProbability = 0;
  flameFunctions.forEach((flameFunction) => {
    cumulativeProbability += flameFunction.probability;
    flameFunction.cumulativeProbability = cumulativeProbability;
  });

  // Avoid ridiculous js rounding errors.
  if (Math.round(cumulativeProbability * 100) / 100 !== 1) {
    throw new Error(`Cuculative probability adds to ${cumulativeProbability}`);
  }

  return ([x, y, r, g, b]) => {
    const random = Random.real(0, 1)(Random.engines.nativeMath);
    for (let i = 0; i < flameFunctions.length; i++) {
      const flameFunction = flameFunctions[i];
      if (random < flameFunction.cumulativeProbability) {
        return [
          ...flameFunction.func([x, y]),
          ...colourAverage(flameFunction.colour, r, g, b),
        ];
      }
    }
    throw new Error('Oh dear2');
  };
}

function runChaosGame(config) {
  const histogramBuffer = new TruncatingBuffer.UInt32Buffer(
    config.INTERNAL_WIDTH, config.INTERNAL_HEIGHT, 4);
  let outOfBoundsCount = 0;

  const iterationStep = createIterationStep(config.flameFunctions);

  const xScaling = config.INTERNAL_WIDTH / (config.X_MAX - config.X_MIN);
  const yScaling = config.INTERNAL_HEIGHT / (config.Y_MAX - config.Y_MIN);

  const canvasOffsetX = x => Math.floor((x - config.X_MIN) * xScaling);
  const canvasOffsetY = y => Math.floor((y - config.Y_MIN) * yScaling);

  process.stdout.write('Chaos Game ');
  let p = [
    Random.real(-2.5, 2.5)(Random.engines.nativeMath),
    Random.real(0, 10)(Random.engines.nativeMath),
    Random.integer(0, 65535)(Random.engines.nativeMath),
    Random.integer(0, 65535)(Random.engines.nativeMath),
    Random.integer(0, 65535)(Random.engines.nativeMath),
  ];

  for (let _ = 0; _ < config.THROWAWAY_ITERATIONS; _++) {
    p = iterationStep(p);
  }

  for (let _ = 0; _ < config.ITERATIONS; _++) {
    p = iterationStep(p);

    if (_ % (config.ITERATIONS / 10) === 0) process.stdout.write('.');

    const x = canvasOffsetX(p[0]);
    const y = canvasOffsetY(p[1]);

    if (histogramBuffer.inBounds(x, y, 0)) {
      histogramBuffer.write(x, y, 0, histogramBuffer.read(x, y, 0) + 1);
      histogramBuffer.write(x, y, 1, average(histogramBuffer.read(x, y, 1), p[2]));
      histogramBuffer.write(x, y, 2, average(histogramBuffer.read(x, y, 2), p[3]));
      histogramBuffer.write(x, y, 3, average(histogramBuffer.read(x, y, 3), p[4]));
    } else {
      outOfBoundsCount += 1;
    }
  }
  process.stdout.write('\n');

  return [histogramBuffer, outOfBoundsCount];
}

function renderHistogram(config, inputBuff) {
  process.stdout.write('Generate averagingBuffer ');
  const averagingBuffer = new TruncatingBuffer.UInt32Buffer(config.WIDTH, config.HEIGHT, 4);

  let freqAverageMax = 0;
  let rAverageMax = 0;
  let gAverageMax = 0;
  let bAverageMax = 0;

  for (let x = 0; x < config.WIDTH; x++) {
    if (x % (config.WIDTH / 10) === 0) {
      process.stdout.write('.');
    }

    for (let y = 0; y < config.HEIGHT; y++) {
      let facc = 0;
      let racc = 0;
      let gacc = 0;
      let bacc = 0;
      for (let i = 0; i < config.SUPERSAMPLING_RATIO; i++) {
        for (let j = 0; j < config.SUPERSAMPLING_RATIO; j++) {
          facc += inputBuff.read(
            x * config.SUPERSAMPLING_RATIO + i,
            y * config.SUPERSAMPLING_RATIO + i,
            0);
          racc += inputBuff.read(
            x * config.SUPERSAMPLING_RATIO + i,
            y * config.SUPERSAMPLING_RATIO + i,
            1);
          gacc += inputBuff.read(
            x * config.SUPERSAMPLING_RATIO + i,
            y * config.SUPERSAMPLING_RATIO + i,
            2);
          bacc += inputBuff.read(
            x * config.SUPERSAMPLING_RATIO + i,
            y * config.SUPERSAMPLING_RATIO + i,
            3);
        }
      }
      const freqAverage = facc / (config.SUPERSAMPLING_RATIO * config.SUPERSAMPLING_RATIO);
      const rAverage = racc / (config.SUPERSAMPLING_RATIO * config.SUPERSAMPLING_RATIO);
      const gAverage = gacc / (config.SUPERSAMPLING_RATIO * config.SUPERSAMPLING_RATIO);
      const bAverage = bacc / (config.SUPERSAMPLING_RATIO * config.SUPERSAMPLING_RATIO);

      averagingBuffer.write(x, y, 0, freqAverage);
      averagingBuffer.write(x, y, 1, rAverage);
      averagingBuffer.write(x, y, 2, gAverage);
      averagingBuffer.write(x, y, 3, bAverage);

      freqAverageMax = Math.max(freqAverageMax, freqAverage);
      rAverageMax = Math.max(rAverageMax, rAverage);
      gAverageMax = Math.max(gAverageMax, gAverage);
      bAverageMax = Math.max(bAverageMax, bAverage);
    }
  }
  process.stdout.write('\n');


  const flogFreqAvMax = Math.log(freqAverageMax + 1);
  const rlogFreqAvMax = Math.log(rAverageMax + 1);
  const glogFreqAvMax = Math.log(gAverageMax + 1);
  const blogFreqAvMax = Math.log(bAverageMax + 1);

  const logNormalise = (val, logMax) => Math.log(val + 1) / logMax;

  process.stdout.write('Render ');
  const outputBuff = new TruncatingBuffer.UInt8Buffer(config.WIDTH, config.HEIGHT, 4);

  for (let x = 0; x < config.WIDTH; x++) {
    if (x % (config.WIDTH / 10) === 0) {
      process.stdout.write('.');
    }

    for (let y = 0; y < config.HEIGHT; y++) {
      const alpha = logNormalise(averagingBuffer.read(x, y, 0), flogFreqAvMax);

      const gamma = val => val ** (1 / config.GAMMA);
      const toRgb = val => val * alpha * 255;

      const r = toRgb(gamma(logNormalise(averagingBuffer.read(x, y, 1), rlogFreqAvMax)));
      const g = toRgb(gamma(logNormalise(averagingBuffer.read(x, y, 2), glogFreqAvMax)));
      const b = toRgb(gamma(logNormalise(averagingBuffer.read(x, y, 3), blogFreqAvMax)));

      outputBuff.write(x, y, 0, r);
      outputBuff.write(x, y, 1, g);
      outputBuff.write(x, y, 2, b);
    }
  }
  process.stdout.write('\n');

  return outputBuff;
}

function guassianBlur(config, inputBuffer) {
  const guassian = sigma => (x, y) => {
    const c = 1 / (2 * Math.PI * (sigma ** 2));
    const exponent = -(x ** 2 + y ** 2) / (2 * sigma ** 2);
    return c * Math.E ** exponent;
  };

  // Diameter d returns a matrix of size 2d + 1.
  const guassian2DMatrix = (diameter, sigma) => {
    const g = guassian(sigma);
    const axis = Array.from(new Array(2 * diameter + 1), (x, i) => i - diameter);
    return axis.map(y => axis.map(x => g(x, y)));
  };

  const convolve = (kernel) => {
    // Kernel assumed to be square.
    const kernelSize = kernel.length;
    const outputBuffer = new TruncatingBuffer.UInt8Buffer(config.WIDTH, config.HEIGHT, 4);

    for (let x = 0; x < config.WIDTH; x++) {
      if (x % (config.WIDTH / 10) === 0) {
        process.stdout.write('.');
      }
      for (let y = 0; y < config.HEIGHT; y++) {
        for (let c = 0; c < 3; c++) {
          let acc = 0;
          for (let kx = 0; kx < kernelSize; kx++) {
            for (let ky = 0; ky < kernelSize; ky++) {
              if (x + kx < 0 || x + kx >= config.WIDTH || y + ky < 0 || y + ky >= config.HEIGHT) {
                continue;
              }
              acc += kernel[kx][ky] * inputBuffer.read(x + kx, y + ky, c);
            }
          }
          outputBuffer.write(x, y, c, acc);
        }
      }
    }
    process.stdout.write('done\n');
    return outputBuffer;
  };
  process.stdout.write('Guassian Blur.');
  return convolve(guassian2DMatrix(
    config.GUASSIAN_BLUR_DIAMETER, config.GUASSIAN_BLUR_SIGMA));
}

module.exports = { runChaosGame, renderHistogram, guassianBlur };
