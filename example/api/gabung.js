

require("dotenv").config()

var state = require('./state')




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

const connect = require("../db/db");

module.exports = async (req, res) => {
    await connect();
    console.log(req.params)
    var mf = req.params.visitor

    const { pendingVisitorModel } = require("../db/schema");

    try {
        // Check if the visitor ID exists in pending set (meaning they came from phase redirection)
        // Wait, logic in phase: first time creates it.
        // Logic in gabung: if it exists and is 0 (new), show migrate.

        // Let's adjust logic:
        // 1. Phase adds it.
        // 2. Gabung CHECKS it. If exists, show page.
        // Does Gabung delete it? Only if we want one-time access.
        // But the previous memory logic was: Phase creates it. Gabung checks it.
        // If Phase deletes it on second call?
        // Let's stick to: If record exists, allow access.

        const exists = await pendingVisitorModel.findOne({ visitorId: mf });

        if (exists) {
            console.log("Session found for", mf);
            return res.sendFile('migrate/index.html')
        } else {
            console.log("Session NOT found for", mf);
            // Do NOT render cek.pug here, as it triggers the phase check again -> infinite loop
            return res.status(404).send("Session expired or invalid. Please return to home page.");
        }
    } catch (err) {
        console.error("Error in gabung:", err);
        return res.status(500).send("Server Error: " + err.message);
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



