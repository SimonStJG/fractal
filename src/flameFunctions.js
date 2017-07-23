/* eslint-disable no-unused-vars,no-extend-native,prefer-rest-params */

const random = require('random-js');
const util = require('util');

// Attach description to function
const describe = (description, f) => {
  f.description = description;
  return f;
};

// Compose functions
Function.prototype.o = function compose(g) {
  const f = this;
  return describe(`${f.description} o ${g.description}`, function composed() {
    return f.call(this, g.apply(this, arguments));
  });
};

const affineTransformation = (m, c) =>
  describe(`(affineTransformation ${util.inspect(m).replace('\n', '')} ${util.inspect(c)})`,
    ([x, y]) => [m[0][0] * x + m[0][1] * y + c[0], m[1][0] * x + m[1][1] * y + c[1]]);

const rotation = theta => describe(`(rotation ${theta})`, affineTransformation(
  [[Math.cos(theta), -Math.sin(theta)], [Math.sin(theta), Math.cos(theta)]], [0, 0]));

const sinusoidal = describe('sinusoidal', ([x, y]) => [Math.sin(x), Math.sin(y)]);

const spherical = describe('spherical', ([x, y]) => {
  const d = (x * x) + (y * y);
  return [x / d, y / d];
});

const swirl = describe('swirl', ([x, y]) => {
  const d = (x * x) + (y * y);
  return [x * Math.sin(d) - y * Math.cos(d), x * Math.cos(d) + y * Math.sin(d)];
});

const horseshoe = describe('horseshoe', ([x, y]) => {
  const d = 1 / Math.sqrt((x * x) + (y * y));
  if (isNaN(d)) return [0, 0];
  return [d * (x - y) * (x + y), 2 * x * y];
});

const randomAffine = () => {
  const rr = () => random.real(-0.2, 0.2)(random.engines.nativeMath);
  return affineTransformation([[0.8 + rr(), rr()], [rr(), 0.8 + rr()]], [rr(), rr()]);
};

const post = randomAffine();

const flameFunctions = [{
  func: post.o(sinusoidal.o(randomAffine())),
  probability: 0.25,
  colour: [65535, 0, 0],
},
{
  func: post.o(horseshoe.o(randomAffine())),
  probability: 0.25,
  colour: [0, 65535, 0],
},
{
  func: post.o(rotation(Math.PI)),
  probability: 0.25,
  colour: null,
},
{
  func: post.o(swirl.o(randomAffine())),
  probability: 0.25,
  colour: [0, 0, 65535],
}].map((f) => {
  f.description = f.func.description;
  return f;
});

module.exports = flameFunctions;
