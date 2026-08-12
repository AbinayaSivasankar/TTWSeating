
IF EXISTS
 (SELECT * FROM dbo.sysobjects
   WHERE id = object_id(N'[dbo].[hq_seat_ins]')
     AND OBJECTPROPERTY(id, N'IsProcedure') = 1)
  DROP PROCEDURE [dbo].[hq_seat_ins]
GO

/*
 Name        : hq_seat_ins
 Description : Used to insert seat information
 Tables Used : seat
 Screen      :
 Date        : 24/2/2026
*/ 
CREATE PROCEDURE [dbo].[hq_seat_ins]
	 (
      
       @chart_id                 int,
       @seat_name                varchar(100),
       @row_name                 varchar(100),
       @cat_name			     varchar(max),
       @status                   varchar(10),
       @hold_token               varchar(max)
       
     )         
AS
BEGIN
         INSERT INTO seat
                      ( chart_id,        seat_name,        row_name,        cat_name,          
                        status,          created_dt,       hold_token)
                       				  

               VALUES ( @chart_id,      @seat_name,         @row_name,          @cat_name,   
                        @status,        CURRENT_TIMESTAMP,  @hold_token)
                       
		 	   
END	

