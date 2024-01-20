import { Component, JSXElement, onMount } from "solid-js";
import { seededRandom } from "../utils/seededRandom";
import { todayAsInt } from "../utils/todayAsInt";
import AppStore from "./AppStore";
import { fetchTankList } from "../utils/api";

export const AppStateLoader: Component<{
  children: JSXElement;
}> = (props) => {
  const { appState, setAppState } = AppStore;
  onMount(async () => {
    const tankList = await fetchTankList();
    setAppState("tankList", tankList);
    const index = Math.floor(seededRandom(todayAsInt()) * tankList.length);
    const tankOfDay = tankList[index];
    setAppState("tankOfDay", tankOfDay);
  });
  return props.children;
};