'use strict';

const path = require('path');
const fs = require('fs');
const BaseCommand = require('@zhennann/common-bin');

class Command extends BaseCommand {
  constructor(rawArgv) {
    super(rawArgv);
    this.parserOptions = {
      execArgv: true,
      removeAlias: true,
    };

    // common-bin setter, don't care about override at sub class
    // https://github.com/node-modules/common-bin/blob/master/lib/command.js#L158
    this.options = {
      typescript: {
        description: 'whether enable typescript support, will load tscompiler on startup',
        type: 'boolean',
        alias: 'ts',
        default: undefined,
      },

      declarations: {
        description: 'whether create dts, will load options.eggTsHelper',
        type: 'boolean',
        alias: 'dts',
        default: undefined,
      },

      tscompiler: {
        description: 'ts compiler, like ts-node、ts-eager、esbuild-register etc.',
        type: 'string',
        alias: 'tsc',
        default: undefined,
      },

      eggTsHelper: {
        description: 'egg-ts-helper register, default use `egg-ts-helper/register`',
        type: 'string',
        alias: 'ets',
        default: undefined,
      },

      tsconfigPaths: {
        description: 'tsconfig-paths register, default use `tsconfig-paths/register`',
        type: 'boolean',
        default: true,
      },
    };
  }

  /**
   * default error handler
   * @param {Error} err - err obj
   */
  errorHandler(err) {
    console.error(err);
    process.nextTick(() => process.exit(1));
  }

  get context() {
    const context = super.context;
    const { argv, debugPort, execArgvObj, cwd } = context;

    // compatible
    if (debugPort) context.debug = debugPort;

    // remove unuse args
    argv.$0 = undefined;

    // read package.json
    let baseDir = argv.baseDir || cwd;
    if (!path.isAbsolute(baseDir)) baseDir = path.join(cwd, baseDir);
    const pkgFile = path.join(baseDir, 'package.json');
    const pkgInfo = fs.existsSync(pkgFile) ? require(pkgFile) : null;
    const eggInfo = (pkgInfo && pkgInfo.egg) || {};
    execArgvObj.require = execArgvObj.require || [];

    if (argv.typescript === undefined) {
      // try to ready EGG_TYPESCRIPT env first, only accept 'true' or 'false' string
      if (process.env.EGG_TYPESCRIPT === 'false') {
        argv.typescript = false;
      } else if (process.env.EGG_TYPESCRIPT === 'true') {
        argv.typescript = true;
      } else if (typeof eggInfo.typescript === 'boolean') {
        // read `egg.typescript` from package.json if not pass argv
        argv.typescript = eggInfo.typescript;
      }
    }

    // read `egg.declarations` from package.json if not pass argv
    if (argv.declarations === undefined && typeof eggInfo.declarations === 'boolean') {
      argv.declarations = eggInfo.declarations;
    }

    // read `egg.tscompiler` from package.json if not pass argv
    // try to load from `cwd` while tscompipler has value or app has ts-node deps
    if (argv.tscompiler === undefined && !eggInfo.tscompiler) {
      const useAppTsNode = pkgInfo && (
        (pkgInfo.dependencies && pkgInfo.dependencies['ts-node']) ||
        (pkgInfo.devDependencies && pkgInfo.devDependencies['ts-node'])
      );

      argv.tscompiler = require.resolve('ts-node/register', useAppTsNode ? { paths: [ cwd ] } : undefined);
    } else {
      argv.tscompiler = argv.tscompiler || eggInfo.tscompiler;
      argv.tscompiler = require.resolve(argv.tscompiler, { paths: [ cwd ] });
    }

    // read `egg.require` from package.json
    if (eggInfo.require && Array.isArray(eggInfo.require)) {
      execArgvObj.require = execArgvObj.require.concat(eggInfo.require);
    }

    // load ts-node
    if (argv.typescript) {
      execArgvObj.require.push(argv.tscompiler);

      // should require argv.tscompiler on current process, let it can require *.ts files
      // e.g.: dev command will execute egg loader to find configs and plugins
      require(argv.tscompiler);
      // let child process auto require ts-node too
      const requireOptions = `--require ${argv.tscompiler}`;
      if (process.env.NODE_OPTIONS) {
        if (!process.env.NODE_OPTIONS.includes(requireOptions)) {
          process.env.NODE_OPTIONS = `${process.env.NODE_OPTIONS} ${requireOptions}`;
        }
      } else {
        process.env.NODE_OPTIONS = requireOptions;
      }
      context.env.NODE_OPTIONS = process.env.NODE_OPTIONS;
      // tell egg loader to load ts file
      // see https://github.com/eggjs/egg-core/blob/master/lib/loader/egg_loader.js#L443
      context.env.EGG_TYPESCRIPT = 'true';
      // set current process.env.EGG_TYPESCRIPT too
      process.env.EGG_TYPESCRIPT = 'true';

      // load files from tsconfig on startup
      context.env.TS_NODE_FILES = process.env.TS_NODE_FILES || 'true';
    }

    // keep same logic with egg-core
    // see https://github.com/eggjs/egg-core/blob/master/lib/loader/egg_loader.js#L49
    if (argv.tsconfigPaths && (argv.typescript || eggInfo.typescript)) {
      execArgvObj.require.push(require.resolve('tsconfig-paths/register'));
    }

    // read egg-ts-helper
    if (argv.eggTsHelper === undefined) {
      argv.eggTsHelper = require.resolve('egg-ts-helper/register');
    } else {
      argv.eggTsHelper = require.resolve(argv.eggTsHelper, { paths: [ cwd ] });
    }

    // load egg-ts-helper
    if (argv.declarations) {
      execArgvObj.require.push(argv.eggTsHelper);
    }

    return context;
  }
}

module.exports = Command;
