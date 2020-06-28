const https = require('https');
const http = require('http');

const webGet = (url, protocol = 'https') => {
    return new Promise((resolve, reject) => {
        const protoCLient = protocol === 'https' ? https : http
        protoCLient.get(url, (resp) => {
            let data = ''
            resp.on('data', (chunk) => {
                data += chunk;
            })
            resp.on('end', () => {
                resolve(data)
            })
        }).on("error", (err) => {
            reject(err)
        })
    })
}

const webRequest = (url, method = "GET", body = '', protocol = 'https') => {
    return new Promise((resolve, reject) => {
        const protoCLient = protocol === 'https' ? https : http
        const urlObject = new URL(url)
        var post_options = {
            host: urlObject.hostname,
            path: urlObject.pathname + urlObject.search,
            method: method,
        };
        if (body) {
            post_options['headers'] = {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        }
        const req = protoCLient.request(post_options, res => {
            //console.log('statusCode:', res.statusCode)
            res.setEncoding('utf8')
            // res.on('data', (d) => {
            //     resolve(d)
            // });
            let data = ''
            res.on('data', (chunk) => {
                data += chunk;
            })
            res.on('end', () => {
                resolve(data)
            })
        })

        req.on('error', (e) => {
            console.log(e);
            reject(e)
        });

        if (body) {
            req.write(body);
        }
        req.end();
    })
}

exports.webGet = webGet
exports.webRequest = webRequest