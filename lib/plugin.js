'use strict';
var cp = require('child_process');
var fs = require('fs');
var path = require('path');

var _ = require('underscore');
var request = require('request');

var h = require('./helper');
var config = require('./config');
var log = require('./log');

function Plugin(id, name, ver, desc, deps) {
  this.id = id;
  this.name = name;
  this.ver = ver || 'default';
  this.desc = desc;
  this.enabled = true;

  // only need deps for current platform
  this.deps = _.chain(deps || [])
    .filter(x => ! x.includes(':') || x.includes(':' + process.platform))
    .map(x => x.split(':')[0])
    .value();
}

Plugin.prototype.init = function() {
  this.config = config.plugins[this.name] || {};
  this.next = null;
};

Plugin.prototype.setNext = function(next) {
  Object.setPrototypeOf(this, next);
  this.next = next;
};

Plugin.prototype.install = function(cb) {
  if (this.deps.length === 0) return cb();

  const cmd = 'npm install --save ' + this.deps.join(' ');
  log.debug(cmd);
  const spin = h.spin(cmd);
  cp.exec(cmd, {cwd: h.getCodeDir()}, function() {
    spin.stop();
    return cb();
  });
};

Plugin.prototype.help = function() {};

Plugin.plugins = [];

Plugin.init = function(head) {
  let plugins = [];
  for (let f of h.getCodeDirData('lib/plugins')) {
    const p = f.data;
    if (!p) continue;

    p.file = f.file;
    if (f.name[0] === '.') p.enabled = false;

    log.trace('found plugin: ' + p.name + '=' + p.ver);
    if (p.enabled) {
      p.init();
      log.trace('inited plugin: ' + p.name);
    } else {
      log.trace('skipped plugin: ' + p.name);
    }

    plugins.push(p);
  }

  // chain the plugins together
  // the one has bigger `id` comes first
  plugins = _.sortBy(plugins, x => -x.id);

  let last = head;
  for (let p of plugins) {
    if (!p.enabled) continue;
    last.setNext(p);
    last = p;
  }
  Plugin.plugins = plugins;
};

Plugin.copy = function(src, cb) {
  // FIXME: remove local file support?
  if (path.extname(src) !== '.js') {
    src = config.sys.urls.plugin.replace('$name', src);
  }
  const dst = h.getPluginFile(src);

  const srcstream = src.startsWith('https://') ? request(src) : fs.createReadStream(src);
  srcstream.on('response', function(resp) {
    if (resp.statusCode !== 200)
      srcstream.emit('error', 'HTTP Error: ' + resp.statusCode);
  });
  srcstream.on('error', function(e) {
    spin.stop();
    fs.unlinkSync(dst);
    return cb(e);
  });

  const dststream = fs.createWriteStream(dst);
  dststream.on('close', function() {
    spin.stop();
    return cb(null, dst);
  });

  log.debug('copying from ' + src);
  const spin = h.spin('Downloading ' + src);
  srcstream.pipe(dststream);
};

Plugin.install = function(name, cb) {
  Plugin.copy(name, function(e, fullpath) {
    if (e) return log.error(e);
    log.debug('copied to ' + fullpath);

    const plugin = require(fullpath);
    plugin.install(function() {
      return cb(null, plugin);
    });
  });
};

module.exports = Plugin;
