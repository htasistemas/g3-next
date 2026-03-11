@echo off
setlocal

set APP_EMAIL_HABILITADO=true
set APP_EMAIL_REMETENTE=htasistemas@gmail.com
set APP_EMAIL_NOME=HTA Sistemas
set MAIL_HOST=smtp.gmail.com
set MAIL_PORT=587
set MAIL_USER=htasistemas@gmail.com
set MAIL_PASS=hgglhsdiwgontftn
set APP_GOOGLE_CLIENT_ID=1026369251340-2eskbj74ierlra1i9fm0aas29ucvnudf.apps.googleusercontent.com

cd /d "%~dp0"
call mvnw.cmd spring-boot:run
