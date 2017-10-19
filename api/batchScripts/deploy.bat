aws cloudformation deploy ^
   --template-file deployment/serverless-output.yml ^
   --stack-name ProjectErebor ^
   --capabilities CAPABILITY_IAM ^
   --parameter-overrides AccountTransactionsTableName=AccountTransactions ^
                         LastTransactionDateTableName=LastTransactionDate ^
                         AccountDailyBalanceTableName=AccountDailyBalance ^
                         AccountMonthlyBalanceTableName=AccountMonthlyBalance
