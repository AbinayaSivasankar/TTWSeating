IF EXISTS
 (SELECT * FROM dbo.sysobjects
   WHERE id = object_id(N'[dbo].[hq_seat_upd]')
     AND OBJECTPROPERTY(id, N'IsProcedure') = 1)
  DROP PROCEDURE [dbo].[hq_seat_upd]
GO

/*
 Name        : hq_seat_upd
 Description : Used to update seat information
 Tables Used : seat
 Screen      :
 Date        : 24/2/2026
*/ 
CREATE PROCEDURE [dbo].[hq_seat_upd]
 (
       @chart_id                   int,
       @seat_name                  varchar(100),
      
       @status                     varchar(10)
       
 )  
	
AS
BEGIN

SET NOCOUNT ON;

  IF EXISTS
    (
        SELECT 1
        FROM seat
        WHERE chart_id = @chart_id
          AND seat_name = @seat_name
    )
    BEGIN
        UPDATE seat
        SET status = @status
        WHERE chart_id = @chart_id
          AND seat_name = @seat_name;
    END
    ELSE
    BEGIN
        UPDATE TOP (1) seat
        SET status = @status
        WHERE chart_id = @chart_id
          AND cat_name = @seat_name
          AND status = 'sold';
    END
    END

