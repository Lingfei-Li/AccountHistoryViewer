'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk');
const moment = require('moment');

const HISTORY_TABLE = process.env.AccountTransactionsTableName;

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
                "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
                "Access-Control-Allow-Methods": "DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT",
                "Access-Control-Allow-Origin": "*"
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
                "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
                "Access-Control-Allow-Methods": "DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT",
                "Access-Control-Allow-Origin": "*"
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
    dynamodb.scan(params, onScan).promise().then(function(data) {
        const response = {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
                "Access-Control-Allow-Methods": "DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT",
                "Access-Control-Allow-Origin": "*"
            },
            body: JSON.stringify({
                history: data.Items
            }),
        };
        return callback(null, response);
    }).then(function(err) {
        const response = {
            statusCode: 500,
            headers: {
                "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
                "Access-Control-Allow-Methods": "DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT",
                "Access-Control-Allow-Origin": "*"
            },
            body: JSON.stringify({
                error: err
            }),
        };
        return callback(null, response);
    });
};
function internalErrorResponse(err) {
    return {
        statusCode: 500,
        headers: {
            "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
            "Access-Control-Allow-Methods": "DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT",
            "Access-Control-Allow-Origin": "*"
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
