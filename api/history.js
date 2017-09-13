'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk');
const moment = require('moment');

AWS.config.setPromisesDependency(require('bluebird'));

const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.list = (event, context, callback) => {
    const params = {
        TableName: process.env.HISTORY_TABLE,
        ProjectionExpression: 'id, bank, #acct, #typ, amount, description, transaction_date_sec, create_date_sec',
        ExpressionAttributeNames: {
            '#typ': 'type',
            '#acct': 'account'
        }
    };
    const onScan = (err, data) => {
        if(err) {
            const response = {
                statusCode: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    error: err
                }),
            };
            return callback(null, response);
        }
        else {
            const response = {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    history: data.Items
                }),
            };
            return callback(null, response);
        }
    };
    dynamodb.scan(params, onScan);
};

exports.listBetweenDates = (event, context, callback) => {
    console.log(event);
    let startDateSec = parseInt(event.pathParameters.startDateSecStr);
    let endDateSec = parseInt(event.pathParameters.endDateSecStr);
    if(endDateSec <= startDateSec) {
        endDateSec = moment().unix();
    }
    if(isNaN(startDateSec) || isNaN(endDateSec)) {
        const response = {
            statusCode: 400,
            headers: {
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                message: "Path parameters missing or they cannot be converted to integer"
            }),
        };
        return callback(null, response);
    }

    const params = {
        TableName: process.env.HISTORY_TABLE,
        ProjectionExpression: 'id, bank, #acct, #typ, amount, description, transaction_date_sec, create_date_sec',
        FilterExpression: "transaction_date_sec between :start_date_sec and :end_date_sec",
        ExpressionAttributeNames: {
            '#typ': 'type',
            '#acct': 'account'
        },
        ExpressionAttributeValues: {
            ':start_date_sec': startDateSec,
            ':end_date_sec': endDateSec,
        }
    };
    const onScan = (err, data) => {
        if(err) {
            const response = {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    message: "Path parameters missing or they cannot be converted to integer",
                    error: err
                }),
            };
            return callback(null, response);
        }
        else {
            const response = {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    history: data.Items
                }),
            };
            return callback(null, response);
        }
    };
    dynamodb.scan(params, onScan);
};

exports.calculateBalance = (event, context, callback) => {
    const response = {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
            'message': 'To be implemented'
        }),
    };
    return callback(null, response);
};


const submitHistoryPromise = history => {
    console.log('adding history');
    const historyData = {
        TableName: process.env.HISTORY_TABLE,
        Item: history
    };
    return dynamodb.put(historyData).promise().then(res => historyData);
};
