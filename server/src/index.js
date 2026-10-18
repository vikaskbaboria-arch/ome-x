import "dotenv/config";
import { createServer } from "node:http";
import { app } from "./app.js";
import connectDB from "./db/index.js";
import { initializeSocketServer } from "./service/initializeSocketServer.js";

const httpServer = createServer(app);
initializeSocketServer(httpServer);

connectDB()
  .then(() => {
    const port = Number(process.env.PORT) || 3000;
    httpServer.listen(port, () => {
      console.log(`Server is running at port ${port}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed", error.message);
    process.exitCode = 1;
  });
