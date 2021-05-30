const express = require("express");
const app = express();
const authRoutes = require("./routes/authRoutes");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const corsOrigins = {
  origin: "http://localhost:3000",
  credentials: true,
  optionSuccessStatus: 200,
};

app.use(cors(corsOrigins));
app.use(express.json());
app.use(cookieParser());
app.use(authRoutes);

const http = require("http").createServer(app);
const mongoose = require("mongoose");
const socketio = require("socket.io");
const io = socketio(http);
const mongoDB =
  "mongodb+srv://usersocketio:xOkvN5UlSmozn54D@cluster0.cj3an.mongodb.net/chatsocketio?retryWrites=true&w=majority";
mongoose
  .connect(mongoDB, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("connected"))
  .catch((err) => console.log("ERROR: ", err));
const { addUser, getUser, removeUser } = require("./helper");
const Message = require("./models/Message");
const PORT = process.env.PORT || 5000;
const Room = require("./models/Room");

app.get("/set-cookies", (req, res) => {
  res.cookie("username", "tony");
  res.cookie("isAuthenticaed", true, { secure: true });
  res.send("cookie are set");
});

app.get("/get-cookies", (req, res) => {
  const cookies = req.cookies;
  console.log(cookies);
  res.json(cookies);
});

io.on("connection", (socket) => {
  Room.find().then((result) => {
    socket.emit("output-rooms", result);
  });
  socket.on("create-room", (name) => {
    //console.log("room name is", name);
    const room = new Room({ name });
    room.save().then((result) => {
      io.emit("room-created", result);
    });
  });
  socket.on("join", ({ name, room_id, user_id }) => {
    const { error, user } = addUser({
      socket_id: socket.id,
      name,
      room_id,
      user_id,
    });
    socket.join(room_id);
  });

  socket.on("sendMessage", (message, room_id, callback) => {
    const user = getUser(socket.id);
    const msgToStore = {
      name: user.name,
      user_id: user.user_id,
      room_id,
      text: message,
    };
    const msg = new Message(msgToStore);
    msg.save().then((result) => {
      io.to(room_id).emit("message", result);
      callback();
    });
  });

  socket.on("get-messages-history", (room_id) => {
    Message.find({ room_id }).then((result) => {
      socket.emit("output-messages", result);
    });
  });

  socket.on("disconnect", () => {
    const user = removeUser(socket.id);
  });
});

http.listen(PORT, () => {
  console.log(`listening on port ${PORT}`);
});
