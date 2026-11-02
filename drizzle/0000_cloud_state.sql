CREATE TABLE `club_state` (
  `owner_id` text PRIMARY KEY NOT NULL,
  `revision` integer NOT NULL DEFAULT 0,
  `payload` text NOT NULL
);
