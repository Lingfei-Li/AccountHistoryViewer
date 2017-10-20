import boto3
import json
from config import app_config
from accountTransactionModel import Transaction

kinesis_client = boto3.client('kinesis', region_name='us-west-2')

stream_name = app_config['TransactionDataStreamName']

def describe_stream():
    response = kinesis_client.describe_stream(StreamName=stream_name)
    print(response)


def put_transactions(transactions):
    print("Putting transactions to Kinesis stream")
    if len(transactions) == 0:
        return

    records = []
    for t in transactions:
        records.append({
            'Data': json.dumps(t.getItem()),
            'PartitionKey': t.getField('UUID')
        })

    put_response = kinesis_client.put_records(StreamName=stream_name, Records=records)
    print(put_response)

# Unit testing
if __name__ == '__main__':
    describe_stream()
    t = Transaction(TransactionDateSec=12345678, UUID='UUID-1234', UserId='UserId-1234', AccountType='AccountType-checking',
                    Amount=1199, BankName='chase', CreateDateSec=87654321, Description='Description-something',
                    TransactionType='TransactionType-debit')
    transactions = [t]
    put_transactions(transactions)

