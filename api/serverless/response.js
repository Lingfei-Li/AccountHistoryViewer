const CORS_HEADERS = {
    "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
    "Access-Control-Allow-Methods": "DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT",
    "Access-Control-Allow-Origin": "*"
};

exports.clientError = function(err) {
    return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({
            error: err
        }),
    };
};

exports.internalError = function(err) {
    return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({
            error: err
        }),
    };
};


exports.successWithMessage = function(msg) {
    return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
            message: msg
        })
    };
};

exports.successWithTransactions = function(transactions) {
    return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
            transactions: transactions
        })
    };
};


exports.successWithBalancePerBank = function(balancePerBank) {
    return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
            balancePerBank: balancePerBank
        })
    };
};
