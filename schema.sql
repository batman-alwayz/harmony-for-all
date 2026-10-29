CREATE TABLE members (
  id TEXT PRIMARY KEY, name TEXT, provider TEXT, product TEXT,
  refresh TEXT, access TEXT, exp INTEGER, admin INTEGER DEFAULT 0, created INTEGER
);
CREATE TABLE rooms ( id TEXT PRIMARY KEY, name TEXT, created INTEGER );
CREATE TABLE queue ( room TEXT, tid TEXT, by TEXT, pos INTEGER, at INTEGER, PRIMARY KEY (room, tid) );
CREATE TABLE plays ( room TEXT, tid TEXT, by TEXT, listened INTEGER, at INTEGER );
CREATE TABLE tracks (
  id TEXT PRIMARY KEY, title TEXT, artist TEXT, album TEXT, dur INTEGER,
  sp_id TEXT, yt_id TEXT, cover TEXT, conf REAL
);
