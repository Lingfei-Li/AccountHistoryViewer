'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk');
const moment = require('moment');

AWS.config.setPromisesDependency(require('bluebird'));

const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.create = (event, context, callback) => {
    const requestBody = JSON.parse(event.body);

    const history = {
        id: uuid.v1(),
        type: requestBody.type,
        description: requestBody.description,
        amount: requestBody.amount
    };

    submitHistoryPromise(history).then(res => {
        const response = {
            statusCode: 200,
            body: JSON.stringify({
                message: 'successfully added history',
                id: res.id,
            }),
        };
        callback(null, response);
    }).catch(err => {
        console.error(err);
        const response = {
            statusCode: 500,
            body: JSON.stringify({
                message: 'failed to add'
            }),
        };
        callback(null, response);
    });
};


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
            callback(err);
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
    const startDateSec = parseInt(event.path.startDateSecStr);
    const endDateSec = parseInt(event.path.endDateSecStr);

    const params = {
        TableName: process.env.HISTORY_TABLE,
        ProjectionExpression: 'id, bank, #acct, #typ, amount, description, transaction_date_sec, create_date_sec',
        FilterAttributeRanges: "transaction_date_sec between :start_date_sec and :end_date_sec",
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
            callback(err);
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

const submitHistoryPromise = history => {
    console.log('adding history');
    const historyData = {
        TableName: process.env.HISTORY_TABLE,
        Item: history
    };
    return dynamodb.put(historyData).promise().then(res => historyData);
};
