'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk');

AWS.config.setPromisesDependency(require('bluebird'));

const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.create = (event, context, callback) => {
    const requestBody = JSON.parse(event.body);
    const type = requestBody.type;
    const description = requestBody.description;


    submitHistoryPromise(history).then(res => {
        const response = {
            statusCode: 200,
            body: JSON.stringify({
                message: 'sucessfully added history',
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


const submitHistoryPromise = history => {
    console.log('adding history');
    const historyData = JSON.stringify({
        id: uuid.v1(),
        type: history.type,
        description: history.description,
        amount: history.amount
    });
    dynamodb.put(historyData).promise().then(res => historyData);
};
