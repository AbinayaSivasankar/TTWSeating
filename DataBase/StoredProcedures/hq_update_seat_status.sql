IF EXISTS
 (SELECT * FROM dbo.sysobjects
   WHERE id = object_id(N'[dbo].[hq_update_seat_status]')
     AND OBJECTPROPERTY(id, N'IsProcedure') = 1)
  DROP PROCEDURE [dbo].[hq_update_seat_status]
GO

/*
 Name        : hq_update_seat-status
 Description : Used to update seat status
 Tables Used : seat
 Screen      :
 Date        : 11/3/2026
*/ 
CREATE PROCEDURE [dbo].[hq_update_seat_status]
 (
       @chart_id                   int,
       @seat_name                  varchar(100),
       @hold_token                 varchar(max),
       @status                     varchar(10)
       
 )  
	
AS
BEGIN

SET NOCOUNT ON;

       UPDATE seat
                 SET 
                 status = 'Free',
                 hold_token = NULL
       WHERE chart_id = @chart_id
       AND   status = 'Reserved'
       AND   DATEDIFF(MINUTE, hold_time, GETDATE()) > 10
           
        
END
