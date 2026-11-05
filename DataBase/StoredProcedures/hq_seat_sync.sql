IF EXISTS
 (SELECT * FROM dbo.sysobjects
   WHERE id = object_id(N'[dbo].[hq_seat_sync]')
     AND OBJECTPROPERTY(id, N'IsProcedure') = 1)
  DROP PROCEDURE [dbo].[hq_seat_sync]
GO

/*
 Name        : hq_seat_sync
 Description : Used to sync the seat table with the seats drawn in the chart editor.
               New seats are inserted as 'available', existing seats get their row/category
               refreshed (status and hold token are kept), seats removed from the chart are deleted
               unless they are already sold.
 Tables Used : seat
 Screen      : Chart editor - Save layout
 Date        : 26/10/2026
 Note        : needs SQL Server 2016+ (OPENJSON), database compatibility level 130 or higher.
               @seats_json = [{"row":"A","seat":"A-1","cat":"VIP"}, ...]
*/
CREATE PROCEDURE [dbo].[hq_seat_sync]
 (
       @chart_id      int,
       @seats_json    nvarchar(max)
 )

AS
BEGIN

SET NOCOUNT ON;

    IF @seats_json IS NULL OR ISJSON(@seats_json) = 0
    BEGIN
        RAISERROR('hq_seat_sync: seats_json is not valid JSON', 16, 1);
        RETURN;
    END

    DECLARE @t TABLE
    (
        seat_name   varchar(100) PRIMARY KEY,
        row_name    varchar(100),
        cat_name    varchar(max)
    );

    INSERT INTO @t (seat_name, row_name, cat_name)
    SELECT seat_name, row_name, cat_name
      FROM OPENJSON(@seats_json)
      WITH (
            seat_name   varchar(100)  '$.seat',
            row_name    varchar(100)  '$.row',
            cat_name    varchar(max)  '$.cat'
           );

    -- seats that are no longer on the chart (sold seats are kept so bookings are not lost)
    DELETE s
      FROM seat s
     WHERE s.chart_id = @chart_id
       AND ISNULL(s.status, '') <> 'sold'
       AND NOT EXISTS (SELECT 1 FROM @t t WHERE t.seat_name = s.seat_name);

    -- seats that already exist: refresh row and category only
    UPDATE s
       SET s.row_name = t.row_name,
           s.cat_name = t.cat_name
      FROM seat s
      JOIN @t t ON t.seat_name = s.seat_name
     WHERE s.chart_id = @chart_id;

    -- new seats
    INSERT INTO seat (chart_id, seat_name, row_name, cat_name, status, created_dt)
    SELECT @chart_id, t.seat_name, t.row_name, t.cat_name, 'available', CURRENT_TIMESTAMP
      FROM @t t
     WHERE NOT EXISTS (SELECT 1 FROM seat s WHERE s.chart_id = @chart_id AND s.seat_name = t.seat_name);

END

GO

/* optional, the seat table has no key and every lookup filters on these two columns
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_seat_chart_seat' AND object_id = OBJECT_ID('dbo.seat'))
    CREATE INDEX IX_seat_chart_seat ON dbo.seat (chart_id, seat_name);
*/
