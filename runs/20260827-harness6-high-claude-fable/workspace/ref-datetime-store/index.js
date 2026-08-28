const micro = require('micro')

const server = micro(async (req, res) => {
  console.log(req, res);
  res.writeHead(200)
  res.end('woot')
})

server.listen(4000)
