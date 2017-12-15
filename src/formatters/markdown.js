const {
  DependencyAddition,
  DependencyChange,
  DependencyDowngrade,
  DependencyRemoval,
} = require('../data.js');

function markdown(literalParts, ...interpolations) {
  return interpolations.reduce(
    (memo, interpolatedPart, idx) =>
      memo + ('' + interpolatedPart).replace(/^#|[*\\`[\]~!_]/g, x => `\\${x}`) + literalParts[idx + 1],
    literalParts[0]
  );
}

function renderStartPackageChange({ pkg, old, new: _new, logEntries }) {
  return markdown`# ${pkg} changelog: ${old} to ${_new}\n` +
    (logEntries.length > 0 ? `\n${logEntries.map(renderLogEntry).join('\n')}` : '');
}

function renderDependencyUpdate(a) {
  if (a instanceof DependencyAddition) {
    return markdown`### Dependency added: ${a.pkg} ${a.version}`;
  } else if (a instanceof DependencyChange) {
    return markdown`### Dependency changed: ${a.pkg} from ${a.old} to ${a.new}` +
      (a.logEntries.length > 0 ? `\n${a.logEntries.map(renderLogEntry).join('\n')}` : '');
  } else if (a instanceof DependencyDowngrade) {
    return markdown`### Dependency downgraded: ${a.pkg} from ${a.old} to ${a.new}`;
  } else if (a instanceof DependencyRemoval) {
    return markdown`### Dependency removed: ${a.pkg} ${a.version}`;
  }
  throw new Error(`Unrecognised DependencyUpdate: ${Object.getPrototypeOf(a).constructor.name}`);
}

function renderLogEntry(commit) {
  return markdown`* ${commit.hash.slice(0, 8)}: ${commit.subject} (${commit.author})`;
}

function renderChangelog(changelog) {
  return renderStartPackageChange(changelog.startPackageChange) + '\n\n' +
    changelog.dependencyUpdates.map(renderDependencyUpdate).join('\n\n');
}

exports.default = renderChangelog;
