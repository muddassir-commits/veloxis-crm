const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/integrations/gsc/auth?client_id=22f3e36f-3923-49bc-a116-806f66b9088c&service=gsc',
  method: 'GET',
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers, null, 2)}`);
  
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  res.on('end', () => {
    console.log(`BODY: ${body}`);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.end();
