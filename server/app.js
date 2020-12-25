const Koa = require('koa');
const app = new Koa();
const Router = require('koa-router');
const path = require('path');
const router = new Router();
const fs = require('fs-extra');
const koaBodyParser = require('koa-body');
const Multiparty = require('multiparty');
const UPLOAD_DIR = path.join(__dirname, './uploads');
const sleep = () => new Promise((resolve) => setTimeout(resolve, 1000))

app.use(koaBodyParser());
app.use(router.routes());
app.use(router.allowedMethods())

const pipeStream = (path, writeStream) => {
    return new Promise(resolve => {
        const readStream = fs.createReadStream(path);
        readStream.on("end", () => {
            fs.unlinkSync(path);
            resolve();
        });
        readStream.pipe(writeStream);
    });
}

router.post('/upload', async (ctx, res) => {

    const form = new Multiparty.Form({
        uploadDir: UPLOAD_DIR,
    })
    form.parse(ctx.req, async (err, fields, files) => {
        if (err) throw err;
        const [chunk] = files.chunk;
        const [hash] = fields.chunkHash;
        const [filename] = fields.chunkFilename;

        const targetFilePath = path.join(UPLOAD_DIR, hash);
        if (fs.existsSync(targetFilePath)) {
            fs.unlinkSync(chunk.path);
            return;
        }
        await fs.move(
            chunk.path,
            targetFilePath
        )
    })
    await sleep();
    ctx.body = JSON.stringify({
        responseCode: 000000,
        responseMsg: 'SUCCESS'
    })
});

router.post('/merge', async (ctx, res) => {
    const { filename, size } = ctx.request.body;
    const finalFilePath = path.join(UPLOAD_DIR, filename);

    const matchesFile = await fs.readdirSync(UPLOAD_DIR).filter(d => {
        return (/^(\d+)?_/).test(d);
    });
    await Promise.all(matchesFile.map((chunkPath) => {
        const i = +chunkPath.match(/^(\d+)?_/)[1];
        const chunkFilePath =  path.join(UPLOAD_DIR, chunkPath);
        return pipeStream(chunkFilePath, fs.createWriteStream(finalFilePath, {
            start: i * size, end: (i + 1) * size
        }));
    }))
    await sleep();
    ctx.body = JSON.stringify({
        responseCode: 000000,
        responseMsg: 'SUCCESS'
    })
});



app.listen(3000, () => {
    console.log('listening on http://localhost:3000')
});

