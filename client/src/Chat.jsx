import { useContext, useEffect, useRef, useState } from "react";
import axios from "axios";
import { UserContext } from "./UserContext";
import Logo from "./Logo";
import { FaBars, FaTimes } from "react-icons/fa";
import { FaUserCircle } from "react-icons/fa";
import { Menu } from "@headlessui/react";

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
    // const ws = new WebSocket("ws://localhost:4040");
    const ws = new WebSocket("wss://ws-chatapp-backend.onrender.com/");
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

      // Add the message locally immediately after sending
      setMessages((prev) => [
        ...prev,
        {
          ...message,
          sender: id,
          _id: Date.now(), // Temporary ID for immediate UI update
          createdAt: new Date().toISOString(),
        },
      ]);
    }

    // Clear the input after sending
    setNewMessageText("");
  }

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
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-[#e5ddd5]">
              {messages.map((msg) => (
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
              <div ref={divUnderMessages}></div>
            </div>

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
    </div>
  );
}
