'use strict';

const path = require('path');
const coffee = require('coffee');

describe('test/egg-bin.test.js', () => {
  const eggBin = require.resolve('../bin/egg-bin.js');
  const cwd = path.join(__dirname, 'fixtures/test-files');

  describe('global options', () => {
    it('should show version', () => {
      return coffee.fork(eggBin, [ '--version' ], { cwd })
        // .debug()
        .expect('stdout', /\d+\.\d+\.\d+/)
        .expect('code', 0)
        .end();
    });

    it('should show help', () => {
      return coffee.fork(eggBin, [ '--help' ], { cwd })
      // .debug()
        .expect('stdout', /Usage: .*egg-bin.* \[command] \[options]/)
        .expect('code', 0)
        .end();
    });

    it('should show help when command not exists', () => {
      return coffee.fork(eggBin, [ 'not-exists' ], { cwd })
      // .debug()
        .expect('stdout', /Usage: .*egg-bin.* \[command] \[options]/)
        .expect('code', 0)
        .end();
    });
  });
});
