


class Transaction:
    def __init__(self, TransactionDateSec, UUID, UserId, AccountType, Amount, BankName, CreateDateSec, Description, TransactionType):
        self.item = dict()
        self.item['TransactionDateSec'] = TransactionDateSec
        self.item['UUID'] = UUID
        self.item['UserId'] = UserId
        self.item['AccountType'] = AccountType
        self.item['Amount'] = Amount
        self.item['BankName'] = BankName
        self.item['CreateDateSec'] = CreateDateSec
        self.item['Description'] = Description
        self.item['TransactionType'] = TransactionType

    def getField(self, fieldName):
        return self.item[fieldName]

    def getItem(self):
        return self.item




