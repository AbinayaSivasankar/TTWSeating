CREATE TABLE [dbo].[eventchart]
(
chart_id                int identity (1,1),
chart_title             varchar(100),
chart_key               varchar(max),
event_key               varchar(max),
chart_json              varchar(max),
cat_name                varchar(max),
rec_stat                char(1),
created_dt              DateTime,
created_by              int,
CONSTRAINT PK_eventchart PRIMARY KEY (chart_id)

)
