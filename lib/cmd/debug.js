const debug = require('util').debuglog('egg-bin:debug');
const cp = require('child_process');
const chalk = require('chalk');
const InspectorProxy = require('inspector-proxy');
const Command = require('./dev');

class DebugCommand extends Command {
  constructor(rawArgv) {
    super(rawArgv);
    this.usage = 'Usage: egg-bin debug [dir] [options]';
    this.options = {
      // set default to empty so `--inspect` will always pass to fork
      inspect: {
        description: 'V8 Inspector port',
        default() {
          return '';
        },
      },
      'inspect-brk': {
        description: 'whether break at start',
      },

      debug: {
        description: 'legacy debugger',
        default() {
          return undefined;
        },
      },

      proxy: {
        description: 'worker debug proxy port',
        default: 9999,
      },
    };
    process.env.EGG_DEBUG = 'true';
  }

  get description() {
    return 'Start server at local debug mode';
  }

  async run(context) {
    const proxyPort = context.argv.proxy;
    context.argv.proxy = undefined;

    const eggArgs = await this.formatArgs(context);
    const options = {
      execArgv: context.execArgv,
      env: Object.assign({ NODE_ENV: 'development', EGG_DEBUG: true }, context.env),
    };
    debug('%s %j %j, %j', this.serverBin, eggArgs, options.execArgv, options.env.NODE_ENV);

    // start egg
    const child = cp.fork(this.serverBin, eggArgs, options);

    // start debug proxy
    const proxy = new InspectorProxy({ port: proxyPort });
    // proxy to new worker
    child.on('message', msg => {
      if (msg && msg.action === 'debug' && msg.from === 'app') {
        const { debugPort, pid } = msg.data;
        debug(`recieve new worker#${pid} debugPort: ${debugPort}`);
        proxy.start({ debugPort }).then(() => {
          // don't log within VSCode and WebStorm
          // TODO: don't start proxy within vscode and webstorm at next major
          if (!process.env.VSCODE_CLI && !process.env.NODE_DEBUG_OPTION && !process.env.JB_DEBUG_FILE) {
            console.log(chalk.yellow(`Debug Proxy online, now you could attach to ${proxyPort} without worry about reload.`));
            console.log(chalk.yellow(`DevTools → ${proxy.url}`));
          }
        });
      }
    });

    child.on('exit', () => proxy.end());
  }
}

module.exports = DebugCommand;
