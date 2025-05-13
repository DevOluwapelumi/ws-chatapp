import express from "express";
import Message from "../models/Message.js";

const router = express.Router();

// Edit message
router.put("/:id", async (req, res) => {
  const { text } = req.body;
  try {
    const updated = await Message.findByIdAndUpdate(
      req.params.id,
      { text },
      { new: true }
    );
    if (!updated) return res.status(404).send("Message not found");
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete message
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Message.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).send("Message not found");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
