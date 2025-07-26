// const {v4: uuidv4} = require('uuid')
import { v4 as uuidv4 } from 'uuid';

const assignLogId = (req, res, next)=>{
    req.logId = uuidv4();
    next();
}

export default assignLogId;