IF EXISTS 
  (SELECT * FROM dbo.sysobjects 
    WHERE id = object_id(N'[dbo].[hq_val_user]') 
      AND OBJECTPROPERTY(id, N'IsProcedure') = 1)
   DROP PROCEDURE [dbo].[hq_val_user]
GO
/*
 Name        : hq_val_user
 Description : Used to validate user information
 Tables Used : user_Info
 Screen      :
 Date        : 28/4/2026
*/ 
CREATE PROCEDURE [dbo].[hq_val_user]
  (
    @user_email            varchar(100),
	@password              varchar(100)
  )

AS
SET NOCOUNT ON;
   BEGIN
      SELECT user_id,     user_email,      password,    rec_stat  
	   FROM  user_info
       WHERE user_email = @user_email 
         AND password  = @password
   END

