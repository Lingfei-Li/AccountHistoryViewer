import boto3
import json
import decimal
import uuid
from datetime import datetime
from utils import DecimalEncoder
from ddb_dao import get_dynamodb
from ddb_dao import get_history_table

dynamodb = get_dynamodb()

table = dynamodb.create_table(
    TableName='TransactionHistory',
    KeySchema=[
        {
            'AttributeName': 'id',
            'KeyType': 'HASH'  #Partition key
        },
        {
            'AttributeName': 'transaction_date',
            'KeyType': 'RANGE'  #Sort key
        }
    ],
    AttributeDefinitions=[
        {
            'AttributeName': 'id',
            'AttributeType': 'S'
        },
        {
            'AttributeName': 'transaction_date',
            'AttributeType': 'N'
        },

    ],
    ProvisionedThroughput={
        'ReadCapacityUnits': 1,
        'WriteCapacityUnits': 1
    }
)

print("Table status:", table.table_status)
