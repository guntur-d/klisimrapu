const fastify = require('fastify');
require("dotenv").config();



const path = require("path");
const connect = require("./db/db")
const signup = require("./api/signup")
const kontak = require("./api/kontak")
const service = require("./db/service")
const phase = require("./api/phase")
const gabung = require("./api/gabung")
const daftar = require("./api/daftar")
// var state = require("./api/state")

const disableCache = require("fastify-disablecache");



const os = require("os");

const platform = os.platform();
const hostname = os.hostname()
console.log('====================================================')
console.log(platform)
console.log(hostname, os.homedir())
console.log('====================================================')

const dbConnectionPromise = connect();



var init = () => {
    const app = fastify({
        logger: {
            level: 'info',
            timestamp: () => `,"time":"${new Date(Date.now()).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}"`,
            // file: "/Codes/node/2023/proman/server.log"
            // which is equivalent to:
            // timestamp: stdTimeFunctions.isoTime
        }
    })



    // app.register(require('@fastify/static'), {
    //     root: path.join(__dirname, 'dist'),
    //     prefix: '/gabung/'
    // })

    app.register(require('@fastify/static'), {
        root: path.join(__dirname, 'dist'),
        prefix: '/'
    })

    app.register(require("@fastify/view"), {
        engine: {
            pug: require("pug"),

        },
        root: path.join(__dirname, "dist"), // Points to `./views` relative to the current file

        viewExt: "pug", // Sets the default extension to `.handlebars`
        propertyName: "render",

    });

    // app.register(disableCache);


    app.post('/api/signup', signup)
    app.post('/api/kontak', kontak)
    app.post('/api/service', service)
    app.post('/api/phase', phase)
    app.get('/gabung/:visitor', gabung)
    app.get('/daftar/:email', daftar)


    app.get('/nojs', (req, res) => {
        res.send("Mohon aktifkan Javascript di browser Anda")
    })



    app.get('/', (req, res) => {
        // DB connection is awaited in the export wrapper (Vercel) or via API calls (Standalone)
        res.render('cek.pug')
    });

    //----------------only temporary
    // tools
    //------------------------

    // app.get('/tools', (req,res)=>{

    //     if (nyambung) { 
    //         res.sendFile("tools.html")
    //     } 

    // } );

    return app;
}


const port = process.env.PORT || 3000
const host = '0.0.0.0'

if (require.main === module) {
    // called directly i.e. "node app"
    init().listen({ port, host }, (err, address) => {

        if (err) {
            init().log.error(err)
            process.exit(1)
        }
        init().log.info(`server listening on ${address}`)
    })
} else {
    // required as a module => executed on aws lambda / vercel
    const app = init();
    module.exports = async (req, res) => {
        await app.ready();
        await dbConnectionPromise;
        app.server.emit('request', req, res);
    }
}



// const { gen } = require("./auth/genhash")
// var word = "password"


// gen(word).then(hash => {
//     console.log(hash)
// })

const ev = new Date()
const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
};

console.log(ev.toLocaleDateString('id-ID', options));
console.log(ev.toLocaleTimeString('id-ID'));


