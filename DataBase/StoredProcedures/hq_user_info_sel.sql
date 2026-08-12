IF EXISTS
 (SELECT * FROM dbo.sysobjects
   WHERE id = object_id(N'[dbo].[hq_user_info_sel]')
     AND OBJECTPROPERTY(id, N'IsProcedure') = 1)
  DROP PROCEDURE [dbo].[hq_user_info_sel]
GO

/*
 Name        : hq_user_info_sel
 Description : Used to get user information
 Tables Used : user_info
 Screen      :
 Date        : 3/6/2026
*/ 
CREATE PROCEDURE [dbo].[hq_user_info_sel]
(
   @user_id          int, 
   @public_key       varchar(max),
   @secret_key       varchar(max),
   @user_email       varchar(100),
   @option           char(1)
  )

AS
SET NOCOUNT ON;
  IF  @option = 'A'  
       BEGIN
          SELECT  user_id,  user_name, user_email, password, rec_stat, public_key, secret_key
         FROM  user_info  
        
       END 	

 ELSE IF @option = 'P'
       BEGIN
          SELECT  user_id,  user_name, user_email, password, rec_stat, public_key, secret_key
          FROM    user_info  
          Where   secret_key= @secret_key
       END 	

 ELSE IF @option = 'U'
       BEGIN
          SELECT  user_id,  user_name, user_email, password, rec_stat, public_key, secret_key
          FROM    user_info  
          Where   user_email = @user_email
       END 

ELSE
       BEGIN
          SELECT    user_id,  user_name, user_email, password, rec_stat, public_key, secret_key
         FROM  user_info  
         Where user_id = @user_id
       END 	
