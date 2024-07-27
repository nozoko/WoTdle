import { SetStoreFunction, Store, createStore } from "solid-js/store";
import { makePersisted } from "@solid-primitives/storage";
import {
  JSXElement,
  createContext,
  createSignal,
  onMount,
  useContext,
} from "solid-js";
import wotdleSessionStateStore from "./wotdleSessionStateStore";
import { GameType } from "@/types/game.types";
import { CurrentTimeAsEST } from "@/utils/dateutils";
import { Vehicle } from "@/types/api.types";

type VersionNumber = 0 | 1 | 2 | undefined;

export type GameData = {
  guessCount: number;
  date: number; // iso timestamp ms
  tankId: number;
};

/*
// Legacy type for data conversion purposes
type StoreV1 = {
  version: 1 | 0 | undefined;
  dailyVehicleGuesses?: Vehicle[];
  previousGames?: GameData[];
  lastGuessEpochMs?: number;
  nthGuessNormal?: number | undefined;
}

type WotdlePersistedGameElement = {
  dailyVehicleGuesses: Vehicle[];
  previousGames: GameData[];
  lastGuessEpochMs: number;
  nthGuessNormal: number | undefined;
};

type StoreCurrent = {
  version: 2;
  classic: WotdlePersistedGameElement;
}

type WotdlePersistedDataStore = StoreV1 | StoreCurrent;
*/

type WotdlePersistedGameElement = {
  dailyVehicleGuesses: Vehicle[];
  previousGames: GameData[];
  lastGuessEpochMs: number;
  nthGuessNormal: number | undefined;
};

type WotdlePersistedDataStore = {
  version: VersionNumber;
  classic: WotdlePersistedGameElement;
}

type ContextType = [
  WotdlePersistedDataStore,
  {
    setState: SetStoreFunction<WotdlePersistedDataStore>;
    setModeState: (mode: GameType, element: string, data: any) => void;
    guessVehicle: (vehicle: Vehicle) => void;
  }
];
const WotdlePersistedDataContext = createContext<ContextType>();

export const LATEST_VERSION = 2 as VersionNumber;
export function WotdlePersistedDataStoreProvider(props: {
  children: JSXElement;
}) {
  const store = createStore<WotdlePersistedDataStore>({ 
    version: LATEST_VERSION,
    classic:
      {
      dailyVehicleGuesses: [],
      previousGames: [],
      lastGuessEpochMs: 0,
      nthGuessNormal: undefined,
      }
  });

  let [state, setState] = store;

  // Are these fine or should I do some additional validation/type checking?
  const getModeState = (mode: GameType, element: string) => {
    if (state.version === LATEST_VERSION) {
      const accessor = mode as keyof WotdlePersistedDataStore;
      if (accessor === "version")
        return state["version"];
      let subState = {...state[accessor]};
      let subStateElement = element as keyof WotdlePersistedGameElement;
      return subState[subStateElement];
    }
  }
  const setModeState = (mode: GameType, element: string, data: any) => {
    const accessor = mode as keyof WotdlePersistedDataStore;
    if (accessor === "version") {
      setState("version", data);
      return;
    }
    let subState = {...state[accessor]};
    let subStateElement = element as keyof WotdlePersistedGameElement;
    subState[subStateElement] = data;
    setState(accessor, subState);
  }

  onMount(() => {
    [state, setState] = makePersisted(store, {
      storage: localStorage,
      storageOptions: {},
      name: "wotdle-store",
    });

    if (state.version !== LATEST_VERSION) {
      console.log(`!! UPDATING PERSISTED DATA STORE FROM ${state.version} TO ${LATEST_VERSION} !!`)

      const oldPersistedState = state as unknown as WotdlePersistedGameElement;
      const  { ...oldPersistedData } = oldPersistedState;

      // These complain, but it works and doesn't die if the prop doesn't exist so I guess it's fine?
      setState("dailyVehicleGuesses", undefined);
      setState("lastGuessEpochMs", undefined);
      setState("nthGuessNormal", undefined);
      setState("previousGames", undefined);

      if (state.version === undefined || state.version === 0)
        oldPersistedData.dailyVehicleGuesses = [];

      setState("classic", oldPersistedData as WotdlePersistedGameElement);
      setState("version", LATEST_VERSION);
    } 
  });

  const handleWin = async () => {
    const { gameState, setGameState } = wotdleSessionStateStore;
    const gameType = GameType.Classic;
    if (!gameState.hydrated) return;

    setGameState("victory", true);
    const zerodDate = new Date(gameState.dateMsSinceEpoch);
    zerodDate.setUTCHours(0, 0, 0, 0);

    const todaysGameData: GameData = {
      guessCount: state[gameType].dailyVehicleGuesses.length,
      date: zerodDate.getTime(),
      tankId: gameState.todaysVehicle.tank_id,
    };

    const prevGames = getModeState(gameType, "previousGames") as GameData[];
    setModeState(gameType, "previousGames", [...prevGames, todaysGameData]);
    try {
      const res = await fetch("/api/winnormal", {
        method: "POST",
      });
      const json = await res.json();
      if (Number.isInteger(json.data)) {
        setModeState(gameType, "nthGuessNormal", json.data);
      }
    } catch {}
  };

  const guessVehicle = (tank: Vehicle) => {
    const { gameState, setGameState } = wotdleSessionStateStore;
    const gameType = GameType.Classic;
    if (!gameState.hydrated) return;

    setModeState(GameType.Classic, "lastGuessEpochMs", CurrentTimeAsEST().getTime());
    const prevGuesses = getModeState(gameType, "dailyVehicleGuesses") as Vehicle[];
    setModeState(GameType.Classic, "dailyVehicleGuesses", [tank, ...prevGuesses]);
    setGameState(
      "tankListNotGuessed",
      gameState.tankListNotGuessed?.filter((v) => v.tank_id !== tank.tank_id)
    );
    if (tank.tank_id !== gameState.todaysVehicle.tank_id) return;
    handleWin();
  };

  const storage: ContextType = [
    state,
    {
      setState,
      setModeState,
      guessVehicle,
    },
  ];

  return (
    <WotdlePersistedDataContext.Provider value={storage}>
      {props.children}
    </WotdlePersistedDataContext.Provider>
  );
}

export function usePersistedData() {
  const ctx = useContext(WotdlePersistedDataContext);
  if (!ctx) {
    throw new Error(
      "usePersistedData: cannot find WotdlePersistedDataContext context"
    );
  }
  return ctx;
}
