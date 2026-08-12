CREATE TABLE [dbo].[user_info]
(
user_id      int identity (1,1),
user_name    varchar(100),
user_email   varchar(100),
password     varchar(100),
rec_stat     char(1) ,
created_dt   DateTime,
public_key   varchar(max),
secret_key   varchar(max)
CONSTRAINT PK_user_info PRIMARY KEY (user_id)
)

