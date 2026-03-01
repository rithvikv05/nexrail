create table search_history (
userid int NOT NULL,
from_stationid text NOT NULL,
to_stationid text NOT NULL,
constraint fk_search_userid foreign key(userid) references users(user_id),
constraint fk_search_from_station foreign key(from_stationid) references station(station_code),
constraint fk_search_to_station foreign key(to_stationid) references station(station_code)
);