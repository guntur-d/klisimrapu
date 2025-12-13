

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
    console.log("in the body", req.body)
    console.log(req.headers.middlefinger2u)

    var mf = req.headers.middlefinger2u

    // Use MongoDB instead of in-memory state
    const { pendingVisitorModel } = require("../db/schema");

    try {
        const exists = await pendingVisitorModel.findOne({ visitorId: mf });

        if (!exists) {
            // First visit: Create record
            await pendingVisitorModel.create({ visitorId: mf });
            return res.send({ [mf]: 0 });
        } else {
            // Second visit: Remove record (consume token)
            await pendingVisitorModel.deleteOne({ visitorId: mf });
            return res.send({ [mf]: 1 }); // Send 1 or empty to indicate processed
        }
    } catch (err) {
        console.error("Error in phase:", err);
        return res.send({ error: "Internal Error", details: err.message });
    }
}





