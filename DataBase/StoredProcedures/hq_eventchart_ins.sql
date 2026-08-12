IF EXISTS
 (SELECT * FROM dbo.sysobjects
   WHERE id = object_id(N'[dbo].[hq_eventchart_ins]')
     AND OBJECTPROPERTY(id, N'IsProcedure') = 1)
  DROP PROCEDURE [dbo].[hq_eventchart_ins]
GO

/*
 Name        : hq_eventchart_ins
 Description : Used to insert chart information
 Tables Used : eventchart
 Screen      :
 Date        : 25/11/2025
*/ 
CREATE PROCEDURE [dbo].[hq_eventchart_ins]
	 (
      
       @chart_id                 int,
       @chart_title              varchar(100),
       @chart_key                varchar(max),
       @event_key                varchar(max),
       @cat_name			     varchar(max),
       @chart_json               varchar(max),
       @rec_stat                 char(1),
       @log_id                   int,
       @chart_id_ou			     int OUTPUT
       
     )         
AS
BEGIN
         INSERT INTO eventchart
                      ( chart_json,      cat_name,        rec_stat,    created_dt,
                        chart_title,     chart_key,       created_by,  event_key)
                       				  

               VALUES ( @chart_json,      @cat_name,      @rec_stat,    CURRENT_TIMESTAMP,
                        @chart_title,     @chart_key,     @log_id,      @event_key)
               SELECT   @chart_id_ou = @@IDENTITY 
                       
		 	   
END	

