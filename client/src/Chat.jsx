import { useContext, useEffect, useRef, useState } from "react";
import axios from "axios";
import { UserContext } from "./UserContext";
import Logo from "./Logo";
import { FaBars, FaTimes } from "react-icons/fa";
import { FaUserCircle } from "react-icons/fa";
import { Menu } from "@headlessui/react";
import { FiMoreVertical, FiEdit2, FiTrash2 } from "react-icons/fi";

export default function Chat() {
  const [ws, setWs] = useState(null);
  const [onlinePeople, setOnlinePeople] = useState({});
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [newMessageText, setNewMessageText] = useState("");
  const [messages, setMessages] = useState([]);
  const [offlinePeople, setOfflinePeople] = useState({});
  const [showSidebar, setShowSidebar] = useState(false);
  const { username, id, setId, setUsername } = useContext(UserContext);
  const divUnderMessages = useRef();

  const [dropdownOpenIndex, setDropdownOpenIndex] = useState(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState("");

  useEffect(() => {
    connectToWs();
  }, []);

  useEffect(() => {
    axios.get("/people").then((res) => {
      const offlinePeopleArr = res.data
        .filter((p) => p._id !== id)
        .filter((p) => !Object.keys(onlinePeople).includes(p._id));

      const offline = {};
      offlinePeopleArr.forEach((p) => {
        offline[p._id] = p;
      });
      setOfflinePeople(offline);
    });
  }, [onlinePeople, id]);

  useEffect(() => {
    if (selectedUserId) {
      axios.get("/messages/" + selectedUserId).then((res) => {
        setMessages(res.data);
      });
    }
  }, [selectedUserId]);

  useEffect(() => {
    const div = divUnderMessages.current;
    if (div) div.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  function connectToWs() {
    const ws = new WebSocket("ws://localhost:4040");
    // const ws = new WebSocket("wss://ws-chatapp-backend.onrender.com");
    setWs(ws);
    ws.addEventListener("message", handleMessage);
    ws.addEventListener("close", () => {
      console.log("Disconnected. Reconnecting...");
      setTimeout(connectToWs, 1000);
    });
  }

  function handleMessage(ev) {
    const messageData = JSON.parse(ev.data);
    if ("online" in messageData) {
      showOnlinePeople(messageData.online);
    } else if ("text" in messageData) {
      if (
        messageData.sender === selectedUserId ||
        messageData.recipient === selectedUserId
      ) {
        setMessages((prev) => [...prev, messageData]);
      }
    }
  }

  function showOnlinePeople(peopleArray) {
    const people = {};
    peopleArray.forEach(({ userId, username }) => {
      people[userId] = username;
    });
    setOnlinePeople(people);
  }

  // Send a message
  function sendMessage(ev) {
    ev.preventDefault();
    if (!newMessageText.trim() || !selectedUserId) return;

    const message = {
      recipient: selectedUserId,
      text: newMessageText,
    };

    // Send the message through WebSocket
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }

    // Clear the input after sending
    setNewMessageText("");
  }

  // Handle message edit
  const handleEdit = (msg) => {
    setEditingMessage(msg);
    setEditText(msg.text);
    setShowEditModal(true);
    setDropdownOpenIndex(null); // ✅ hide dropdown
  };

  const saveEditedMessage = async () => {
    if (!editText.trim()) return;

    try {
      await axios.put(`/messages/${editingMessage._id}`, { text: editText });
      setMessages((prev) =>
        prev.map((m) =>
          m._id === editingMessage._id ? { ...m, text: editText } : m
        )
      );
      setShowEditModal(false);
      setEditingMessage(null);
      setEditText("");
    } catch (err) {
      console.error("Failed to edit message", err);
    }
  };

  const handleDelete = async (messageId) => {
    const confirm = window.confirm(
      "Are you sure you want to delete this message?"
    );
    if (!confirm) return;

    try {
      await axios.delete(`/messages/${messageId}`, { withCredentials: true });
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
      setDropdownOpenIndex(null); // ✅ hide dropdown
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  function logout() {
    axios.post("/logout").then(() => {
      setWs(null);
      setId(null);
      setUsername(null);
    });
  }

  const allPeople = [
    ...Object.entries(onlinePeople).map(([id, name]) => ({
      id,
      username: name,
      online: true,
    })),
    ...Object.entries(offlinePeople).map(([id, person]) => ({
      id,
      username: person.username,
      online: false,
    })),
  ];

  function getAvatarLetter(name) {
    return name?.charAt(0).toUpperCase();
  }

  return (
    <div className="flex h-screen bg-[#e5ddd5] relative">
      {/* Mobile toggle */}
      <button
        onClick={() => setShowSidebar(!showSidebar)}
        className="md:hidden absolute top-4 left-4 z-30 bg-white p-2 rounded-full shadow"
      >
        {showSidebar ? <FaTimes /> : <FaBars />}
      </button>

      {/* Sidebar */}
      <div
        className={`fixed md:static top-0 left-0 h-full w-96 bg-white border-r z-20 transition-transform duration-300
        ${
          showSidebar ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b shadow-sm">
          <Logo />

          <Menu as="div" className="relative">
            <Menu.Button className="flex items-center gap-1 text-gray-700 hover:text-green-600 focus:outline-none">
              <FaUserCircle className="w-6 h-6" />
            </Menu.Button>

            <Menu.Items className="absolute right-0 mt-2 w-40 bg-white shadow-lg rounded-md py-1 border z-10">
              <div className="px-4 py-2 text-sm text-gray-700 border-b">
                Signed in as
                <br />
                <span className="font-semibold">{username}</span>
              </div>
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={logout}
                    className={`w-full text-left px-4 py-2 text-sm ${
                      active ? "bg-red-300 text-red-600" : "text-gray-700"
                    }`}
                  >
                    Logout
                  </button>
                )}
              </Menu.Item>
            </Menu.Items>
          </Menu>
        </div>

        <div className="overflow-y-auto flex-1">
          {allPeople.map((person) => (
            <div
              key={person.id}
              onClick={() => {
                setSelectedUserId(person.id);
                setShowSidebar(false);
              }}
              className={`flex items-center px-4 py-3 border-b cursor-pointer hover:bg-gray-100 ${
                selectedUserId === person.id ? "bg-green-50" : ""
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-green-300 text-white flex items-center justify-center font-bold mr-3">
                {getAvatarLetter(person.username)}
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm text-gray-800">
                  {person.username}
                </div>
                <div className="text-xs text-gray-500">
                  {person.online ? "Online" : "Offline"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat section */}
      <div className="flex flex-col flex-grow w-full md:w-[calc(100%-16rem)]">
        {!selectedUserId ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            ← Select a contact to start chatting
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="flex items-center px-4 py-3 bg-green-600 text-white shadow">
              <div className="w-8 h-8 rounded-full bg-white text-green-600 font-bold flex items-center justify-center mr-2">
                {getAvatarLetter(
                  onlinePeople[selectedUserId] ||
                    offlinePeople[selectedUserId]?.username
                )}
              </div>
              <div className="font-semibold text-sm">
                {onlinePeople[selectedUserId] ||
                  offlinePeople[selectedUserId]?.username}
              </div>
            </div>

            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-[#e5ddd5] flex flex-col">
              {messages.map((msg, index) => {
                const isOwnMessage = msg.sender === id;
                return (
                  <div
                    key={msg._id}
                    className={`group relative px-4 py-2 rounded-2xl shadow-sm max-w-fit
    ${
      isOwnMessage
        ? "bg-[#dcf8c6] self-end rounded-br-sm"
        : "bg-white self-start rounded-bl-sm"
    }`}
                  >
                    <div className="flex items-end gap-2">
                      <p className="text-sm text-gray-800">{msg.text}</p>

                      <div className="flex items-center gap-1 text-[10px] text-gray-500">
                        {new Date(
                          msg.createdAt || Date.now()
                        ).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {isOwnMessage && (
                          <svg
                            className="w-5 h-3 text-green-600"
                            fill="currentColor"
                            viewBox="0 0 16 16"
                          >
                            <path d="M15.854 4.146a.5.5 0 0 0-.708 0L7 12.293 4.354 9.646a.5.5 0 1 0-.708.708l3 3a.5.5 0 0 0 .708 0l9-9a.5.5 0 0 0 0-.708z" />
                          </svg>
                        )}
                      </div>
                    </div>

                    {/* Dropdown for own messages */}
                    {isOwnMessage && (
                      <div className="absolute top-2 right-1">
                        <div className="relative">
                          <button
                            onClick={() =>
                              setDropdownOpenIndex(
                                dropdownOpenIndex === index ? null : index
                              )
                            }
                            className="text-gray-500 hover:text-gray-800 focus:outline-none"
                          >
                            <FiMoreVertical size={18} />
                          </button>

                          {dropdownOpenIndex === index && (
                            <div className="absolute right-0 mt-1 w-28 bg-white rounded-md shadow-lg border z-10">
                              <button
                                onClick={() => handleEdit(msg)}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-gray-100 w-full"
                              >
                                <FiEdit2 /> Edit
                              </button>
                              <button
                                onClick={() => handleDelete(msg._id)}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-gray-100 w-full"
                              >
                                <FiTrash2 /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={divUnderMessages}></div>
            </div>

            {/* {messages.map((msg) => (
                <div
                  key={msg._id}
                  className={`flex ${
                    msg.sender === id ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`rounded-xl px-4 py-2 text-sm max-w-[70%] ${
                      msg.sender === id
                        ? "bg-[#dcf8c6] text-gray-800"
                        : "bg-white text-gray-800"
                    }`}
                  >
                    {msg.text}
                    <div className="text-[10px] text-right mt-1 text-gray-500">
                      {new Date(msg.createdAt || Date.now()).toLocaleTimeString(
                        [],
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={divUnderMessages}></div> */}

            {/* Input field */}
            <form
              onSubmit={sendMessage}
              className="p-3 bg-white border-t flex items-center gap-2"
            >
              <input
                type="text"
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                placeholder="Type a message"
                className="flex-grow px-4 py-2 text-sm rounded-full border bg-gray-100 focus:outline-none"
              />
              <button
                type="submit"
                className="bg-green-500 text-white p-2 rounded-full hover:bg-green-600"
              >
                ➤
              </button>
            </form>
          </>
        )}
      </div>

      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg w-[90%] max-w-md">
            <h3 className="text-lg font-bold mb-4">Edit Message</h3>
            <textarea
              className="w-full border px-3 py-2 rounded-md"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
            ></textarea>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={saveEditedMessage}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
