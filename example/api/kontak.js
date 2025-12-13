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


    var htj = new HTJ

    var hartang = htj.hartang
    var jam = htj.jam

    var text = req.body.text
    var toAddress = req.body.to

    console.log(process.env.NRPAS, toAddress)
    


    if (process.env.NRPAS) {

        console.log(process.env.NRPAS, toAddress)
        // const transporter = nodemailer.createTransport({
        //     service: 'gmail',
        //     auth: {
        //         user: 'efinanceapps@gmail.com',
        //         pass: process.env.EPASS// naturally, replace both with your real credentials or an application-specific password
        //     }
        // });

        const transporter = nodemailer.createTransport({
            host: "mail.efin.site",
            port: 465,
            secure: true,
            auth: {
                // TODO: replace `user` and `pass` values from <https://forwardemail.net>
                user: "no-reply@efin.site",
                pass: process.env.NRPAS,
            },
        });

        var isi = "Bapak / Ibu yang terhormat, " + "\n" +
            "Terima kasih telah mengubungi kami." + "\n" +
            "Tim kami akan segera merespon." + "\n" +
            "Mohon ditunggu. Salam," + "\n" +
            "E|F|I|N|-|C|O|M|M|U|N|I|T|Y" + "\n" +
            "\n" +
            "© 2024" + "\n"

        const mailOptions = {
            from: 'no-reply@efin.site',
            // to: 'efin@solusiti.com',
            to: toAddress,
            bcc: ['efinanceapps@gmail.com',
                'efin@solusiti.com', 
               // 'data@efin.site'
            ],

            subject: 'Inquiry efin.site',
            text: isi


        };
        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
                res.send(new fail(error, 500))
            } else {
                console.log('Email sent: ' + info.response);

                const mailOptions2 = {
                    from: 'no-reply@efin.site',
                    // to: 'efin@solusiti.com',
                    to: 'support@efin.site',
                    bcc: ['efinanceapps@gmail.com',
                       // 'data@efin.site'
                    ],

                    subject: 'Inquiry',
                    text: 'Informasi Kontak' + "\n" + text + "\n" +
                    "pada hari " + hartang + ", jam " + jam + " WIB"


                };

                transporter.sendMail(mailOptions2, function (error, info) {
                    if (error) {
                        console.log(error);
                        res.send(new fail(error, 500))
                    } else {

                        console.log('Email sent: ' + info.response);



                    }
                })




                //  res.send(new success(info.response))


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



