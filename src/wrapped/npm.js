const _npm = require('npm');
const { promisify } = require('sb-promisify');

exports.default = async function (config) {
  await promisify(_npm.load)(config);
  // HACK: npm can die in a fire
  return Object.keys(_npm.commands).reduce((memo, p) => {
    if (typeof _npm.commands[p] === 'function') {
      Object.defineProperty(memo, p, { value: promisify(function () {
        let cb = [].pop.call(arguments);
        return _npm.commands[p].call(this, [].slice.call(arguments), true, cb);
      }), });
    }
    return memo;
  }, Object.create(_npm.commands));
};
