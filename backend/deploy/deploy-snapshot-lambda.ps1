# Deploys the scheduled price snapshot job: Lambda "marketfetch-price-snapshot"
# invoked by EventBridge rule "marketfetch-price-snapshot-6h" (rate(6 hours)).
#
# Idempotent: safe to re-run - creates resources on first run, updates code and
# config on later runs.
#
# Prereqs: AWS CLI configured with permissions for iam/lambda/events (us-east-1),
#          node + npm on PATH, backend/.env containing DATABASE_URL.
# Usage:   powershell -File backend/deploy/deploy-snapshot-lambda.ps1

$ErrorActionPreference = "Stop"
$Region = "us-east-1"
$FunctionName = "marketfetch-price-snapshot"
$RoleName = "marketfetch-snapshot-lambda-role"
$RuleName = "marketfetch-price-snapshot-6h"
$Backend = Resolve-Path (Join-Path $PSScriptRoot "..")

# --- Read DATABASE_URL from backend/.env (never committed, never echoed) -----
$envFile = Join-Path $Backend ".env"
if (-not (Test-Path $envFile)) { throw "backend/.env not found - create it with DATABASE_URL=..." }
$dbUrl = (Get-Content $envFile | Where-Object { $_ -match "^DATABASE_URL=" } | Select-Object -First 1) -replace "^DATABASE_URL=", ""
if (-not $dbUrl) { throw "DATABASE_URL not found in backend/.env" }

# --- Bundle the handler ------------------------------------------------------
Write-Host "Building bundle..."
Push-Location $Backend
npm run lambda:build
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "lambda:build failed" }
Pop-Location
$zipPath = Join-Path $Backend "dist\lambda\function.zip"
Compress-Archive -Path (Join-Path $Backend "dist\lambda\index.js") -DestinationPath $zipPath -Force

# --- IAM role (CloudWatch Logs only - least privilege) -----------------------
# Probes that may legitimately fail go through cmd /c: under
# $ErrorActionPreference=Stop, PowerShell 5.1 turns native stderr into a
# terminating error when redirected in-process.
$roleArn = cmd /c "aws iam get-role --role-name $RoleName --query Role.Arn --output text 2>nul"
if ($LASTEXITCODE -ne 0) {
  Write-Host "Creating IAM role $RoleName..."
  $trust = '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}'
  $trustFile = New-TemporaryFile
  Set-Content -Path $trustFile -Value $trust -Encoding ascii
  $roleArn = aws iam create-role --role-name $RoleName --assume-role-policy-document "file://$trustFile" --query "Role.Arn" --output text
  Remove-Item $trustFile
  aws iam attach-role-policy --role-name $RoleName --policy-arn "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole" | Out-Null
  Write-Host "Waiting 12s for IAM propagation..."
  Start-Sleep -Seconds 12
}
Write-Host "Role: $roleArn"

# --- Lambda function (create or update) --------------------------------------
# Env vars go via a JSON file: the connection string contains characters that
# break the CLI's shorthand Variables={...} parser.
$envJsonFile = New-TemporaryFile
@{ Variables = @{ DATABASE_URL = $dbUrl } } | ConvertTo-Json | Set-Content -Path $envJsonFile -Encoding ascii

cmd /c "aws lambda get-function --function-name $FunctionName --region $Region 2>nul" | Out-Null
if ($LASTEXITCODE -eq 0) {
  Write-Host "Updating existing function..."
  aws lambda update-function-code --function-name $FunctionName --zip-file "fileb://$zipPath" --region $Region | Out-Null
  aws lambda wait function-updated --function-name $FunctionName --region $Region
  aws lambda update-function-configuration --function-name $FunctionName --environment "file://$envJsonFile" --timeout 60 --memory-size 256 --region $Region | Out-Null
  aws lambda wait function-updated --function-name $FunctionName --region $Region
} else {
  Write-Host "Creating function $FunctionName..."
  aws lambda create-function --function-name $FunctionName --runtime nodejs22.x --handler index.handler --role $roleArn --zip-file "fileb://$zipPath" --timeout 60 --memory-size 256 --environment "file://$envJsonFile" --region $Region | Out-Null
  aws lambda wait function-active --function-name $FunctionName --region $Region
}
Remove-Item $envJsonFile
$functionArn = aws lambda get-function --function-name $FunctionName --region $Region --query "Configuration.FunctionArn" --output text
Write-Host "Function: $functionArn"

# --- EventBridge rule + permission + target ----------------------------------
$ruleArn = aws events put-rule --name $RuleName --schedule-expression "rate(6 hours)" --description "MarketFetch price snapshot every 6 hours" --region $Region --query "RuleArn" --output text
# add-permission fails if the statement already exists; remove first, ignore errors.
cmd /c "aws lambda remove-permission --function-name $FunctionName --statement-id eventbridge-snapshot --region $Region 2>nul" | Out-Null
aws lambda add-permission --function-name $FunctionName --statement-id "eventbridge-snapshot" --action "lambda:InvokeFunction" --principal events.amazonaws.com --source-arn $ruleArn --region $Region | Out-Null
aws events put-targets --rule $RuleName --targets "Id=snapshot-lambda,Arn=$functionArn" --region $Region | Out-Null
Write-Host "Rule: $ruleArn (rate(6 hours))"

Write-Host ""
Write-Host "Deployed. Verify with:"
Write-Host "  aws lambda invoke --function-name $FunctionName --region $Region out.json; cat out.json"
Write-Host "  aws logs tail /aws/lambda/$FunctionName --region $Region --since 1h"
Write-Host "Pause the schedule with:"
Write-Host "  aws events disable-rule --name $RuleName --region $Region"
