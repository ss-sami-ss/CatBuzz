import type { StyleSpecification } from "maplibre-gl";

export const sampleCenter: [number, number] = [51.399, 35.728];
export const sampleBounds: [[number, number], [number, number]] = [[51.38, 35.711], [51.418, 35.745]];

/** Local layout for fixture markers. A configured provider supplies the geographic basemap. */
const sampleStyle: StyleSpecification = {
  version: 8,
  sources: {
    layout: {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "MultiLineString",
          coordinates: [
            ...Array.from({ length: 14 }, (_, index) => {
              const lng = 51.365 + index * 0.005;
              return [[lng, 35.69], [lng + 0.011, 35.765]];
            }),
            ...Array.from({ length: 14 }, (_, index) => {
              const lat = 35.689 + index * 0.005;
              return [[51.35, lat], [51.45, lat + 0.014]];
            }),
          ],
        },
      },
    },
  },
  layers: [
    { id: "background", type: "background", paint: { "background-color": "#e7ece1" } },
    { id: "layout", type: "line", source: "layout", paint: { "line-color": "#fbf9f2", "line-width": 3 } },
  ],
};

export const providerStyle = process.env.NEXT_PUBLIC_MAP_STYLE_URL?.trim();
export const homeMapStyle = providerStyle || sampleStyle;
