import { ConvexReactClient } from "convex/react";
import { anyApi } from "convex/server";

const convexUrl = import.meta.env.VITE_CONVEX_URL || "https://small-guineapig-782.convex.cloud";

export const convexClient = new ConvexReactClient(convexUrl);
export const api = anyApi;
