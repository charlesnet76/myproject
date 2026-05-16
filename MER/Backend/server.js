import express from "express";

const app = express();

app.use(express.json());

app.get("/api/ping", (req, res) => {
  res.json({ message: "pong" });
});

app.listen(5001, () => {
   console.log("Server started on PORT: 5001");
});