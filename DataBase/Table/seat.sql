CREATE TABLE [dbo].[seat]
(
chart_id                int,
row_name                varchar(100),
seat_name               varchar(100),
cat_name                varchar(max),
hold_token              varchar(max),
status                  varchar(10),
created_dt              DateTime,
hold_time               DateTime
)
