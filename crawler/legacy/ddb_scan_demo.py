import boto3
import json
import decimal
from boto3.dynamodb.conditions import Key, Attr
from utils import DecimalEncoder
from ddb_dao import get_history_table

table = get_history_table()

pe = "#id, #date, #amt, #typ"
# Expression Attribute Names for Projection Expression only.
ean = {"#id": "uuid", '#date': 'transaction_date', '#amt': 'amount', '#typ': 'type'}
esk = None

response = table.scan(
    ProjectionExpression=pe,
    ExpressionAttributeNames=ean
)

for i in response['Items']:
    print(json.dumps(i, cls=DecimalEncoder))
