import boto3
import json
import decimal
import uuid
from datetime import datetime
from utils import DecimalEncoder
from ddb_dao import get_history_table

history_table = get_history_table()

id = str(uuid.uuid1())
transaction_date = datetime.now().microsecond

response = history_table.put_item(
    Item={
        'id': id,
        'transaction_date': transaction_date,
        'amount': 123,
        'type': 'debit',
        'description': 'ATM withdraw'
    }
)


print("PutItem succeeded:")
print(json.dumps(response, indent=4, cls=DecimalEncoder))

