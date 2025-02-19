import { BrowserRouter as Router, Route, Routes } from "react-router-dom"
import Login from "./pages/Login/Login.jsx"
import Register from "./pages/Register/Register.jsx"
import { useEffect } from "react"

function App() {

  useEffect(() => {
    document.title = (import.meta.env.VITE_APP_NAME + " - " + import.meta.env.VITE_APP_SUBNAME) || "Gelişmiş Web Güvenlik Duvarı"
  })

  return (
    <Router>
      <Routes>
        <Route path="login" element={<Login />} />
        <Route path="waf" element={<Login />} />

        <Route path="register" element={<Register />} />
      </Routes>
    </Router>
  )
}

export default App
