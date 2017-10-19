aws cloudformation package ^
    --template-file deployment/template.yml ^
    --output-template-file deployment/serverless-output.yml ^
    --s3-bucket project-erebor-deployment-bucket