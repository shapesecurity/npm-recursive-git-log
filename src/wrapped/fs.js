const _fs = require('fs');
module.exports = {
  exists(dir) {
    return new Promise(resolve => {
      _fs.exists(dir, resolve);
    });
  },
  readFile(...args) {
    return new Promise((resolve, reject) => {
      _fs.readFile(...args, (err, result) => {
        if (err == null) {
          resolve(result);
        } else {
          reject(err);
        }
      });
    });
  }
};
