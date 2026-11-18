IF EXISTS
 (SELECT * FROM dbo.sysobjects
   WHERE id = object_id(N'[dbo].[hq_eventchart_del]')
	 AND OBJECTPROPERTY(id, N'IsProcedure') = 1)
  DROP PROCEDURE [dbo].[hq_eventchart_del]
GO

CREATE PROCEDURE [dbo].[hq_eventchart_del]
(
	@chart_id int,
	@log_id int,
	@deleted bit OUTPUT
)
AS
BEGIN
	SET NOCOUNT ON;

	UPDATE eventchart
	   SET rec_stat = 'D'
	 WHERE chart_id = @chart_id
	   AND created_by = @log_id
	   AND ISNULL(rec_stat, '') <> 'D';

	SET @deleted = CASE WHEN @@ROWCOUNT > 0 THEN 1 ELSE 0 END;
END
GO
