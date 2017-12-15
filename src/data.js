class Changelog {
  constructor(startPackageChange, dependencyUpdates) {
    this.startPackageChange = startPackageChange;
    this.dependencyUpdates = dependencyUpdates;
  }
}

class DependencyUpdate {
  constructor(pkg) {
    this.pkg = pkg;
  }
}

class DependencyAddition extends DependencyUpdate {
  constructor(pkg, version) {
    super(pkg);
    this.version = version;
  }
}

class DependencyChange extends DependencyUpdate {
  constructor(pkg, old, _new, logEntries) {
    super(pkg);
    this.old = old;
    this.new = _new;
    this.logEntries = logEntries;
  }
}

class DependencyDowngrade extends DependencyUpdate {
  constructor(pkg, old, _new) {
    super(pkg);
    this.old = old;
    this.new = _new;
  }
}

class DependencyRemoval extends DependencyUpdate {
  constructor(pkg, version) {
    super(pkg);
    this.version = version;
  }
}

class LogEntry {
  constructor({ hash, subject, author }) {
    this.hash = hash;
    this.subject = subject;
    this.author = author;
  }
}

class StartPackageChange extends DependencyChange {}

module.exports = {
  Changelog,
  DependencyAddition,
  DependencyChange,
  DependencyDowngrade,
  DependencyRemoval,
  LogEntry,
  StartPackageChange,
};
