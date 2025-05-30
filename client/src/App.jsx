import axios from "axios";
import { UserContextProvider } from "./UserContext";
import Routes from "./Routes";

function App() {
  // Set default configuration for all axios requests
  axios.defaults.baseURL = "http://localhost:4040";
  // axios.defaults.baseURL = "wss://ws-chatapp-backend.onrender.com/";
  axios.defaults.withCredentials = true;

  
  return (
    <UserContextProvider>
      <Routes />
    </UserContextProvider>
  );
}

export default App;
