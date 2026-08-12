IF EXISTS
 (SELECT * FROM dbo.sysobjects
   WHERE id = object_id(N'[dbo].[hq_eventchart_sel]')
     AND OBJECTPROPERTY(id, N'IsProcedure') = 1)
  DROP PROCEDURE [dbo].[hq_eventchart_sel]
GO

/*
 Name        : hq_eventchart_sel
 Description : Used to get category information
 Tables Used : eventchart
 Screen      :
 Date        : 26/11/2025
*/ 
CREATE PROCEDURE [dbo].[hq_eventchart_sel]
(
   @chart_id          int, 
   @log_id            int,
   @chart_key         varchar(max),
   @option            char(1)
  )

AS
SET NOCOUNT ON;
  IF  @option = 'A'  
       BEGIN
          SELECT  chart_id,  cat_name, rec_stat,  chart_json,   chart_title,  chart_key,   created_by,  event_key
         FROM  eventchart  
        
       END 	

 ELSE IF @option = 'U'
       BEGIN
          SELECT  chart_id,  cat_name, rec_stat,  chart_json, chart_title,   chart_key,    created_by,   event_key
         FROM  eventchart  
         Where  created_by= @log_id
       END 
       
ELSE IF @option = 'C'
       BEGIN
          SELECT  chart_id,  cat_name, rec_stat,  chart_json, chart_title,   chart_key,    created_by,   event_key
          FROM  eventchart  
          Where  chart_key= @chart_key
       END
ELSE IF @option = 'S'
       BEGIN
          SELECT  chart_id,  cat_name, e.rec_stat,  chart_json, chart_title,   chart_key,    created_by,  u.secret_key,    event_key
          FROM  eventchart  e
LEFT OUTER JOIN   user_info u
                 ON   u.user_id      =  created_by
          Where  chart_id= @chart_id
       END

ELSE
       BEGIN
          SELECT  chart_id,  cat_name, rec_stat,  chart_json, chart_title,   chart_key,    created_by,     event_key
         FROM  eventchart  
         Where chart_id = @chart_id
       END 	
