--4.5.2026
alter table eventchart
add created_by int;
Go


--13.5.2026
alter table user_info
add user_name varchar(100);
Go

--3.6.2026
alter table user_info
add public_key varchar(max),
    secret_key varchar(max);
    Go

--23.7.2026
alter table eventchart
add event_key varchar(max);
Go


