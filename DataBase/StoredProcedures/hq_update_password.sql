IF EXISTS
 (SELECT * FROM dbo.sysobjects
   WHERE id = object_id(N'[dbo].[hq_update_password]')
     AND OBJECTPROPERTY(id, N'IsProcedure') = 1)
  DROP PROCEDURE [dbo].[hq_update_password]
GO

/*
 Name        : hq_update_password
 Description : Used to update user password
 Tables Used : user_info
 Screen      :
 Date        : 26/6/2026
*/ 
CREATE PROCEDURE [dbo].[hq_update_password]
 (
      @user_email      varchar(100),
      @password        varchar(100)
       
 )  
	
AS


BEGIN

SET NOCOUNT ON;

       UPDATE    user_info
         SET	
                
                 password      = @password

		 WHERE   user_email    = @user_email
        
END
