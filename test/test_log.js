'use strict';
const assert = require('chai').assert;

const chalk = require('../lib/chalk');
const log = require('../lib/log');

describe('log', function() {
  let _output = null;
  let result = '';

  before(function() {
    chalk.init();
    _output = log.output;
    log.output = function(s) {
      result = s;
    };
  });

  after(function() {
    log.output = _output;
  });

  beforeEach(function() {
    log.init();
    result = '';
  });

  describe('#setLevel', function() {
    it('should ok with known level', function() {
      log.setLevel('TRACE');
      assert.deepEqual(log.level, log.levels.get('TRACE'));
      log.setLevel('DEBUG');
      assert.deepEqual(log.level, log.levels.get('DEBUG'));
      log.setLevel('INFO');
      assert.deepEqual(log.level, log.levels.get('INFO'));
      log.setLevel('WARN');
      assert.deepEqual(log.level, log.levels.get('WARN'));
      log.setLevel('ERROR');
      assert.deepEqual(log.level, log.levels.get('ERROR'));
    });

    it('should ok with unknown level', function() {
      log.setLevel('');
      assert.deepEqual(log.level, log.levels.get('INFO'));
    });
  });

  describe('#isEnabled', function() {
    it('should ok', function() {
      log.setLevel('DEBUG');
      assert.equal(log.isEnabled('TRACE'), false);
      assert.equal(log.isEnabled('DEBUG'), true);
      assert.equal(log.isEnabled('INFO'), true);
      assert.equal(log.isEnabled('WARN'), true);
      assert.equal(log.isEnabled('ERROR'), true);
    });
  });

  describe('#levels', function() {
    it('should ok with log.trace', function() {
      log.trace('some error');
      assert.equal(result, '');

      log.setLevel('TRACE');
      log.trace('some error');
      assert.equal(result, chalk.gray('[TRACE] some error'));
    });

    it('should ok with log.debug', function() {
      log.debug('some error');
      assert.equal(result, '');

      log.setLevel('DEBUG');
      log.debug('some error');
      assert.equal(result, chalk.gray('[DEBUG] some error'));
    });

    it('should ok with log.info', function() {
      log.info('some error');
      assert.equal(result, 'some error');
    });

    it('should ok with log.warn', function() {
      log.warn('some error');
      assert.equal(result, chalk.yellow('[WARN] some error'));
    });

    it('should ok with log.error', function() {
      log.error('some error');
      assert.equal(result, chalk.red('[ERROR] some error'));
    });

    it('should ok with log.fail', function() {
      log.fail({msg: 'some error', statusCode: 500});
      assert.equal(result, chalk.red('[ERROR] some error [500]'));

      log.fail('some error');
      assert.equal(result, chalk.red('[ERROR] some error [0]'));
    });
  });

  describe('#printf', function() {
    it('should ok', function() {
      log.printf('%s and %d and %%', 'string', 100);
      assert.equal(result, 'string and 100 and %');
    });
  });
});
