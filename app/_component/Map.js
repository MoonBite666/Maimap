"use client";

import { Suspense, useEffect, useReducer } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  Map,
  APILoader,
  ScaleControl,
  ToolBarControl,
  Marker,
  Circle,
} from "@uiw/react-amap";
import GeolocationButton from "@/app/_component/GeolocationButton";
import RangeSlider from "@/app/_component/RangeSlider";
import Image from "next/image";

function reducer(state, action) {
  switch (action.type) {
    case "center/update":
      return { ...state, centerPos: action.payload };
    case "url/pos_update":
      return {
        ...state,
        urlPos: [action.payload[0], action.payload[1]],
        centerPos: [action.payload[0], action.payload[1]],
        hasParams: action.payload[0] && action.payload[1],
      };
    case "url/range_update":
      return {
        ...state,
        range: action.payload,
      };
    case "nearby/update":
      return { ...state, nearbyArcades: action.payload };
  }
}

export default function MapContainer({}) {
  const searchParams = useSearchParams();

  const range = Number(searchParams.get("range")) || 40;
  const lat = Number(searchParams.get("lat")) || 39.909333;
  const lng = Number(searchParams.get("lng")) || 116.397183;
  const detailId = Number(searchParams.get("detailId")) || null;

  const akey = process.env.NEXT_PUBLIC_AMAP_AKEY;
  const initialState = {
    centerPos: [116.397183, 39.909333],
    geoPos: [null, null],
    urlPos: [null, null],
    hasParams: lat && lng,
    nearbyArcades: [],
    range: range,
  };
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const state_lng = state.urlPos[0];
    const state_lat = state.urlPos[1];
    if (lng !== state_lng || lat !== state_lat) {
      dispatch({
        type: "url/pos_update",
        payload: [lng, lat],
      });
    }
    if (range !== state.range) {
      dispatch({
        type: "url/range_update",
        payload: range,
      });
    }

    async function fetchArcades() {
      const res = await fetch(
        `/api/arcades/get?lat=${lat}&lng=${lng}&range=${range}`,
      );
      const result = await res.json();
      dispatch({ type: "nearby/update", payload: result });
    }
    fetchArcades();
  }, [lat, lng, range, state.urlPos, state.range]);

  useEffect(() => {
    if (detailId) {
      const detailArcade = state.nearbyArcades.find(
        (element) => Number(element.id) === Number(detailId),
      );
      dispatch({
        type: "center/update",
        payload: [Number(detailArcade.pos[1]), Number(detailArcade.pos[0])],
      });
    } else {
      if (state.hasParams)
        dispatch({ type: "center/update", payload: state.urlPos });
    }
  }, [detailId, state.hasParams, state.nearbyArcades, state.urlPos]);

  return (
    <Suspense>
      <APILoader version="2.0.5" akey={akey}>
        <div className="relative">
          <MaiMap state={state} dispatch={dispatch} />
          <GeolocationButton />
          <RangeSlider />
        </div>
      </APILoader>
    </Suspense>
  );
}

function MaiMap({ state }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  return (
    <Map style={{ height: "95vh", width: "100vw" }} center={state.centerPos}>
      <ScaleControl visible={true} offset={[20, 10]} position="LB" />
      <ToolBarControl visible={true} offset={[10, 50]} position="RT" />
      <Circle
        key={state.range}
        visible={true}
        radius={state.range * 1000}
        strokeColor="#fff"
        strokeWeight={2}
        center={state.urlPos}
        fillOpacity={0.1}
      />
      {state.hasParams && (
        <Marker
          visible={true}
          position={state.urlPos}
          title={"标定位置"}
          offset={new AMap.Pixel(-13, -30)}
        >
          <Image src="/nail-target.png" alt="target" width={30} height={50} />
        </Marker>
      )}
      {state.nearbyArcades.map((arcade, index) => (
        <Marker
          offset={new AMap.Pixel(-13, -30)}
          key={index}
          visible={true}
          position={[Number(arcade.pos[1]), Number(arcade.pos[0])]}
          title={"舞萌位置"}
          onClick={() => {
            const params = new URLSearchParams(searchParams);
            params.set("detailId", arcade.id);
            replace(`${pathname}?${params.toString()}`);
          }}
        >
          <div className={"flex w-12 text-xs"}>
            <Image src="/nail-arcade.png" alt="arcade" width={30} height={50} />
          </div>
        </Marker>
      ))}
    </Map>
  );
}
