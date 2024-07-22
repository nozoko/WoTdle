import { createRoot, createResource } from "solid-js";
import type { ResourceSource } from "solid-js";
import { createStore } from "solid-js/store";
import { TodaysWotdleData } from "@/resources/todaysWotdleResource";
import { CurrentTimeAsEST, datesAreInSameDay } from "@/utils/dateutils";
import { LATEST_VERSION, usePersistedData } from "@/stores/wotdlePersistedDataStore";
import { Vehicle } from "@/types/api.types";
import { GameType } from "@/types/game.types";
import { unknown } from "zod";

type GameResource = 
  {
      todaysVehicle: Vehicle;
      dateMsSinceEpoch: number;
      victory: boolean;
      tankListNotGuessed: Vehicle[];
  } 
  | undefined;

export type GameParameters = 
  {
    vehicleList: Vehicle[],
    tankOfDay: Vehicle,
    gameType: GameType,
  };

export async function generateGameResource(parameters: ResourceSource<GameParameters>, { value, refetching }) {
  if ( refetching === true ) 
    throw new Error("Tried to refetch the game resource");
  if ( parameters === false || parameters === undefined ) return;

  const gameParameters = parameters as GameParameters;

  const [persistedData, setters] = usePersistedData();
  const previousGames = persistedData.previousGames;

  const nowEst = CurrentTimeAsEST();
  const lastPlayedGame = previousGames[previousGames.length - 1];

  let tankListNotGuessed = gameParameters.vehicleList;
  const userWonToday =
    previousGames.length > 0 &&
    datesAreInSameDay(lastPlayedGame.date, nowEst.getTime());

  const userPlayedToday = datesAreInSameDay(
    persistedData.lastGuessEpochMs,
    nowEst.getTime()
  );

  // This really feels like it should be somewhere else
  if (persistedData.version === undefined || persistedData.version === 0) {
    setters.setState("dailyVehicleGuesses", []);
    setters.setState("version", LATEST_VERSION);
  } 
  
  if (userWonToday || userPlayedToday) {
    const dailyVehicleGuesses = persistedData.dailyVehicleGuesses;
    const guessedTankIds = new Set<number>();
    dailyVehicleGuesses.forEach((tank) => guessedTankIds.add(tank.tank_id));
    tankListNotGuessed = gameParameters.vehicleList.filter(
      (tank) => !guessedTankIds.has(tank.tank_id)
    );
  } else {
    setters.setState("dailyVehicleGuesses", []);
  }

  const gameResource = {
    todaysVehicle: gameParameters.tankOfDay,
    dateMsSinceEpoch: CurrentTimeAsEST().getTime(),
    victory: userWonToday,
    tankListNotGuessed: tankListNotGuessed,
  } as GameResource;
  
  return gameResource;
}