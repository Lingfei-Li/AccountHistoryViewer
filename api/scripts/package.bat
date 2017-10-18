aws cloudformation package ^
    --template-file template.yml ^
    --output-template-file serverless-output.yml ^
    --s3-bucket project-erebor-deployment-bucket