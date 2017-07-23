
class Base {
  constructor(xWidth, yWidth, zWidth, dataWidth) {
    this.xWidth = xWidth;
    this.yWidth = yWidth;
    this.zWidth = zWidth;
    this.dataWidth = dataWidth;
    this.buffer = Buffer.alloc(xWidth * yWidth * zWidth * dataWidth);
  }

  inBounds(x, y, z) {
    return !(
      x < 0 ||
      x >= this.xWidth ||
      y < 0 ||
      y >= this.yWidth ||
      z < 0 ||
      z >= this.zWidth);
  }

  offset(x, y, z) {
    if (!this.inBounds(x, y, z)) {
      throw new Error(`Out of bounds ${x} ${y} ${z}`);
    }
    return ((y * this.xWidth * this.zWidth) + (x * this.zWidth) + z) * this.dataWidth;
  }
}

class UInt16Buffer extends Base {
  constructor(xWidth, yWidth, zWidth) {
    super(xWidth, yWidth, zWidth, 2);
  }

  read(x, y, z) {
    return this.buffer.readUInt16BE(this.offset(x, y, z));
  }

  write(x, y, z, val) {
    this.buffer.writeUInt16BE(val, this.offset(x, y, z));
  }
}

class UInt8Buffer extends Base {
  constructor(xWidth, yWidth, zWidth) {
    super(xWidth, yWidth, zWidth, 1);
  }

  read(x, y, z) {
    return this.buffer.readUInt8(this.offset(x, y, z));
  }

  write(x, y, z, val) {
    this.buffer.writeUInt8(val, this.offset(x, y, z));
  }
}

class UInt32Buffer extends Base {
  constructor(xWidth, yWidth, zWidth) {
    super(xWidth, yWidth, zWidth, 4);
  }

  read(x, y, z) {
    return this.buffer.readUInt32BE(this.offset(x, y, z));
  }

  write(x, y, z, val) {
    this.buffer.writeUInt32BE(val, this.offset(x, y, z));
  }
}

module.exports = { Base, UInt16Buffer, UInt8Buffer, UInt32Buffer };
