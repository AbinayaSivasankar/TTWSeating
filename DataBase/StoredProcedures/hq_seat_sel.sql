IF EXISTS
 (SELECT * FROM dbo.sysobjects
   WHERE id = object_id(N'[dbo].[hq_seat_sel]')
     AND OBJECTPROPERTY(id, N'IsProcedure') = 1)
  DROP PROCEDURE [dbo].[hq_seat_sel]
GO

/*
 Name        : hq_seat_sel
 Description : Used to get seat information
 Tables Used : seat
 Screen      :
 Date        : 24/2/2026
*/ 
CREATE PROCEDURE [dbo].[hq_seat_sel]
(
   @chart_id          int, 
   @row_name          varchar(100),
   @seat_name         varchar(100),
   @cat_name          varchar(max),
   @option            char(1)
  )

AS
SET NOCOUNT ON;
  IF  @option = 'A'  
       BEGIN
          SELECT  chart_id,  cat_name, seat_name,   row_name,   status, hold_token, hold_time
         FROM  seat  
        
       END 	
 ELSE IF @option = 'C'
       BEGIN
          SELECT  chart_id,  cat_name, seat_name,   row_name,   status, hold_token,  hold_time
         FROM  seat  
         WHERE chart_id = @chart_id
        
       END 	
 ELSE IF @option = 'S'
       BEGIN
          SELECT  chart_id,  cat_name, seat_name,   row_name,   status, hold_token,  hold_time
         FROM  seat  
         WHERE chart_id = @chart_id
         AND   cat_name = @cat_name
        
       END 	
 ELSE
       BEGIN
          SELECT  chart_id,  cat_name, seat_name,   row_name,   status, hold_token, hold_time
         FROM  seat  
         WHERE seat_name = @seat_name
         AND chart_id = @chart_id
        
       END 	
