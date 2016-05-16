#!/usr/bin/node

var path = require('path'),
    fs = require('fs'),
    parse = require('csv-parse'),
    http = require('http'),
    accesslog = require('access-log'),
    program = require('commander');


console.error("Linked Connections Ttransfers server use --help to discover more functions");

var transfers;

program
    .version('0.0.1')
    .option('-p --port [portnumber]', 'specify server port')
    .arguments('<transfers.txt>')
    .action(function (tr) {
        transfers = tr;
    })
    .parse(process.argv);

if (!transfers) {
    console.error('Please provide a path to a GTFS transfers.txt file.');
    process.exit();
}

var port = program.port;
if (!port) {
    port = 3000;
}

var context = {
    "gtfs": "http://vocab.gtfs.org/terms#",
    "origin_stop": {"@id": "gtfs:originStop", "@type": "@id"},
    "destination_stop": {"@id": "gtfs:destinationStop", "@type": "@id"},
    "transfer_type": {"@id": "gtfs:TransferType", "@type": "@id"},
    "min_transfer_time": {"@id": "gtfs:minimumTransferTime", "@type": "@id"}
}

var transfersData = [];
fs.createReadStream(transfers)
    .pipe(parse({delimiter: ','}))
    .on('data', function (csvrow) {
        transfersData.push(csvrow);
    })
    .on('end', function () {
        var transersJSON = [];
        for (var i = 1; i < transfersData.length; i++) {
            var row = transfersData[i];
            var transfer = {
                "origin_stop": row[0],
                "destination_stop": row[1],
                "min_transfer_time": row[3]
            }
            transfer["transfer_type"] = "gtfs:RecommendedTransfer" // default value
            if (row[2] == "1") {
                transfer["transfer_type"] = "gtfs:EnsuredTransfer"
            }
            if (row[2] == "2") {
                transfer["transfer_type"] = "gtfs:MinimumTimeTransfer"
            }
            if (row[2] == "3") {
                transfer["transfer_type"] = "gtfs:NoTransfer"
            }
            transersJSON.push(transfer);
        }

        transfersJSONLD = {
            "@context": context,
            "@graph": transersJSON
        }

        //start server

        var app = http.createServer(function (req, res) {
            accesslog(req, res);
            res.setHeader('Content-Type', 'application/ld+json');
            res.end(JSON.stringify(transfersJSONLD, null, 3));
        });
        app.listen(port, 'localhost', function () {
            console.log('Listening on localhost:' + port);
        });
    });