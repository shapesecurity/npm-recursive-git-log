const args = require('command-line-args')([
  { name: 'package', type: String, defaultOption: true },
  { name: 'from', type: String },
  { name: 'to', type: String, defaultValue: 'latest' },
  { name: 'format', type: String, defaultValue: 'markdown' },
]);

if (!args.package || !args.from) {
  // TODO: show usage using command-line-usage package
  throw new Error('Must pass required options `--package` and `---from`');
}

(async function main() {
  try {
    let formatterModule;
    try {
      formatterModule = require.resolve(`./formatters/${args.format}.js`);
    } catch (unused) {
      console.error(`Could not find formatter: ${args.format}`);
      process.exitCode = 1;
      return;
    }
    let changelog = await require('./index.js').default(args.package, args.from, args.to);
    console.log(require(formatterModule).default(changelog));
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  }
}());
