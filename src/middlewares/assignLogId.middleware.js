const {v4: uuidv4} = require('uuid')

const assignLogId = (req, res, next)=>{
    req.logId = uuidv4();
    next();
}

module.exports = assignLogId;