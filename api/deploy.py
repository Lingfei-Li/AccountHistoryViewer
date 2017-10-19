import subprocess
import json
import shutil
import os.path

with open('../config/stack_config.json') as config_file:
    config = json.load(config_file)


print("Copying CloudFormation template file to deployment directory")

cfnTemplateSrcPath = "./{}/{}/{}".format(config["DevelopmentDir"],
                                config["CloudFormationTemplateDir"],
                                config["CloudFormationTemplateFilename"])

cfnTemplateDeployPath = "./{}/{}".format(config["DevelopmentDir"],
                         config["CloudFormationTemplateFilename"])

outputTemplatePath = "./{}/{}".format(config["DevelopmentDir"],
                                         config["OutputTemplateFilename"])

shutil.copy(cfnTemplateSrcPath, cfnTemplateDeployPath)



try:
    subprocess.run(["scripts\package.bat",
                    cfnTemplateDeployPath,
                    outputTemplatePath,
                    config["DeploymentBucketName"]], shell=True, check=True)
    subprocess.run(["scripts\deploy.bat",
                    outputTemplatePath,
                    config["StackName"],
                    config["AccountTransactionsTableName"],
                    config["LastTransactionDateTableName"],
                    config["AccountDailyBalanceTableName"],
                    config["AccountMonthlyBalanceTableName"]], shell=True, check=True)
    subprocess.run(["scripts\clean.bat",
                    config["DeploymentBucketName"]], shell=True, check=True)

    print(" -- Serverless Deployment completed")
except subprocess.CalledProcessError as e:
    out_bytes = e.output       # Output generated before error
    code      = e.returncode   # Return code
    print(out_bytes)
    print(code)

print("Removing CloudFormation and SAM template file from deployment directory")

if os.path.exists(cfnTemplateDeployPath):
    os.remove(cfnTemplateDeployPath)
if os.path.exists(outputTemplatePath):
    os.remove(outputTemplatePath)

exit(0)
