import GuessForm from "@/components/GuessForm";
import TankOfDayPanel from "@/components/TankOfDayPanel";
import { todaysWotdleData } from "@/resources/todaysWotdleResource";
import { generateGameResource } from "@/resources/wotdleGameResource";
import type { GameParameters } from "@/resources/wotdleGameResource";
import { createAsync } from "@solidjs/router";
import { Match, Show, Switch, createEffect, createSignal, createResource } from "solid-js";
import type { ResourceSource } from "solid-js";
import gameStateStore from "@/stores/wotdleSessionStateStore";
import PromptPanel from "@/components/PromptPanel";
import GuessList from "@/components/GuessList";
import { GameType } from "@/types/game.types";

export const route = {
  //load: () => getTodaysWotdle(),
};

export default function Home() {
  const todaysWotdleResource = todaysWotdleData;
  
  const [loadState, setLoadState] = createSignal<"Loading" | "Ready" | "Error">(
    "Loading"
  );

  createEffect(() => {
    if (todaysWotdleResource === undefined) return;
    else if (todaysWotdleResource.state === "ready") {
      resourceParameters = {
        vehicleList: todaysWotdleResource().data.vehicleList, 
        tankOfDay: todaysWotdleResource().data.tankOfDay, 
        gameType: GameType.Classic
      } as GameParameters;
      if (gameResource.state === "ready")
        setLoadState("Ready");
      else if (gameResource.state === "errored") {
        setLoadState("Error")
      }
    } else if (todaysWotdleResource.state === "errored") {
      setLoadState("Error");
    }
  }, []);

  

  return (
    <main class="flex flex-col p-2 items-center w-full gap-2">
      <Switch>
        <Match when={loadState() === "Ready"}>
          <PromptPanel />
          <VictoryPanel />
          <div class="flex justify-center p-4">
            <GuessList />
          </div>
        </Match>
        <Match when={loadState() === "Error"}>
          <Switch>
            <Match when={todaysWotdleResource.state === "errored"}>
              <div>Error: {todaysWotdleResource.error?.message}</div>
            </Match>
            <Match when={gameResource.state === "errored"}>
              <div>Error: {gameResource.error?.message}</div>
            </Match>
          </Switch>
          
        </Match>
      </Switch>
    </main>
  );
}

const VictoryPanel = () => {
  if (gameResource === undefined) return;
  if (gameResource() === undefined) return;
  if (gameResource.state !== "ready") return;
  return (
    <Show
      when={!gameResource()!.victory}
      fallback={
        <div class="flex justify-center items-center w-screen p-4">
          <TankOfDayPanel tank={gameResource()!.todaysVehicle} />
        </div>
      }
    >
      <GuessForm />
    </Show>
  );
};
