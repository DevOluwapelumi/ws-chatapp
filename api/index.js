import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import User from "./models/User.js";
import Message from "./models/Message.js"; // Make sure you have this model
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { WebSocketServer } from "ws";

// Load environment variables
dotenv.config();

// Define a JWT secret key
const JWT_SECRET =
  process.env.JWT_SECRET || "fallback_secret_key_for_development";

const app = express();

// Middlewares
app.use(express.json());
app.use(cookieParser());

// Updated CORS configuration to allow requests from both origins
app.use(
  cors({
    credentials: true,
    origin: function (origin, callback) {
      // Allow requests from these origins
      const allowedOrigins = ["http://localhost:3000", "http://localhost:5173"];
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URL || "mongodb://localhost:27017/mern-chat")
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// User registration endpoint
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  console.log({ username, password });

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ error: "Username already taken" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = await User.create({
      username,
      password: hashedPassword,
    });

    // Generate JWT token
    const token = jwt.sign({ userId: newUser._id, username }, JWT_SECRET, {
      expiresIn: "1d",
    });

    // Set cookie and send response
    res
      .cookie("token", token, {
        httpOnly: true,
        sameSite: "lax", // Changed from 'none' to 'lax' for local development
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000, // 1 day
      })
      .status(201)
      .json({
        id: newUser._id,
        username,
      });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// User login endpoint
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user._id, username }, JWT_SECRET, {
      expiresIn: "1d",
    });

    // Set cookie and send response
    res
      .cookie("token", token, {
        httpOnly: true,
        sameSite: "lax", // Changed from 'none' to 'lax' for local development
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000, // 1 day
      })
      .json({
        id: user._id,
        username,
      });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Check if user is authenticated
app.get("/profile", (req, res) => {
  const { token } = req.cookies;
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json(decoded);
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
});

// Get all users except current user (for people list)
app.get("/people", async (req, res) => {
  const { token } = req.cookies;
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const currentUserId = decoded.userId;

    // Find all users except the current user
    const users = await User.find({ _id: { $ne: currentUserId } }).select(
      "username _id"
    );
    res.json(users);
  } catch (err) {
    console.error("Error fetching people:", err);
    res.status(401).json({ error: "Invalid token" });
  }
});

// Logout endpoint
app.post("/logout", (req, res) => {
  res
    .cookie("token", "", {
      httpOnly: true,
      sameSite: "lax", // Changed from 'none' to 'lax' for local development
      secure: process.env.NODE_ENV === "production",
      expires: new Date(0),
    })
    .json({ message: "Logged out successfully" });
});

// Get messages between users
app.get("/messages/:userId", async (req, res) => {
  const { token } = req.cookies;
  const { userId } = req.params;

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const myId = decoded.userId;

    const messages = await Message.find({
      $or: [
        { sender: myId, recipient: userId },
        { sender: userId, recipient: myId },
      ],
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// Start HTTP server
const server = app.listen(process.env.PORT || 4040, () => {
  console.log(`🚀 HTTP server running on port ${process.env.PORT || 4040}`);
});

// WebSocket server for real-time messaging
const wss = new WebSocketServer({ server });

// Store active connections
const activeConnections = new Map();

// Helper function to get user info from JWT token
function getUserDataFromCookie(cookie) {
  if (!cookie) return null;

  // Extract token from cookie string
  const tokenCookieStr = cookie
    .split(";")
    .find((str) => str.trim().startsWith("token="));

  if (!tokenCookieStr) return null;

  const token = tokenCookieStr.split("=")[1];
  if (!token) return null;

  try {
    // Verify and decode the token
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// Handle WebSocket connections
wss.on("connection", (connection, req) => {
  console.log("WebSocket connected");

  // Extract user data from cookies
  const cookies = req.headers.cookie;
  const userData = getUserDataFromCookie(cookies);

  if (!userData) {
    console.log("Unauthorized WebSocket connection attempt");
    connection.close();
    return;
  }

  const { userId, username } = userData;

  // Store connection with user info
  connection.userId = userId;
  connection.username = username;
  activeConnections.set(userId, connection);

  // Handle messages
  connection.on("message", async (message) => {
    try {
      const messageData = JSON.parse(message.toString());
      const { recipient, text } = messageData;

      if (!recipient || !text) return;

      // Save message to database
      const newMessage = await Message.create({
        sender: userId,
        recipient,
        text,
      });

      // Send message to recipient if online
      const recipientConnection = activeConnections.get(recipient);
      if (recipientConnection) {
        recipientConnection.send(
          JSON.stringify({
            _id: newMessage._id,
            sender: userId,
            recipient,
            text,
            createdAt: newMessage.createdAt,
          })
        );
      }

      // Send confirmation back to sender
      connection.send(
        JSON.stringify({
          _id: newMessage._id,
          sender: userId,
          recipient,
          text,
          createdAt: newMessage.createdAt,
        })
      );
    } catch (err) {
      console.error("Error handling WebSocket message:", err);
    }
  });

  // Handle disconnection
  connection.on("close", () => {
    console.log(`WebSocket disconnected for user ${username}`);
    activeConnections.delete(userId);
  });
});

// Simple model for Message (if you don't have it yet)
// Create this file as models/Message.js
/*
import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Message', MessageSchema);
*/
