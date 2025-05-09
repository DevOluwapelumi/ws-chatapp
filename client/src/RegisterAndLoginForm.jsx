// import {useContext, useState} from "react";
// import axios from "axios";
// import {UserContext} from "./UserContext.jsx";

// export default function RegisterAndLoginForm() {
//   const [username, setUsername] = useState('');
//   const [password, setPassword] = useState('');
//   const [isLoginOrRegister, setIsLoginOrRegister] = useState('login');
//   const {setUsername:setLoggedInUsername, setId} = useContext(UserContext);
//   async function handleSubmit(ev) {
//     ev.preventDefault();
//     const url = isLoginOrRegister === 'register' ? 'register' : 'login';
//     const {data} = await axios.post(url, {username,password});
//     setLoggedInUsername(username);
//     setId(data.id);
//   }
//   return (
//     <div className="bg-blue-50 h-screen flex items-center">
//       <form className="w-64 mx-auto mb-12" onSubmit={handleSubmit}>
//         <input value={username}
//                onChange={ev => setUsername(ev.target.value)}
//                type="text" placeholder="username"
//                className="block w-full rounded-sm p-2 mb-2 border" />
//         <input value={password}
//                onChange={ev => setPassword(ev.target.value)}
//                type="password"
//                placeholder="password"
//                className="block w-full rounded-sm p-2 mb-2 border" />
//         <button className="bg-blue-500 text-white block w-full rounded-sm p-2">
//           {isLoginOrRegister === 'register' ? 'Register' : 'Login'}
//         </button>
//         <div className="text-center mt-2">
//           {isLoginOrRegister === 'register' && (
//             <div>
//               Already a member?
//               <button className="ml-1" onClick={() => setIsLoginOrRegister('login')}>
//                 Login here
//               </button>
//             </div>
//           )}
//           {isLoginOrRegister === 'login' && (
//             <div>
//               Dont have an account?
//               <button className="ml-1" onClick={() => setIsLoginOrRegister('register')}>
//                 Register
//               </button>
//             </div>
//           )}
//         </div>
//       </form>
//     </div>
//   );
// }

import { useState, useContext } from "react";
import axios from "axios";
import { UserContext } from "./UserContext";

export default function RegisterAndLoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoginOrRegister, setIsLoginOrRegister] = useState("login");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { setUsername: setLoggedInUsername, setId } = useContext(UserContext);

  async function handleSubmit(ev) {
    ev.preventDefault();
    setError(null);
    setLoading(true);
    
    const url = isLoginOrRegister === "register" ? "/register" : "/login";
    
    try {
      // Make sure backend server is running at localhost:4040
      const { data } = await axios.post(url, { username, password });
      
      // Store user data in context upon successful login/registration
      setLoggedInUsername(username);
      setId(data.id);
    } catch (err) {
      console.error(`${isLoginOrRegister} error:`, err);
      
      if (err.code === "ERR_NETWORK") {
        setError("Cannot connect to server. Make sure your backend is running at http://localhost:4040");
      } else if (err.response) {
        // Server responded with a status code outside of 2xx range
        setError(err.response.data.error || "Authentication failed");
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-gradient-to-r from-blue-100 to-blue-300 min-h-screen flex items-center justify-center">
    <form
      onSubmit={handleSubmit}
      className="bg-white shadow-2xl rounded-xl p-8 w-full max-w-md transition-all duration-300"
    >
      <h2 className="text-2xl font-semibold text-center mb-6 text-blue-600">
        {isLoginOrRegister === "register" ? "Create an Account" : "Welcome Back"}
      </h2>
  
      <input
        value={username}
        onChange={(ev) => setUsername(ev.target.value)}
        type="text"
        placeholder="Username"
        className="shadow appearance-none py- px-3 text-gray-700 leading-tight focus:shadow-outline w-full p-3 border border-gray-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
        disabled={loading}
      />
      <input
        value={password}
        onChange={(ev) => setPassword(ev.target.value)}
        type="password"
        placeholder="Password"
        className="shadow appearance-none py- px-3 text-gray-700 leading-tight focus:shadow-outline w-full p-3 border border-gray-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
        disabled={loading}
      />
  
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-md font-semibold transition duration-300"
      >
        {loading ? "Please wait..." : isLoginOrRegister === "register" ? "Register" : "Login"}
      </button>
  
      {error && (
        <div className="text-red-500 mt-3 text-center text-sm">{error}</div>
      )}
  
      <div className="mt-6 text-center text-sm text-gray-600">
        {isLoginOrRegister === "register" ? (
          <>
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => setIsLoginOrRegister("login")}
              className="text-blue-600 font-medium hover:underline"
              disabled={loading}
            >
              Login
            </button>
          </>
        ) : (
          <>
            New here?{" "}
            <button
              type="button"
              onClick={() => setIsLoginOrRegister("register")}
              className="text-blue-600 font-medium hover:underline"
              disabled={loading}
            >
              Register
            </button>
          </>
        )}
      </div>
    </form>
  </div>
  
  );
}