CREATE TABLE "candles" (
	"symbol" varchar(50) NOT NULL,
	"interval" varchar(5) NOT NULL,
	"open" double precision NOT NULL,
	"high" double precision NOT NULL,
	"low" double precision NOT NULL,
	"close" double precision NOT NULL,
	"volume" double precision DEFAULT 0 NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"closed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "candles_pkey" PRIMARY KEY ("symbol", "interval", "timestamp")
);
