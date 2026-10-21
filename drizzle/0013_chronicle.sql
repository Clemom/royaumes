CREATE SCHEMA "chronicle";
--> statement-breakpoint
CREATE TABLE "chronicle"."achievements" (
	"player_id" text NOT NULL,
	"achievement_id" text NOT NULL,
	"obtained_at" bigint NOT NULL,
	CONSTRAINT "achievements_player_id_achievement_id_pk" PRIMARY KEY("player_id","achievement_id")
);
--> statement-breakpoint
CREATE TABLE "chronicle"."game_players" (
	"game_id" text NOT NULL,
	"player_id" text NOT NULL,
	CONSTRAINT "game_players_game_id_player_id_pk" PRIMARY KEY("game_id","player_id")
);
