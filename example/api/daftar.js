

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

module.exports = (req, res) => {

   
  
            res.sendFile('index.html')
       
 

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



