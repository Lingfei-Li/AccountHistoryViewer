'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk');
const moment = require('moment');
const response = require('response');

const DAILY_BALANCE_TABLE = "ProjectErebor-DailyBalance";
const MONTHLY_BALANCE_TABLE = "ProjectErebor-MonthlyBalance";
const TRANSACTIONS_TABLE = "ProjectErebor-Transactions";
const LAST_TRANSACTION_DATE_TABLE = "ProjectErebor-LastTransactionDate";


AWS.config.update({
    region: "us-west-2"
});
const dynamodb = new AWS.DynamoDB.DocumentClient();

const getBalanceForDate = (event, context, callback) => {
    console.log("Received request: balance of date. Event:", event);
    console.log("DateSec:", event.pathParameters.dateSec);

    const dateSec = parseInt(event.pathParameters.dateSec);
    if(isNaN(dateSec)) {
        return callback(response.clientError("Path parameter 'dateSec' missing or it cannot be converted to integer"));
    }
    const requestedDateTime = moment.unix(dateSec);

    const monthlyBalanceQueryParams = {
        TableName: MONTHLY_BALANCE_TABLE,
        ProjectionExpression: 'YearMonth, BankName, Balance, DailyBalanceMap'
    };
    dynamodb.scan(monthlyBalanceQueryParams, function(err, data) {
        if(err) {
            console.error("Got error scanning dynamodb:", err);
            return callback(response.internalError(err));
        } else {
            const monthlyBalanceData = data.Items;
            let balancePerBank = {};
            for(let i = 0; i < monthlyBalanceData.length; i ++) {
                const balanceData = monthlyBalanceData[i];
                const yearMonth = balanceData['YearMonth'];
                const bankName = balanceData['BankName'];
                let balance = parseFloat(balanceData['Balance']);
                const dailyBalanceMap = balanceData['DailyBalanceMap'];
                const year = parseInt(yearMonth.split('-')[0]);
                const month = parseInt(yearMonth.split('-')[1]);
                if(year < requestedDateTime.year() || year === requestedDateTime.year() && month <= requestedDateTime.month()) {
                    if(bankName && !isNaN(balance)) {
                        if(year === requestedDateTime.year() && month === requestedDateTime.month()) {
                            balance = 0;
                            for(let dateOfMonth = 1; dateOfMonth <= requestedDateTime.date(); dateOfMonth ++) {
                                if(dateOfMonth in dailyBalanceMap) {
                                    balance += parseFloat(dailyBalanceMap[dateOfMonth]);
                                }
                            }
                        }
                        if(bankName in balancePerBank) {
                            balancePerBank[bankName] += balance;
                        } else {
                            balancePerBank[bankName] = balance;
                        }
                    } else {
                        console.log("BankName or Balance data cannot be retrieved from DynamoDB records: " + monthlyBalanceData);
                        return callback(response.clientError("BankName or Balance data cannot be retrieved from DynamoDB records: " + monthlyBalanceData));
                    }
                }
            }
            console.log(balancePerBank);
        }
    });

    return callback(null, response.successWithBalancePerBank({}));
};


const event = {
    "resource": "/balance/date/{dateSec}",
    "path": "/balance/date/1510790400",
    "httpMethod": "GET",
    "headers": null,
    "queryStringParameters": null,
    "pathParameters": {
        "dateSec": "1510790400"
    },
    "stageVariables": null,
    "requestContext": {
        "path": "/balance/date/{dateSec}",
        "accountId": "917309224575",
        "resourceId": "1ve3t9",
        "stage": "test-invoke-stage",
        "requestId": "test-invoke-request",
        "identity": {
            "cognitoIdentityPoolId": null,
            "accountId": "917309224575",
            "cognitoIdentityId": null,
            "caller": "AROAJNNPKMX4TWFXH6XJA:lingfeil-Isengard",
            "apiKey": "test-invoke-api-key",
            "sourceIp": "test-invoke-source-ip",
            "accessKey": "ASIAIBXEXRC5CHJ5FTNQ",
            "cognitoAuthenticationType": null,
            "cognitoAuthenticationProvider": null,
            "userArn": "arn:aws:sts::917309224575:assumed-role/Admin/lingfeil-Isengard",
            "userAgent": "Apache-HttpClient/4.5.x (Java/1.8.0_144)",
            "user": "AROAJNNPKMX4TWFXH6XJA:lingfeil-Isengard"
        },
        "resourcePath": "/balance/date/{dateSec}",
        "httpMethod": "GET",
        "apiId": "3pdgp49x1i"
    },
    "body": null,
    "isBase64Encoded": false
};
const callback = function(err, data) {
    if(err) {
        console.error("Got error");
        console.error(err);
    } else {
        console.log(data);
    }
};

getBalanceForDate(event, null, callback);


