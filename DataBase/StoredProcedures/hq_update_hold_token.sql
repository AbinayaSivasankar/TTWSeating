IF EXISTS
 (SELECT * FROM dbo.sysobjects
   WHERE id = object_id(N'[dbo].[hq_update_hold_token]')
     AND OBJECTPROPERTY(id, N'IsProcedure') = 1)
  DROP PROCEDURE [dbo].[hq_update_hold_token]
GO

/*
 Name        : hq_update_hold_token
 Description : Used to update seat hold token
 Tables Used : seat
 Screen      :
 Date        : 4/3/2026
*/ 
CREATE PROCEDURE [dbo].[hq_update_hold_token]
 (
       @chart_id                   int,
       @seat_name                  varchar(100),
       @hold_token                 varchar(max),
       @status                     varchar(10)
       
 )  
	
AS
BEGIN

SET NOCOUNT ON;

       UPDATE    seat
         SET	
                 hold_token  = @hold_token,
                 status      = @status,
                 hold_time   = CURRENT_TIMESTAMP
		 WHERE   chart_id    = @chart_id
           AND   seat_name   = @seat_name
           
        
END
