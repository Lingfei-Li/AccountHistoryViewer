
var express = require('express');
var http = require('http');
var path = require('path');
var fs = require('fs');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var uuid = require('uuid/v1');
var config = require('./config');
var AWS = require('aws-sdk');

var app = express();

app.set('port', process.env.PORT || 3000);
app.use(morgan('dev'));
app.use(bodyParser.json());


AWS.config.update({
    region: config.AWS_REGION,
    endpoint: config.DDB_ENDPOINT
});

var db = new AWS.DynamoDB({region: config.AWS_REGION});
var docClient = new AWS.DynamoDB.DocumentClient();


function onScan(err, data) {
    if(err) {
        console.error('unable to scan the table. error: ', JSON.stringify(err));
    } else {
        console.log('scan completed');
        data.Items.forEach(function(t) {
            console.log(t.id);
            console.log(t.type);
            console.log(t.description);
            console.log(t.amount);
        });
    }
}


app.get('/', function(req, res) {

    var params = {
        TableName: 'TransactionHistory',
        ProjectionExpression: 'id, #typ, amount, description',
        ExpressionAttributeNames: {
            '#typ': 'type'
        }
    };

    console.log('Scanning transactino history table');
    docClient.scan(params, onScan);

    res.send('hello world');
});

var putTransaction = function(t) {
    var formData = {
        TableName: config.TABLE_NAME,
        Item: {
            id: t.id,
            transaction_date: t.transaction_date,
            type: t.type,
            description: t.description,
            amount: t.amount
        }
    };
    docClient.put(formData, function(err, data) {
        if(err) {
            console.error("Error adding item to database: ", err);
        }
        else {
            console.log('Form data added to database');
        }
    })
};

app.post('/', function(req, res) {
    if(!req.body.type || !req.body.description || !req.body.amount) {
        res.status(400);
        res.send('The input does not have all the requried fields.');
        return;
    }

    var t = {
        id: uuid(),
        transaction_date: new Date().getMilliseconds(),
        type: req.body.type,
        description: req.body.description,
        amount: req.body.amount
    };
    console.log(req.body);

    res.sendStatus(200);

    putTransaction(t);
});


http.createServer(app).listen(app.get('port'), function() {
    console.log('Express server listening on port ' + app.get('port'));

});