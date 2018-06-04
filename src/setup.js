module.exports = (function () {
  return {
    masterZoneName: process.env.ZONE || '',
    apiKey: process.env.API_KEY || '',
    email: process.env.EMAIL || ''
  }
})()
