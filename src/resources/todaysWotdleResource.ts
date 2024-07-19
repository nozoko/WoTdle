import { cache } from "@solidjs/router";
import { createResource } from "solid-js";
import type { ResourceReturn } from "solid-js"
import { createClient } from "@supabase/supabase-js";
import { env } from "@/env/server";
import { Database } from "@/types/database.types";
import { Vehicle } from "@/types/api.types";

const fetchTodaysWotdle = async () => {
  "use server";
  const supabase = createClient<Database>(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
  );
  const dd_mm_yy = new Date()
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      timeZone: "America/New_York",
    })
    .replaceAll("/", "_");

  const [vehicleListSupaRes, tankOfDaySupaRes] = await Promise.all([
    supabase.from("vehicle_data_v2").select("*").gte("tier", 8),
    supabase.from("daily_data").select("*").eq("dd_mm_yy", dd_mm_yy),
  ]);

  if (vehicleListSupaRes.data === null || tankOfDaySupaRes.data === null)
    throw new Error("Failed to fetch data from SupaBase");

  const vehicleList = vehicleListSupaRes.data
    .map((data) => data.data)
    .flat(1) as Vehicle[];

  const tankOfDay = vehicleList.find(
    (x) => x.tank_id === (tankOfDaySupaRes.data[0].normal as Vehicle).tank_id
  );

  if (tankOfDay === undefined)
    throw new Error("Failed to find tank of day in vehicleList");
  return {
    data: { vehicleList, tankOfDay }
  };
};

export type TodaysWotdleData = Awaited<ReturnType<typeof fetchTodaysWotdle>>;
export const [todaysWotdleData, {mutate, refetch}] = createResource<TodaysWotdleData>(fetchTodaysWotdle);
//export const getTodaysWotdle = cache(fetchTodaysWotdle, "todaysWotdle")