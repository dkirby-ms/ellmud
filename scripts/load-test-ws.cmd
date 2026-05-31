@echo off
setlocal

cd /d "%~dp0\.."

npm run load-test:ws -- ^
  --url https://ellmud-test.kirbytoso.xyz ^
  --connections 200 ^
  --stress ^
  --action-interval 3000 ^
  %*
