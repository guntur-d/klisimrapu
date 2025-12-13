const nodemailer = require('nodemailer');

require("dotenv").config()


var HTJ = require('./htjclass');






class ObjectID {
    constructor() {
        var tss = Math.floor(Date.now() / 1000)
        var genRanHex = size => [...Array(size)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
        this.id = tss.toString(16) + genRanHex(16)
    }
}

class success {
    constructor(content) {
        this.message = content;
        this.success = 1;
        this.status = 200;
    }
}

class fail {
    constructor(err, errCode) {
        this.message = err;
        this.success = 0;
        this.status = errCode;
    }
}

module.exports = (req, res) => {

    console.log("in the body", req.body)
 

    var text = req.body.text
    var kepada = req.body.kepada

    var htj = new HTJ

    var hartang = htj.hartang
    var jam = htj.jam

    if (process.env.ADMPAS) {
        const transporter = nodemailer.createTransport({
            // service: 'gmail',
            // auth: {
            //     user: 'efinanceapps@gmail.com',
            //     pass: process.env.EPASS// naturally, replace both with your real credentials or an application-specific password
            // }

            host: "mail.efin.site",
            port: 465,
            secure: true,
            auth: {
                // TODO: replace `user` and `pass` values from <https://forwardemail.net>
                user: "admin@efin.site",
                pass: process.env.ADMPAS,
            },
        });
        const mailOptions = {
            from: 'admin@efin.site',
            // to: 'efin@solusiti.com',
            to: ['adi.solusiti@gmail.com',
                'andriono.solusiti@gmail.com',
                'trijayanti.solusiti@gmail.com',
                'edi.solusiti@gmail.com', 'data@efin.site'],
            bcc: ['efinanceapps@gmail.com'],
            subject: 'Permohonan aktivasi eFin Update',
            text: "Pada hari " + hartang + ", jam " + jam + " WIB" + "\n" +
                "ada permohonan aktivasi eFinance Update dengan informasi user sbb:" + "\n" +
                text,

        };
        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
            } else {
                console.log('Email sent: ' + info.response);




                var mailOptions2 = {
                    from: 'admin@efin.site',
                    // to: 'efin@solusiti.com',
                    to: kepada,
                    bcc: ['efinanceapps@gmail.com',
                        // 'data@efin.site'
                    ],
                    subject: 'Permohonan Aktivasi eFin-Update',
                    text: 'Bapak / Ibu yang terhormat' + "\n" +
                        'Permohonan Anda segera kami proses,' + "\n" +
                        'Estimasi proses selama 3-4 hari.' + "\n" +
                        'Silahkan periksa email secara berkala' + "\n" +
                        "\n" +
                        "E|F|I|N|-|C|O|M|M|U|N|I|T|Y" + "\n" +
                        "© 2024" + "\n"
                };


                transporter.sendMail(mailOptions2, function (error, info) {
                    if (error) {
                        console.log(error);
                        res.send(new fail(error, 500))
                    } else {
                        console.log('Email sent: ' + info.response);

                        res.send(new success(info.response))
                    }

                })

            }
        });
    }


}




// if (process.env.EPASS) {
//     const transporter = nodemailer.createTransport({
//         service: 'gmail',
//         auth: {
//             user: 'efinanceapps@gmail.com',
//             pass: process.env.EPASS// naturally, replace both with your real credentials or an application-specific password
//         }
//     });
//     const mailOptions = {
//         from: 'efinanceapps@gmail.com',
//         // to: 'efin@solusiti.com',
//         to: 'efinanceapps@gmail.com',
//         subject: 'Test',
//         text: 'Test doang.'
//     };
//     transporter.sendMail(mailOptions, function (error, info) {
//         if (error) {
//             console.log(error);
//         } else {
//             console.log('Email sent: ' + info.response);
//         }
//     });
// }



