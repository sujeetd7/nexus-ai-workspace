import { authorize } from "./authorize.middleware";

authorize(["ADMIN"]);
authorize(["USER", "ADMIN"]);
