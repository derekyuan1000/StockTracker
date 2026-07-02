import { defineEventHandler, toRequest } from "h3";
import { auth } from "./auth";

export default defineEventHandler(async (event) => {
  const request = toRequest(event);
  return auth.handler(request);
});
