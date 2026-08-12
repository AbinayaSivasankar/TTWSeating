IF EXISTS
 (SELECT * FROM dbo.sysobjects
   WHERE id = object_id(N'[dbo].[hq_eventchart_upd]')
     AND OBJECTPROPERTY(id, N'IsProcedure') = 1)
  DROP PROCEDURE [dbo].[hq_eventchart_upd]
GO

/*
 Name        : hq_eventchart_upd
 Description : Used to update chart category information
 Tables Used : eventchart
 Screen      :
 Date        : 26/11/2025
*/ 
CREATE PROCEDURE [dbo].[hq_eventchart_upd]
 (
       @chart_id                   int,
       @chart_title                varchar(100),
       @chart_key                  varchar(max),
       @event_key                  varchar(max),
       @chart_json                 varchar(max),
       @cat_name                   varchar(max),
       @rec_stat                   char(1),
       @log_id                     int,
       @chart_id_ou			       int OUTPUT
     
 )  
	
AS
BEGIN

SET NOCOUNT ON;

       UPDATE    eventchart
         SET	
                 cat_name    = @cat_name,
                 chart_json  = @chart_json,
                 chart_title = @chart_title,
                 chart_key   = @chart_key,
                 event_key   = @event_key,
                 rec_stat    = @rec_stat,
                 created_by  = @log_id

		 WHERE   chart_id = @chart_id
        SET @chart_id_ou = @chart_id
END
