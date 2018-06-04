require('dotenv').config()
const workersCI = require('./workers-ci')
const setup = require('./setup')

module.exports.workersCI = workersCI
module.exports.setup = setup
