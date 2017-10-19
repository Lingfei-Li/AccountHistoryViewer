aws cloudformation deploy ^
   --template-file %1 ^
   --stack-name %2 ^
   --capabilities CAPABILITY_IAM ^
   --parameter-overrides AccountTransactionsTableName=%3 ^
                         LastTransactionDateTableName=%4^
                         AccountDailyBalanceTableName=%5^
                         AccountMonthlyBalanceTableName=%6
