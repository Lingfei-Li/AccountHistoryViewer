'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk');
const moment = require('moment');
const BloomFilter = require('bloom-filter');

const BALANCE_TABLE = "account-balance";
const HISTORY_TABLE = "account-history-service";

AWS.config.setPromisesDependency(require('bluebird'));

const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.list = (event, context, callback) => {
    const params = {
        TableName: HISTORY_TABLE,
        ProjectionExpression: 'id, bank, #acct, #typ, amount, description, transaction_date_sec, create_date_sec',
        ExpressionAttributeNames: {
            '#typ': 'type',
            '#acct': 'account'
        }
    };
    dynamodb.scan(params).promise().then(function(data) {
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
    }).catch(function(err) {
        return callback(null, internalErrorResponse(err));
    });
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
        TableName: HISTORY_TABLE,
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

exports.calculateDailyBalance = (event, context, callback) => {
    event.Records.forEach((record) => {
        console.log('Stream record: ', JSON.stringify(record, null, 2));
        if (record.eventName === 'INSERT') {
            let amount = record.dynamodb.NewImage.amount.N;
            let transaction_date_sec = record.dynamodb.NewImage.transaction_date_sec.N;
            const params = {
                TableName: BALANCE_TABLE,
                ProjectionExpression: 'date_sec, sequence_number, bloom_filter, balance',
                KeyConditionExpression: 'date_sec = :transaction_date_sec',
                ExpressionAttributeValues: {
                    ":transaction_date_sec": transaction_date_sec
                },
                Limit: 1,
                ScanIndexForward: false
            };
            dynamodb.query(params).promise().then(function(data) {
                console.log(data.Items);
            }).catch(function(err) {
                console.error(err);
            });
        }
    });
};

function internalErrorResponse(err) {
    return {
        statusCode: 500,
        headers: {
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
            error: err
        }),
    };
}


const submitHistoryPromise = history => {
    console.log('adding history');
    const historyData = {
        TableName: HISTORY_TABLE,
        Item: history
    };
    return dynamodb.put(historyData).promise().then(res => historyData);
};
