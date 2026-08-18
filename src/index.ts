import express from "express";
import { app } from "../server.js";
import { requestErrorHandler } from "./errors.js";
import { mountUi } from "./ui/routes.js";

mountUi(app);
app.use(express.static("public"));
app.use(requestErrorHandler);

const port = Number(process.env.PORT) || 3000;
app.listen(port, "0.0.0.0", () => console.log(`listening on ${port}`));
