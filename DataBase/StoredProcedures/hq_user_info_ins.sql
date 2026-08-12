IF EXISTS
 (SELECT * FROM dbo.sysobjects
   WHERE id = object_id(N'[dbo].[hq_user_info_ins]')
     AND OBJECTPROPERTY(id, N'IsProcedure') = 1)
  DROP PROCEDURE [dbo].[hq_user_info_ins]
GO

/*
 Name        : hq_user_info_ins
 Description : Used to insert user_info information
 Tables Used : user_info
 Screen      :
 Date        : 28/4/2026
*/ 
CREATE PROCEDURE [dbo].[hq_user_info_ins]
	 (
       @user_id                  int,
       @user_name                varchar(100),
       @user_email               varchar(100),
       @password                 varchar(100),
       @rec_stat                 char(1),
       @public_key               varchar(max),
       @secret_key               varchar(max)
     )         
AS
BEGIN
         INSERT INTO user_info
                      (user_name,     user_email,         password,      created_dt,          
                       rec_stat,      public_key,         secret_key)
               VALUES (@user_name,    @user_email,        @password,     CURRENT_TIMESTAMP,    
                       @rec_stat,     @public_key,        @secret_key)
END	

