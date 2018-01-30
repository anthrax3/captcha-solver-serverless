'use strict';
require('dotenv').config();

const Promise = require('bluebird');
const tesseract = require('node-tesseract');
const tempfile = require('tempfile');
const im = require('imagemagick');
const rp = require('request-promise');
const mime = require('mime-types');
const fs = require('fs');
const tough = require('tough-cookie');
const url = require('url');
const imageDataURI = require('image-data-uri');

const decodeDataUri = function(base64Data)
{
    let image = imageDataURI.decode(base64Data);

    let output = tempfile('.'+image.imageType.toLowerCase());
    console.log(`Temp file ${output}`);

    fs.writeFileSync(output, image.dataBuffer, "binary");

    return output;
};

const downloadImage = function(url, cookies, agent)
{
    const options = {
        url: url,
        headers: {
            'User-Agent': agent ? agent : 'Mozilla/5.0 (Windows NT 6.2; rv:20.0) Gecko/20121202 Firefox/20.0'
        },
        encoding: null,
        resolveWithFullResponse: true
    };

    if (cookies)
    {
        // Expected format:
        // {
        //     key: "some_key",
        //     value: "some_value",
        //     domain: 'api.mydomain.com',
        //     httpOnly: true,
        //     maxAge: 31536000
        // }

        let cookie = new tough.Cookie(cookies);

        let cookiejar = rp.jar();
        
        let q = url.parse(url, false);
        let root = q.protocol+"//"+q.hostname+ (q.port!==null ? ":"+q.port : "");
        console.log("Setting cookie for", root);
        cookiejar.setCookie(cookie, root);
        options["jar"] = cookiejar;
    }

    return rp.get(options)
        .then(function (res) {
            let output = tempfile('.'+mime.extension(res.headers["content-type"]));

            console.log(`Temp file ${output}`);

            const buffer = Buffer.from(res.body);
            fs.writeFileSync(output, buffer);

            return output;
        });
};

module.exports.solver = (event, context, callback) => {

    console.log("Event", JSON.stringify(event));
    let body = JSON.parse(event.body);

    let libraryPath = process.env['LD_LIBRARY_PATH'];

    return new Promise(function (resolve, reject) {
        require('child_process').exec(
            'cp -R /var/task/binary /tmp/.; ' +
            'chmod 755 /tmp/binary/preprocess/convert; ' +
            'chmod 755 /tmp/binary/ocr/tesseract; ',

            function (error, stdout, stderr) {
                if (error) {
                    reject(error);
                } else {
                    // console.log("Stdout", stdout);
                    // console.log("Stderr", stderr);
                    resolve();
                }
            }
        );
    })
        .then(function(){
            if (body.url)
            {
                return downloadImage(body.url, body.cookies, body.agent)
            } else
            if (body.base64)
            {
                return decodeDataUri(body.base64);
            } else
                return Promise.reject("No url or content");
        })
        .then(function (filename) {
            process.env['LD_LIBRARY_PATH'] = "/tmp/binary/lib";
            process.env['MAGICK_CONFIGURE_PATH'] = "/tmp/binary";

            return new Promise(function (resolve, reject) {
                let output = tempfile('.tiff');
                im.convert.path = "/tmp/binary/preprocess/convert";
                // im.identify.path = "/tmp/binary/preprocess/identify";

                let preProcess = [filename, output];

                if (body.preprocess)
                {
                    preProcess = body.preprocess.split(" ");
                    preProcess.splice(0, 0, filename);
                    preProcess.push(output);
                }

                console.log("Preprocess params", preProcess);

                im.convert(
                    preProcess,
                    function (err, stdout) {
                        console.log("Preprocess output", stdout, filename, output);

                        if (err) {
                            reject(err);
                        } else {
                            resolve(output);
                        }
                    });
            })
        })
        .then(function (filename) {

            process.env['LD_LIBRARY_PATH'] = libraryPath + ":" + "/tmp/binary/ocr/lib";
            process.env['TESSDATA_PREFIX'] = '/tmp/binary/ocr/tessdata';

            return new Promise(function (resolve, reject) {
                const options = {
                    l: 'eng',
                    psm: 6,
                    binary: '/tmp/binary/ocr/tesseract'
                };

                tesseract.process(filename, options, function (err, text) {
                    if (err) {
                        console.error("Error", err);
                        reject(err);
                    } else {
                        console.log("OCR", text.trim());
                        resolve(text.trim());
                    }
                });

            });
        })
        .then(function (result) {
            const response = {
                statusCode: 200,
                headers: {
                    "Access-Control-Allow-Origin" : "*",
                    "Access-Control-Allow-Credentials" : true
                },
                body: JSON.stringify({
                    text: result,
                }),
            };

            callback(null, response);
        })
        .catch(function (error) {
            console.error(error);

            const response = {
                statusCode: 500,
                headers: {
                    "Access-Control-Allow-Origin" : "*",
                    "Access-Control-Allow-Credentials" : true
                },
                body: JSON.stringify({
                    error: error,
                }),
            };

            callback(null, response);
        });

};
