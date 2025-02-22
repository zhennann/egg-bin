import { Controller } from 'egg';
import DbService from 'app/service/db';

export default class HomeController extends Controller {
  async index() {
    const { ctx, app } = this as any;
    ctx.customLog();
    app.customLog();
    ctx.request.customLog();
    ctx.response.customLog();
    ctx.helper.customLog();
    console.info(app.config.otherBizConfig.type);
    console.info(await ctx.service.db.fetch());
    console.info(await app.model.User.get());
    console.info('biz config', ctx.app.config.biz.type);
    ctx.body = 'ok';
    console.log(DbService);
  }
}
