--!strict
-- All user-facing text (Polish, matching the web game).

local Strings = {
	FIGHT = "WALKA!",
	WAITING = "Oczekiwanie na graczy… (min. 2)",
	STARTING_IN = "Mecz startuje za %d…",
	ROUND = "RUNDA %d",
	ROUND_WIN = "RUNDĘ %d WYGRYWA: %s!",
	ROUND_DRAW = "REMIS W RUNDZIE %d!",
	MATCH_WIN = "%s WYGRYWA MECZ!",
	KILLED_BY = "Zabity przez %s",
	KILLED_BY_EXPLOSION = "Wyleciałeś w powietrze",
	PICKING_SELF = "WYBIERZ ULEPSZENIE  (A/D lub ←/→, SPACJA aby potwierdzić)",
	PICKING_OTHER = "%s wybiera kartę… (poległ jako #%d)",
	CARD_PICKED = "%s wybrał: %s",
	PLAY_AGAIN = "ZAGRAJ PONOWNIE",
	RELOADING = "PRZEŁADOWANIE…",
	SCAN = "SKAN",
	KILLS = "Zabójstwa",
	DEATHS = "Śmierci",
	WINS = "Wygrane",
	EXPLOSION = "Wybuch",
	RARITY = {
		common = "ZWYKŁA",
		rare = "RZADKA",
		epic = "EPICKA",
		legendary = "LEGENDARNA",
	},
	CATEGORY = {
		attack = "ATAK",
		defense = "OBRONA",
		mobility = "MOBILNOŚĆ",
		special = "SPECJALNA",
	},
}

return Strings
