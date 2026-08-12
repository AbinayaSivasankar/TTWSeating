IF EXISTS
 (SELECT * FROM dbo.sysobjects
   WHERE id = object_id(N'[dbo].[hq_update_cat_info]')
     AND OBJECTPROPERTY(id, N'IsProcedure') = 1)
  DROP PROCEDURE [dbo].[hq_update_cat_info]
GO

/*
 Name        : hq_update_cat_info
 Description : Used to update chart category information
 Tables Used : eventchart
 Screen      :
 Date        : 26/11/2025
*/ 
CREATE PROCEDURE [dbo].[hq_update_cat_info]
 (
       @chart_id      int,
       @cat_name      varchar(max)
 )  
	
AS
BEGIN

SET NOCOUNT ON;

       UPDATE    eventchart
         SET	
                 cat_name    = @cat_name
                 

		 WHERE   chart_id    = @chart_id
        
END
